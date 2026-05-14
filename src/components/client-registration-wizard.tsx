"use client";

import { InlineSpinner } from "@/components/inline-spinner";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

const STEPS = [
  { id: 1, label: "Cliente" },
  { id: 2, label: "Vehículo" },
  { id: 3, label: "Foto" },
  { id: 4, label: "Confirmar" },
  { id: 5, label: "Listo" }
];

export function ClientRegistrationWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forOrder = searchParams.get("forOrder") === "1";
  const homeHref = forOrder ? "/dashboard/orders/new/identify" : "/dashboard/clients";

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cedula, setCedula] = useState("");

  const [plate, setPlate] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [year, setYear] = useState("");

  const [clientId, setClientId] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const p = searchParams.get("plate");
    if (p?.trim()) setPlate((prev) => prev || p.trim().toUpperCase());
  }, [searchParams]);

  const resetPhotoInput = useCallback(() => {
    setPhotoDataUrl(null);
  }, []);

  function cedulaHasDigits(value: string): boolean {
    return value.replace(/\D/g, "").length > 0;
  }

  function handleStep1(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const full_name = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!full_name || !phone.trim()) {
      setError("Nombre y teléfono son obligatorios.");
      return;
    }
    if (!cedula.trim()) {
      setError("La cédula o RUC es obligatorio.");
      return;
    }
    if (!cedulaHasDigits(cedula)) {
      setError("Introduce una cédula o RUC válido (debe incluir al menos un número).");
      return;
    }
    setStep(2);
  }

  function handleStep2(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!plate.trim() || !make.trim() || !model.trim()) {
      setError("Matrícula, marca y modelo son obligatorios.");
      return;
    }
    setStep(3);
  }

  function handleFileChange(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  function handleStep3Continue() {
    setError(null);
    if (!photoDataUrl) {
      setError("Selecciona o captura una foto del vehículo.");
      return;
    }
    setStep(4);
  }

  async function handleConfirmRegistration() {
    if (!photoDataUrl) return;
    const full_name = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!full_name || !phone.trim() || !cedula.trim()) {
      setError("Faltan datos del cliente. Vuelve al primer paso.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/clients/complete-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: {
            full_name,
            phone: phone.trim(),
            email: email.trim() || null,
            cedula: cedula.trim()
          },
          vehicle: {
            plate: plate.trim().toUpperCase(),
            make: make.trim(),
            model: model.trim(),
            color: color.trim() || null,
            year: year ? Number(year) : null,
            car_registration_photo: photoDataUrl
          }
        })
      });
      const data = (await response.json()) as {
        error?: string;
        existing_client_id?: string;
        client?: { id: string };
        vehicle?: { id: string };
      };
      if (response.status === 409 && typeof data.existing_client_id === "string") {
        router.push(`/dashboard/clients/${data.existing_client_id}`);
        return;
      }
      if (!response.ok) throw new Error(data.error ?? "No se pudo completar el registro.");
      if (typeof data.client?.id !== "string" || typeof data.vehicle?.id !== "string") {
        throw new Error("Respuesta inválida del servidor.");
      }
      setClientId(data.client.id);
      setVehicleId(data.vehicle.id);
      setStep(5);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al registrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="registration-flow">
      <header className="registration-flow-header">
        <button type="button" className="registration-icon-btn" onClick={() => router.push(homeHref)} aria-label="Volver">
          ←
        </button>
        <span className="registration-flow-brand">
          {forOrder ? "Registro para nueva orden" : "Registro de cliente"}
        </span>
        <button type="button" className="registration-exit" onClick={() => router.push(homeHref)}>
          Salir
        </button>
      </header>

      {step < 5 ? (
        <div className="registration-step-meta">
          <p className="registration-breadcrumb">{forOrder ? "Nueva orden / Alta de cliente" : "Clientes / Nuevo"}</p>
          <h1 className="registration-title">
            {step === 1 && "Alta de nuevo cliente"}
            {step === 2 && "Registro — datos del vehículo"}
            {step === 3 && "Captura de foto del vehículo"}
            {step === 4 && "Confirmar foto"}
          </h1>
          {step === 1 ? (
            <p className="registration-subtitle">
              Ningún dato del cliente se guarda en la base hasta que completes también el vehículo y la foto. Sin
              vehículo no existe el cliente.
            </p>
          ) : null}
          {step === 2 ? (
            <p className="registration-subtitle">Introduce los datos del vehículo para completar el perfil.</p>
          ) : null}
        </div>
      ) : null}

      {step < 5 ? (
        <div className="registration-progress">
          {STEPS.slice(0, 4).map((s) => (
            <div key={s.id} className={`registration-progress-item ${step > s.id ? "done" : ""} ${step === s.id ? "active" : ""}`}>
              <div className="registration-progress-bar">
                <div
                  className="registration-progress-fill"
                  style={{
                    width: step > s.id ? "100%" : step === s.id ? "100%" : "0%"
                  }}
                />
              </div>
              <span className="registration-progress-label">{s.label}</span>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <p className="registration-error">{error}</p> : null}

      {step === 1 ? (
        <form className="registration-glass-panel" onSubmit={handleStep1}>
          <div className="registration-section-head">
            <span className="registration-section-icon">👤</span>
            <h2 className="registration-section-title">Información del cliente</h2>
          </div>
          <div className="registration-grid">
            <label className="registration-field">
              <span className="registration-label">Nombre</span>
              <input
                className="registration-input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="p. ej. María"
                required
              />
            </label>
            <label className="registration-field">
              <span className="registration-label">Apellidos</span>
              <input
                className="registration-input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="p. ej. García"
                required
              />
            </label>
            <label className="registration-field registration-field-full">
              <span className="registration-label">Cédula/RUC</span>
              <input
                className="registration-input"
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="0106354932"
                required
              />
            </label>
            <label className="registration-field registration-field-full">
              <span className="registration-label">Teléfono</span>
              <input
                className="registration-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="612 345 678"
                required
              />
            </label>
            <label className="registration-field registration-field-full">
              <span className="registration-label">Correo electrónico</span>
              <input
                className="registration-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@ejemplo.com"
              />
            </label>

          </div>
          <div className="registration-actions">
            <button type="button" className="button secondary" onClick={() => router.push(homeHref)}>
              Cancelar
            </button>
            <button type="submit" className="registration-btn-primary">
              Siguiente
            </button>
          </div>
        </form>
      ) : null}

      {step === 2 ? (
        <form className="registration-glass-panel" onSubmit={handleStep2}>
          <div className="registration-section-head">
            <span className="registration-section-icon">🚗</span>
            <h2 className="registration-section-title">Datos del vehículo</h2>
          </div>
          <label className="registration-field">
            <span className="registration-label">Matrícula</span>
            <input
              className="registration-input registration-input-plate"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              placeholder="p. ej. 1234 ABC"
              required
            />
            <span className="registration-hint">Si ya pasó por el taller, puede autocompletarse por matrícula.</span>
          </label>
          <div className="registration-grid">
            <label className="registration-field">
              <span className="registration-label">Marca</span>
              <input className="registration-input" value={make} onChange={(e) => setMake(e.target.value)} placeholder="p. ej. Porsche" required />
            </label>
            <label className="registration-field">
              <span className="registration-label">Modelo</span>
              <input className="registration-input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="p. ej. 911" required />
            </label>
            <label className="registration-field">
              <span className="registration-label">Color</span>
              <input className="registration-input" value={color} onChange={(e) => setColor(e.target.value)} placeholder="p. ej. Azul" />
            </label>
            <label className="registration-field">
              <span className="registration-label">Año</span>
              <input
                className="registration-input"
                type="number"
                min={1980}
                max={2035}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2024"
              />
            </label>
          </div>
          <div className="registration-sticky-actions">
            <button type="button" className="button secondary" onClick={() => setStep(1)}>
              Atrás
            </button>
            <button type="submit" className="registration-btn-primary">
              Siguiente
            </button>
          </div>
        </form>
      ) : null}

      {step === 3 ? (
        <div className="registration-glass-panel registration-capture">
          <p className="registration-capture-hint">Centra el vehículo en el encuadre y usa buena luz.</p>
          <label className="registration-dropzone">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="registration-file-input"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
            {!photoDataUrl ? (
              <>
                <span className="registration-dropzone-icon">📷</span>
                <span className="registration-dropzone-title">Añadir foto del vehículo</span>
                <span className="registration-hint">Captura o sube una imagen en alta resolución</span>
              </>
            ) : (
              <img src={photoDataUrl} alt="Vista previa" className="registration-preview-thumb" />
            )}
          </label>
          <div className="registration-sticky-actions">
            <button type="button" className="button secondary" onClick={() => setStep(2)}>
              Atrás
            </button>
            <button type="button" className="registration-btn-primary" onClick={handleStep3Continue}>
              Continuar
            </button>
          </div>
        </div>
      ) : null}

      {step === 4 && photoDataUrl ? (
        <div className="registration-glass-panel registration-confirm">
          <h2 className="registration-section-title">¿Confirmas esta foto?</h2>
          <img src={photoDataUrl} alt="Confirmación" className="registration-preview-large" />
          <div className="registration-sticky-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                resetPhotoInput();
                setStep(3);
              }}
            >
              Tomar otra
            </button>
            <button type="button" className="registration-btn-primary" onClick={handleConfirmRegistration} disabled={loading}>
              <span className="btn-loading-inner">
                {loading ? <InlineSpinner size="sm" /> : null}
                {loading ? "Registrando cliente y vehículo…" : "Confirmar y completar"}
              </span>
            </button>
          </div>
        </div>
      ) : null}

      {step === 5 && clientId ? (
        <div className="registration-success">
          <div className="registration-success-icon">✓</div>
          <h2 className="registration-success-title">Registro completado</h2>
          <p className="registration-success-text">
            {forOrder
              ? "Continúa con la selección de servicios para crear la orden."
              : "El cliente y el vehículo quedaron dados de alta correctamente."}
          </p>
          <div className="registration-success-actions">
            {forOrder && vehicleId ? (
              <Link
                className="registration-btn-primary"
                href={`/dashboard/orders/new/services?clientId=${clientId}&vehicleId=${vehicleId}`}
                style={{ textDecoration: "none" }}
              >
                Continuar con la orden
              </Link>
            ) : null}
            <Link className={forOrder ? "button secondary" : "button"} href={`/dashboard/clients/${clientId}`}>
              Ver perfil del cliente
            </Link>
            <Link className="button secondary" href={homeHref}>
              {forOrder ? "Registrar otro vehículo" : "Volver al directorio"}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
