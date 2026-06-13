"use client";

import { InlineSpinner } from "@/components/inline-spinner";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PendingRewardModal } from "@/components/pending-reward-modal";
import type { ClientRedemptionStatus } from "@/lib/types";

type Client = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  cedula: string | null;
};

type Vehicle = {
  id: string;
  client_id: string;
  make: string;
  model: string;
  plate: string;
  year: number | null;
  color: string | null;
};

type PlateLookupState = "idle" | "loading" | "found" | "not_found";
type ClientSearchState = "idle" | "loading" | "multiple" | "not_found";

function formatClientDocument(client: Client): string | null {
  const doc = client.cedula?.trim();
  return doc ? doc : null;
}

function OrderStepTitle({ backHref, children }: { backHref: string; children: ReactNode }) {
  return (
    <h3 style={{ marginTop: 0, display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "8px 12px" }}>
      <Link href={backHref} className="title-inline-back">
        ← Volver
      </Link>
      <span>{children}</span>
    </h3>
  );
}

export function OrderIdentificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetClientId = searchParams.get("clientId");

  const [plate, setPlate] = useState("");
  const [plateLookupState, setPlateLookupState] = useState<PlateLookupState>("idle");
  const [clientQuery, setClientQuery] = useState("");
  const [clientSearchState, setClientSearchState] = useState<ClientSearchState>("idle");
  const [clientMatches, setClientMatches] = useState<Client[]>([]);
  const [pickedClientMatchId, setPickedClientMatchId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);

  /** Vehículos del cliente en flujo «orden directa» (`?clientId=`). */
  const [presetVehicles, setPresetVehicles] = useState<Vehicle[]>([]);
  const [pickedVehicleId, setPickedVehicleId] = useState<string | null>(null);
  const [presetLoading, setPresetLoading] = useState(Boolean(presetClientId));
  const [pendingServiceUrl, setPendingServiceUrl] = useState<string | null>(null);
  const autoNavigatedRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [rewardModalPayload, setRewardModalPayload] = useState<ClientRedemptionStatus["pendingModal"]>(null);

  const goToServices = useCallback(
    (clientId: string, vehicleId: string) => {
      router.replace(`/dashboard/orders/new/services?clientId=${clientId}&vehicleId=${vehicleId}`);
    },
    [router]
  );

  const handleRewardFlowClose = useCallback(() => {
    setRewardModalOpen(false);
    if (pendingServiceUrl) {
      if (!autoNavigatedRef.current) {
        autoNavigatedRef.current = true;
        router.replace(pendingServiceUrl);
      }
      setPendingServiceUrl(null);
    }
  }, [pendingServiceUrl, router]);

  /** Orden directa: carga cliente, vehículos y lealtad; 1 vehículo → servicios; 2+ → elegir; 0 → aviso. */
  useEffect(() => {
    if (!presetClientId) return;

    let cancelled = false;
    setPresetLoading(true);
    setError(null);
    setPresetVehicles([]);
    setPickedVehicleId(null);
    setVehicle(null);
    autoNavigatedRef.current = false;
    setPendingServiceUrl(null);

    (async () => {
      try {
        const [clientRes, vehiclesRes, loyaltyRes] = await Promise.all([
          fetch(`/api/clients/${presetClientId}`),
          fetch(`/api/vehicles?clientId=${encodeURIComponent(presetClientId)}`),
          fetch(`/api/clients/${presetClientId}/loyalty/redemption-status`)
        ]);

        if (!clientRes.ok) throw new Error("Cliente no encontrado.");
        const clientData = (await clientRes.json()) as Client;
        if (cancelled) return;
        setSelectedClient(clientData);

        const vehiclesRaw: unknown = vehiclesRes.ok ? await vehiclesRes.json() : [];
        const vehicles = Array.isArray(vehiclesRaw) ? (vehiclesRaw as Vehicle[]) : [];
        if (cancelled) return;
        setPresetVehicles(vehicles);

        let pending: ClientRedemptionStatus["pendingModal"] = null;
        if (loyaltyRes.ok) {
          const summary = (await loyaltyRes.json()) as ClientRedemptionStatus;
          pending = summary.pendingModal ?? null;
        }
        if (cancelled) return;
        setRewardModalPayload(pending);

        if (vehicles.length === 0) {
          setRewardModalOpen(false);
          return;
        }

        if (vehicles.length === 1) {
          const v = vehicles[0];
          setVehicle(v);
          const url = `/dashboard/orders/new/services?clientId=${presetClientId}&vehicleId=${v.id}`;
          if (pending) {
            setPendingServiceUrl(url);
            setRewardModalOpen(true);
          } else {
            if (!autoNavigatedRef.current) {
              autoNavigatedRef.current = true;
              router.replace(url);
            }
          }
          return;
        }

        // 2 o más vehículos: el usuario elige; la lealtad se muestra al pulsar «Continuar».
        setRewardModalOpen(false);
      } catch {
        if (!cancelled) setError("No se pudo cargar el cliente o sus vehículos.");
      } finally {
        if (!cancelled) setPresetLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [presetClientId, router]);

  function resetClientSearchState() {
    setClientSearchState("idle");
    setClientMatches([]);
    setPickedClientMatchId(null);
  }

  function resetPlateDerivedState() {
    setPlateLookupState("idle");
    setVehicle(null);
    if (!presetClientId) {
      setSelectedClient(null);
    }
    setError(null);
    setRewardModalOpen(false);
    setRewardModalPayload(null);
    setPendingServiceUrl(null);
  }

  function handlePlateChange(value: string) {
    setPlate(value.toUpperCase());
    resetClientSearchState();
    setClientQuery("");
    if (plateLookupState !== "idle") {
      resetPlateDerivedState();
    }
  }

  function handleClientQueryChange(value: string) {
    setClientQuery(value);
    resetClientSearchState();
    if (plateLookupState !== "idle") {
      setPlate("");
      resetPlateDerivedState();
    }
  }

  async function lookupClient() {
    const trimmed = clientQuery.trim();
    if (!trimmed) return;

    setError(null);
    setClientSearchState("loading");
    setClientMatches([]);
    setPickedClientMatchId(null);

    try {
      const response = await fetch(`/api/clients?forOrder=1&search=${encodeURIComponent(trimmed)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "No se pudo buscar el cliente.");
      }

      const matches = Array.isArray(data) ? (data as Client[]) : [];
      if (matches.length === 0) {
        setClientSearchState("not_found");
        return;
      }

      if (matches.length === 1) {
        router.replace(`/dashboard/orders/new/identify?clientId=${matches[0].id}`);
        return;
      }

      setClientMatches(matches);
      setClientSearchState("multiple");
    } catch (caught) {
      setClientSearchState("idle");
      setError(caught instanceof Error ? caught.message : "No se pudo buscar el cliente.");
    }
  }

  function onClientMatchContinue() {
    if (!pickedClientMatchId) {
      setError("Selecciona un cliente para continuar.");
      return;
    }
    setError(null);
    router.replace(`/dashboard/orders/new/identify?clientId=${pickedClientMatchId}`);
  }

  async function lookupPlate() {
    const trimmed = plate.trim().toUpperCase();
    if (!trimmed) return;

    if (trimmed !== plate) {
      setPlate(trimmed);
    }

    setError(null);
    setPlateLookupState("loading");

    try {
      const response = await fetch(`/api/vehicles?plate=${encodeURIComponent(trimmed)}`);
      const data = await response.json();

      if (!response.ok || !data?.id) {
        setVehicle(null);
        if (!presetClientId) setSelectedClient(null);
        setPlateLookupState("not_found");
        return;
      }

      if (presetClientId && data.client_id !== presetClientId) {
        setVehicle(null);
        setPlateLookupState("idle");
        setError(
          "Esta matrícula está asignada a otro cliente. Usa el perfil correcto o registra un vehículo nuevo desde ese cliente."
        );
        return;
      }

      setVehicle(data);

      if (data.client_id) {
        const clientResponse = await fetch(`/api/clients/${data.client_id}`);
        if (clientResponse.ok) {
          const clientData = await clientResponse.json();
          setSelectedClient(clientData);
          setPlateLookupState("found");

          try {
            const rs = await fetch(`/api/clients/${data.client_id}/loyalty/redemption-status`);
            if (rs.ok) {
              const summary = (await rs.json()) as ClientRedemptionStatus;
              if (summary.pendingModal) {
                setRewardModalPayload(summary.pendingModal);
                setRewardModalOpen(true);
              } else {
                setRewardModalPayload(null);
                setRewardModalOpen(false);
              }
            } else {
              setRewardModalPayload(null);
              setRewardModalOpen(false);
            }
          } catch {
            setRewardModalPayload(null);
            setRewardModalOpen(false);
          }
        } else {
          setVehicle(null);
          if (!presetClientId) setSelectedClient(null);
          setPlateLookupState("not_found");
          setError("Hay un vehículo con esa matrícula pero no se pudo cargar el cliente. Registra los datos o revisa en taller.");
        }
      } else {
        setVehicle(null);
        if (!presetClientId) setSelectedClient(null);
        setPlateLookupState("not_found");
      }
    } catch {
      setVehicle(null);
      if (!presetClientId) setSelectedClient(null);
      setPlateLookupState("not_found");
      setError("No se pudo consultar la matrícula. Intenta de nuevo.");
    }
  }

  const showClientSection =
    Boolean(selectedClient) && (Boolean(presetClientId) || plateLookupState === "found");

  const showUnregisteredPanel =
    !presetClientId && plateLookupState === "not_found" && plate.trim().length > 0;

  const showClientSearchFlow = !presetClientId;
  const showClientMultiplePicker = showClientSearchFlow && clientSearchState === "multiple";
  const showClientNotFoundPanel =
    showClientSearchFlow && clientSearchState === "not_found" && clientQuery.trim().length > 0;

  /** Con cliente preseleccionado no pedimos matrícula: se elige vehículo o se redirige. */
  const showMatriculaFlow = !presetClientId;
  const showContinueButton =
    !presetClientId && plateLookupState === "found" && Boolean(vehicle?.id && selectedClient?.id);

  const presetVehiclesLoaded = !presetLoading && Boolean(presetClientId) && Boolean(selectedClient);
  const showDirectMultiPicker =
    Boolean(presetClientId) && presetVehiclesLoaded && presetVehicles.length >= 2;
  const showDirectNoVehicles =
    Boolean(presetClientId) && presetVehiclesLoaded && presetVehicles.length === 0;
  const showDirectSingleRedirecting =
    Boolean(presetClientId) && presetVehiclesLoaded && presetVehicles.length === 1;

  async function onContinue(event: FormEvent) {
    event.preventDefault();
    if (!showContinueButton || !vehicle?.id || !selectedClient?.id) return;

    setLoading(true);
    setError(null);

    try {
      router.push(`/dashboard/orders/new/services?clientId=${selectedClient.id}&vehicleId=${vehicle.id}`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "No se pudo continuar.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function onDirectMultiContinue() {
    if (!presetClientId || !pickedVehicleId) {
      setError("Selecciona un vehículo para continuar.");
      return;
    }
    setError(null);
    const v = presetVehicles.find((x) => x.id === pickedVehicleId);
    if (!v) return;
    setVehicle(v);
    const url = `/dashboard/orders/new/services?clientId=${presetClientId}&vehicleId=${pickedVehicleId}`;
    if (rewardModalPayload) {
      setPendingServiceUrl(url);
      setRewardModalOpen(true);
    } else {
      goToServices(presetClientId, pickedVehicleId);
    }
  }

  const registerHref =
    plate.trim().length > 0
      ? `/dashboard/clients/new?forOrder=1&plate=${encodeURIComponent(plate.trim().toUpperCase())}`
      : `/dashboard/clients/new?forOrder=1`;

  if (presetLoading) {
    return (
      <div className="card app-route-loading" style={{ minHeight: 140 }}>
        {presetClientId ? <OrderStepTitle backHref={`/dashboard/clients/${presetClientId}`}>Orden directa</OrderStepTitle> : null}
        <span className="app-route-loading__spinner" aria-hidden />
        <p style={{ margin: presetClientId ? "12px 0 0" : 0, color: "#b9accf" }}>
          {presetClientId ? "Preparando orden directa…" : "Cargando…"}
        </p>
      </div>
    );
  }

  return (
    <form className="row" onSubmit={onContinue}>
      {showDirectNoVehicles ? (
        <div className="card">
          <OrderStepTitle backHref={`/dashboard/clients/${presetClientId}`}>Orden directa</OrderStepTitle>
          <p style={{ color: "#b9accf", marginTop: 0 }}>
            <strong>{selectedClient?.full_name}</strong> no tiene ningún vehículo registrado. Añade uno antes de crear
            la orden.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
            <Link className="button" href={`/dashboard/clients/${presetClientId}/vehicles/new`}>
              Agregar vehículo
            </Link>
            <Link className="button secondary" href={`/dashboard/clients/${presetClientId}`}>
              Ver perfil
            </Link>
            <Link className="button secondary" href="/dashboard/orders/new/identify">
              Nueva orden sin cliente fijo
            </Link>
          </div>
        </div>
      ) : null}

      {showDirectMultiPicker ? (
        <div className="card">
          <OrderStepTitle backHref={`/dashboard/clients/${presetClientId}`}>Orden directa — elige el vehículo</OrderStepTitle>
          <p style={{ color: "#b9accf", marginTop: 0, marginBottom: 16, fontSize: "0.95rem" }}>
            Cliente: <strong style={{ color: "#f0ecfa" }}>{selectedClient?.full_name}</strong>. Tiene varios vehículos;
            selecciona con cuál quieres abrir la orden y continúa a los servicios.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {presetVehicles.map((v) => {
              const title = [v.year, v.make, v.model].filter(Boolean).join(" ") || `${v.make} ${v.model}`;
              const selected = pickedVehicleId === v.id;
              return (
                <label
                  key={v.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: selected ? "1px solid rgba(157, 92, 255, 0.65)" : "1px solid #2a203d",
                    background: selected ? "rgba(123, 0, 255, 0.12)" : "#181226",
                    cursor: "pointer"
                  }}
                >
                  <input
                    type="radio"
                    name="direct-vehicle"
                    checked={selected}
                    onChange={() => setPickedVehicleId(v.id)}
                    style={{ marginTop: 4 }}
                  />
                  <span>
                    <span style={{ display: "block", fontWeight: 700, color: "#f6f3ff" }}>{title}</span>
                    <span style={{ display: "block", color: "#b9accf", fontSize: "0.88rem", marginTop: 4 }}>
                      Matrícula {v.plate}
                      {v.color ? ` · ${v.color}` : ""}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button type="button" className="button" onClick={onDirectMultiContinue}>
              Continuar con los servicios
            </button>
            <Link className="button secondary" href={`/dashboard/clients/${presetClientId}`}>
              Ver perfil del cliente
            </Link>
          </div>
        </div>
      ) : null}

      {showDirectSingleRedirecting && rewardModalOpen ? (
        <div className="card">
          <OrderStepTitle backHref={`/dashboard/clients/${presetClientId}`}>Orden directa</OrderStepTitle>
          <p style={{ color: "#b9accf", margin: 0 }}>
            Revisa el aviso de recompensa (si aparece) para continuar a la selección de servicios con el vehículo de{" "}
            <strong>{selectedClient?.full_name}</strong>.
          </p>
        </div>
      ) : showDirectSingleRedirecting && !rewardModalOpen ? (
        <div className="card app-route-loading" style={{ minHeight: 100 }}>
          <OrderStepTitle backHref={`/dashboard/clients/${presetClientId}`}>Orden directa</OrderStepTitle>
          <span className="app-route-loading__spinner" aria-hidden />
          <p style={{ margin: "12px 0 0", color: "#b9accf" }}>Abriendo selección de servicios…</p>
        </div>
      ) : null}

      {showMatriculaFlow ? (
        <>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Buscar cliente</h3>
            <p style={{ color: "#b9accf", marginTop: 0, fontSize: "0.9rem" }}>
              Cédula (10 dígitos), RUC (13 dígitos) o nombre/apellido del cliente.
            </p>
            <label>
              Documento o nombre
              <input
                className="input"
                value={clientQuery}
                onChange={(e) => handleClientQueryChange(e.target.value)}
                placeholder="Ej. 1712345678, 1791234567001 o Juan Pérez"
                autoComplete="off"
              />
            </label>
            <button
              type="button"
              className="button secondary"
              onClick={() => void lookupClient()}
              disabled={clientSearchState === "loading" || clientQuery.trim().length === 0}
              style={{ marginTop: 12 }}
            >
              <span className="btn-loading-inner">
                {clientSearchState === "loading" ? <InlineSpinner size="sm" /> : null}
                {clientSearchState === "loading" ? "Buscando…" : "Buscar cliente"}
              </span>
            </button>
          </div>

          {showClientMultiplePicker ? (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Varios clientes encontrados</h3>
              <p style={{ color: "#b9accf", marginTop: 0, marginBottom: 16, fontSize: "0.95rem" }}>
                Selecciona el cliente correcto para continuar con la orden.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {clientMatches.map((client) => {
                  const selected = pickedClientMatchId === client.id;
                  const doc = formatClientDocument(client);
                  return (
                    <label
                      key={client.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: "14px 16px",
                        borderRadius: 12,
                        border: selected ? "1px solid rgba(157, 92, 255, 0.65)" : "1px solid #2a203d",
                        background: selected ? "rgba(123, 0, 255, 0.12)" : "#181226",
                        cursor: "pointer"
                      }}
                    >
                      <input
                        type="radio"
                        name="client-match"
                        checked={selected}
                        onChange={() => setPickedClientMatchId(client.id)}
                        style={{ marginTop: 4 }}
                      />
                      <span>
                        <span style={{ display: "block", fontWeight: 700, color: "#f6f3ff" }}>{client.full_name}</span>
                        <span style={{ display: "block", color: "#b9accf", fontSize: "0.88rem", marginTop: 4 }}>
                          {doc ? `Cédula/RUC ${doc}` : "Sin documento registrado"}
                          {client.phone ? ` · ${client.phone}` : ""}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <button type="button" className="button" style={{ marginTop: 18 }} onClick={onClientMatchContinue}>
                Continuar con este cliente
              </button>
            </div>
          ) : null}

          {showClientNotFoundPanel ? (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Cliente no encontrado</h3>
              <p style={{ color: "#b9accf", marginTop: 0 }}>
                No hay ningún cliente que coincida con <strong>{clientQuery.trim()}</strong>. Regístralo para poder
                crear la orden.
              </p>
              <Link className="button" href="/dashboard/clients/new?forOrder=1">
                Registrar nuevo cliente
              </Link>
            </div>
          ) : null}

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Identificación por matrícula</h3>
            <p style={{ color: "#b9accf", marginTop: 0, fontSize: "0.9rem" }}>
              También puedes localizar al cliente buscando la placa del vehículo.
            </p>
            <label>
              Matrícula *
              <input
                className="input registration-input-plate"
                value={plate}
                onChange={(e) => handlePlateChange(e.target.value)}
                placeholder="INTRODUCE LA MATRÍCULA"
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>
            <button
              type="button"
              className="button secondary"
              onClick={() => void lookupPlate()}
              disabled={plateLookupState === "loading" || plate.trim().length === 0}
              style={{ marginTop: 12 }}
            >
              <span className="btn-loading-inner">
                {plateLookupState === "loading" ? <InlineSpinner size="sm" /> : null}
                {plateLookupState === "loading" ? "Buscando…" : "Buscar matrícula"}
              </span>
            </button>

            {vehicle ? (
              <div style={{ marginTop: 14 }}>
                <p style={{ color: "#8fd2ff", marginBottom: 6 }}>
                  Vehículo encontrado: {vehicle.make} {vehicle.model}
                  {vehicle.year ? ` (${vehicle.year})` : ""}
                </p>
                <p style={{ color: "#b9accf", margin: 0, fontSize: "0.9rem" }}>
                  Matrícula en sistema: {vehicle.plate}
                </p>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {showUnregisteredPanel ? (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Vehículo no registrado</h3>
          <p style={{ color: "#b9accf", marginTop: 0 }}>
            No hay ningún vehículo con la matrícula <strong>{plate.trim().toUpperCase()}</strong> vinculado a un
            cliente. Registra al cliente y el vehículo para poder crear la orden.
          </p>
          <br />
          <Link className="button" href={registerHref}>
            Registrar nuevo cliente
          </Link>
          <p style={{ color: "#8a7aa3", fontSize: "0.85rem", marginBottom: 0 }}>
            Al finalizar el registro podrás continuar directamente con los servicios de la orden.
          </p>
        </div>
      ) : null}

      {showClientSection && !showDirectMultiPicker && !(presetClientId && presetVehicles.length === 1) ? (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Datos del cliente</h3>
          <p style={{ marginTop: 0, marginBottom: 8 }}>
            <strong>{selectedClient!.full_name}</strong>
          </p>
          <p style={{ color: "#b9accf", margin: "4px 0" }}>Teléfono: {selectedClient!.phone}</p>
          {formatClientDocument(selectedClient!) ? (
            <p style={{ color: "#b9accf", margin: "4px 0" }}>
              Cédula/RUC: {formatClientDocument(selectedClient!)}
            </p>
          ) : null}
          {selectedClient!.email ? (
            <p style={{ color: "#b9accf", margin: "4px 0 0" }}>Correo: {selectedClient!.email}</p>
          ) : null}
        </div>
      ) : null}

      {error ? <p style={{ color: "#ff8f9c" }}>{error}</p> : null}

      {showContinueButton ? (
        <button className="button" type="submit" disabled={loading}>
          <span className="btn-loading-inner">
            {loading ? <InlineSpinner size="sm" /> : null}
            {loading ? "Generando orden…" : "Siguiente"}
          </span>
        </button>
      ) : null}

      <PendingRewardModal
        clientId={selectedClient?.id ?? presetClientId ?? ""}
        payload={rewardModalPayload}
        open={rewardModalOpen && Boolean(rewardModalPayload) && Boolean(selectedClient?.id ?? presetClientId)}
        onClose={handleRewardFlowClose}
      />
    </form>
  );
}
