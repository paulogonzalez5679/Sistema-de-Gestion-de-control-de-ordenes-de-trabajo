"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { InventoryItem, WorkOrderPriority } from "@/lib/types";
import { formatPriority, formatProfileRole } from "@/lib/ui-labels";
import { ResponsiveSelect } from "@/components/responsive-select";
import {
  INTAKE_MIN_PHOTOS,
  OrderIntakePhotosField
} from "@/components/order-intake-photos-field";

const PRIORITY_OPTIONS: WorkOrderPriority[] = ["low", "normal", "high", "urgent"];

type Service = {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
};

type Profile = {
  id: string;
  full_name: string;
  role: string;
};

type DraftProduct = {
  item_id: string;
  quantity: number;
  unit_price: number;
};

export type OrderServicesFormProps = {
  currentUserId: string;
  /** Nombre visible cuando la orden se autoasigna (no admin). */
  currentUserName: string;
  /** Solo administrador y gerencia pueden elegir otro responsable; el resto queda autoasignado en servidor. */
  canPickAssignee: boolean;
  /** Solo administrador puede ver precios de servicios. */
  canViewServicePricing: boolean;
  /** Admin y gerencia pueden aplicar descuento al crear la orden. */
  canApplyDiscount: boolean;
};

export function OrderServicesForm({
  currentUserId,
  currentUserName,
  canPickAssignee,
  canViewServicePricing,
  canApplyDiscount
}: OrderServicesFormProps) {
  const router = useRouter();
  const params = useSearchParams();
  const clientId = params.get("clientId");
  const vehicleId = params.get("vehicleId");

  const [services, setServices] = useState<Service[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [draftProducts, setDraftProducts] = useState<DraftProduct[]>([]);
  const [productPickerItem, setProductPickerItem] = useState<string>("");
  const [productPickerQuantity, setProductPickerQuantity] = useState<number>(1);
  const [productPickerPrice, setProductPickerPrice] = useState<string>("");
  const [productSearch, setProductSearch] = useState("");
  const [productSuggestOpen, setProductSuggestOpen] = useState(false);
  const productSearchWrapRef = useRef<HTMLDivElement>(null);

  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState<WorkOrderPriority | "">("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [intakeNotes, setIntakeNotes] = useState("");
  const [intakePhotos, setIntakePhotos] = useState<File[]>([]);
  const [discountAmount, setDiscountAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialDataLoading, setInitialDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canPickAssignee) {
      setAssignedTo(currentUserId);
      setProfiles([]);
    }
  }, [canPickAssignee, currentUserId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setInitialDataLoading(true);
      setError(null);
      try {
        const [serviceRes, profileRes, inventoryRes] = await Promise.all([
          fetch("/api/services"),
          canPickAssignee
            ? fetch("/api/profiles/assignees")
            : Promise.resolve(
                new Response(JSON.stringify([]), {
                  status: 200,
                  headers: { "Content-Type": "application/json" }
                })
              ),
          fetch("/api/inventory?page=1&pageSize=100")
        ]);
        const serviceData = await serviceRes.json();
        const profileData = await profileRes.json();
        const inventoryRaw = inventoryRes.ok ? await inventoryRes.json() : null;
        const inventoryItems: InventoryItem[] = Array.isArray(inventoryRaw)
          ? inventoryRaw
          : inventoryRaw &&
              typeof inventoryRaw === "object" &&
              Array.isArray((inventoryRaw as { items?: unknown }).items)
            ? ((inventoryRaw as { items: InventoryItem[] }).items)
            : [];
        if (!serviceRes.ok) {
          throw new Error(typeof serviceData?.error === "string" ? serviceData.error : "No se pudieron cargar los servicios.");
        }
        if (!cancelled) {
          setServices(Array.isArray(serviceData) ? serviceData : []);
          setProfiles(Array.isArray(profileData) ? profileData : []);
          setInventory(inventoryItems);
        }
      } catch {
        if (!cancelled) setError("No se pudieron cargar los datos del formulario.");
      } finally {
        if (!cancelled) setInitialDataLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canPickAssignee]);

  const selectedItems = useMemo(
    () => services.filter((service) => selected[service.id]),
    [services, selected]
  );
  const servicesTotal = selectedItems.reduce((sum, service) => sum + Number(service.base_price), 0);

  const productsTotal = useMemo(
    () => draftProducts.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
    [draftProducts]
  );

  const total = servicesTotal + productsTotal;
  const parsedDiscount = useMemo(() => {
    if (!canApplyDiscount) return 0;
    const raw = discountAmount.trim() === "" ? 0 : Number(discountAmount);
    if (!Number.isFinite(raw) || raw < 0) return 0;
    return raw;
  }, [canApplyDiscount, discountAmount]);
  const estimatedTotal = Math.max(0, total - parsedDiscount);

  const inventoryMap = useMemo(() => new Map(inventory.map((item) => [item.id, item])), [inventory]);

  const availableInventory = useMemo(() => {
    const usedQty: Record<string, number> = {};
    for (const draft of draftProducts) {
      usedQty[draft.item_id] = (usedQty[draft.item_id] ?? 0) + draft.quantity;
    }
    return inventory
      .map((item) => {
        const q = Number(item.quantity);
        const base = Number.isFinite(q) && q >= 0 ? q : 0;
        return {
          ...item,
          available: base - (usedQty[item.id] ?? 0)
        };
      })
      .filter((item) => item.available > 0);
  }, [inventory, draftProducts]);

  const filteredInventory = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return availableInventory;
    return availableInventory.filter((item) => {
      const name = (item.name ?? "").toLowerCase();
      const sku = (item.sku ?? "").toLowerCase();
      const category = (item.category ?? "").toLowerCase();
      return name.includes(query) || sku.includes(query) || category.includes(query);
    });
  }, [availableInventory, productSearch]);

  const assigneeSelectOptions = useMemo(
    () => profiles.map((p) => ({ value: p.id, label: `${p.full_name} (${formatProfileRole(p.role)})` })),
    [profiles]
  );

  const prioritySelectOptions = useMemo(
    () => PRIORITY_OPTIONS.map((p) => ({ value: p, label: formatPriority(p) })),
    []
  );

  const productSelectOptions = useMemo(() => {
    const rows = availableInventory.map((item) => ({
      value: item.id,
      label: `${item.name} · $${Number(item.unit_cost).toFixed(2)}`
    }));
    if (productPickerItem && !rows.some((r) => r.value === productPickerItem)) {
      const item = inventoryMap.get(productPickerItem);
      if (item) {
        return [
          {
            value: item.id,
            label: `${item.name} · $${Number(item.unit_cost).toFixed(2)}`
          },
          ...rows
        ];
      }
    }
    return rows;
  }, [availableInventory, productPickerItem, inventoryMap]);

  const productNativePlaceholder =
    availableInventory.length === 0 ? "Sin productos disponibles" : "Selecciona un producto";

  const pickProductFromSuggestion = useCallback((itemId: string) => {
    setProductPickerItem(itemId);
    setProductSearch("");
    setProductSuggestOpen(false);
  }, []);

  useEffect(() => {
    if (!productSuggestOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = productSearchWrapRef.current;
      if (el && !el.contains(e.target as Node)) setProductSuggestOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [productSuggestOpen]);

  useEffect(() => {
    if (!productPickerItem) {
      setProductPickerPrice("");
      return;
    }
    const item = inventoryMap.get(productPickerItem);
    if (item) {
      setProductPickerPrice(Number(item.unit_cost).toFixed(2));
    }
  }, [productPickerItem, inventoryMap]);

  function addDraftProduct() {
    setError(null);
    if (!productPickerItem) {
      setError("Selecciona un producto para agregar.");
      return;
    }
    const item = inventoryMap.get(productPickerItem);
    if (!item) {
      setError("El producto seleccionado ya no está disponible.");
      return;
    }
    const qty = Math.floor(productPickerQuantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("La cantidad debe ser un entero positivo.");
      return;
    }
    const price = Number(productPickerPrice);
    if (!Number.isFinite(price) || price < 0) {
      setError("El precio unitario no es válido.");
      return;
    }
    const alreadyDrafted = draftProducts
      .filter((d) => d.item_id === item.id)
      .reduce((acc, d) => acc + d.quantity, 0);
    if (alreadyDrafted + qty > Number(item.quantity)) {
      setError(`Stock insuficiente para «${item.name}». Disponible: ${Number(item.quantity) - alreadyDrafted}.`);
      return;
    }
    setDraftProducts((current) => [
      ...current,
      { item_id: item.id, quantity: qty, unit_price: price }
    ]);
    setProductPickerItem("");
    setProductPickerQuantity(1);
    setProductPickerPrice("");
  }

  function removeDraftProduct(index: number) {
    setDraftProducts((current) => current.filter((_, i) => i !== index));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!clientId || !vehicleId) {
        throw new Error("Falta el contexto de cliente o vehículo.");
      }
      if (!selectedItems.length) {
        throw new Error("Debes seleccionar al menos un servicio (obligatorio). Los productos son opcionales.");
      }
      if (canPickAssignee && !assignedTo.trim()) {
        throw new Error("Selecciona el detallista u operador responsable.");
      }
      if (!priority) {
        throw new Error("Selecciona la prioridad de la orden.");
      }
      if (!scheduledStart.trim() || !scheduledEnd.trim()) {
        throw new Error("Indica inicio y fin programados.");
      }
      const startMs = Date.parse(scheduledStart);
      const endMs = Date.parse(scheduledEnd);
      if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
        throw new Error("El fin programado debe ser posterior al inicio.");
      }
      if (!notes.trim()) {
        throw new Error("Las notas de la orden son obligatorias.");
      }
      if (!intakeNotes.trim() || intakeNotes.trim().length < 3) {
        throw new Error("Los detalles de ingreso del vehículo son obligatorios.");
      }
      if (intakePhotos.length < INTAKE_MIN_PHOTOS) {
        throw new Error(`Debe adjuntar al menos ${INTAKE_MIN_PHOTOS} foto de ingreso.`);
      }
      if (canApplyDiscount && discountAmount.trim() !== "") {
        const discount = Number(discountAmount);
        if (!Number.isFinite(discount) || discount < 0) {
          throw new Error("El descuento no es válido.");
        }
        if (canViewServicePricing && discount > total) {
          throw new Error("El descuento no puede ser mayor que el subtotal estimado.");
        }
      }

      const assigneeId = (canPickAssignee ? assignedTo : currentUserId).trim();
      if (!assigneeId) {
        throw new Error("No se pudo determinar el responsable de la orden.");
      }

      // Reintento seguro: una sola escritura atómica protegida por Idempotency-Key.
      const idempotencyKey = globalThis.crypto.randomUUID();
      const bundleRes = await fetch("/api/orders/bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          order: {
            client_id: clientId,
            vehicle_id: vehicleId,
            assigned_to: assigneeId,
            status: "assigned",
            priority,
            scheduled_start: scheduledStart,
            scheduled_end: scheduledEnd,
            notes: notes.trim(),
            ...(canApplyDiscount && parsedDiscount > 0 ? { discount_amount: parsedDiscount } : {})
          },
          // El servidor persiste el precio desde el catálogo; el cliente solo indica qué servicios van.
          services: selectedItems.map((service) => ({ service_id: service.id, price: 0 })),
          products: draftProducts.map((d) => ({ item_id: d.item_id, quantity: d.quantity, unit_price: d.unit_price }))
        })
      });
      const order = await bundleRes.json();
      if (!bundleRes.ok) {
        throw new Error(typeof order?.error === "string" ? order.error : "No se pudo crear la orden.");
      }

      const appointmentRes = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          work_order_id: order.id,
          starts_at: scheduledStart,
          ends_at: scheduledEnd,
          bay: "Bahía 1"
        })
      });
      if (!appointmentRes.ok) {
        const payload = await appointmentRes.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string" ? payload.error : "No se pudo crear la cita en el calendario."
        );
      }

      const intakeForm = new FormData();
      intakeForm.append("intake_condition_notes", intakeNotes.trim());
      for (const photo of intakePhotos) {
        intakeForm.append("photos", photo);
      }
      const intakeRes = await fetch(`/api/orders/${encodeURIComponent(order.id)}/intake`, {
        method: "POST",
        body: intakeForm
      });
      if (!intakeRes.ok) {
        const payload = await intakeRes.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "La orden se creó pero no se pudieron guardar las fotos de ingreso."
        );
      }

      router.push(`/dashboard/orders/assigned/${order.id}`);
      router.refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "No se pudo crear la orden.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (initialDataLoading) {
    return (
      <div className="card" style={{ minHeight: 120 }}>
        <p style={{ margin: 0, color: "#b9accf" }}>Cargando servicios, equipo e inventario…</p>
      </div>
    );
  }

  return (
    <form className="row two" onSubmit={onSubmit}>
      <div className="row" style={{ display: "grid", gap: 16 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Paquetes de servicio</h3>
          <p style={{ color: "#b9accf", fontSize: "0.9rem", marginTop: 0 }}>
            Seleccionar al menos un servicio es obligatorio. Los productos del otro bloque son opcionales.
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            {services.map((service) => (
              <label key={service.id} style={{ border: "1px solid #2a203d", borderRadius: 12, padding: 10 }}>
                <input
                  type="checkbox"
                  checked={Boolean(selected[service.id])}
                  onChange={(e) => setSelected((current) => ({ ...current, [service.id]: e.target.checked }))}
                />
                <span style={{ marginLeft: 8, fontWeight: 600 }}>{service.name}</span>
                <div style={{ color: "#b9accf", marginTop: 4 }}>{service.description}</div>
                {canViewServicePricing ? (
                  <div style={{ marginTop: 4 }}>${Number(service.base_price ?? 0).toFixed(2)}</div>
                ) : null}
              </label>
            ))}
          </div>
        </div>

        <div className="card order-products-card">
          <div className="order-products-card__head">
            <div>
              <h3 style={{ margin: 0 }}>Productos opcionales</h3>
              <p className="order-products-card__hint">
                Añade productos del inventario que se consumirán en esta orden. Podrás agregar más al facturar.
              </p>
            </div>
            <span className="order-products-card__badge">{draftProducts.length} producto(s)</span>
          </div>

          <div className="order-products-picker">
            <div className="order-products-picker__row">
              <label className="order-products-picker__field order-products-picker__field--grow">
                <span className="order-products-picker__label">Buscar producto</span>
                <div ref={productSearchWrapRef} className="order-products-picker__search-wrap">
                  <input
                    className="input"
                    type="search"
                    placeholder="Nombre, SKU o categoría…"
                    value={productSearch}
                    onChange={(e) => {
                      const next = e.target.value;
                      setProductSearch(next);
                      setProductSuggestOpen(next.trim().length > 0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setProductSuggestOpen(false);
                    }}
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-expanded={
                      productSuggestOpen &&
                      productSearch.trim().length > 0 &&
                      availableInventory.length > 0
                    }
                    aria-controls="order-services-product-suggest"
                    disabled={availableInventory.length === 0}
                  />
                  {productSuggestOpen &&
                  productSearch.trim().length > 0 &&
                  availableInventory.length > 0 ? (
                    <ul
                      id="order-services-product-suggest"
                      className="order-products-picker__suggest"
                      role="listbox"
                      aria-label="Coincidencias de producto"
                    >
                      {filteredInventory.length === 0 ? (
                        <li className="order-products-picker__suggest-empty" role="presentation">
                          Ningún producto coincide. Prueba otro término.
                        </li>
                      ) : (
                        filteredInventory.map((item) => (
                          <li key={item.id} role="presentation">
                            <button
                              type="button"
                              role="option"
                              aria-selected={productPickerItem === item.id}
                              className="order-products-picker__suggest-item"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                pickProductFromSuggestion(item.id);
                              }}
                            >
                              <span className="order-products-picker__suggest-name">{item.name}</span>
                              <span className="order-products-picker__suggest-meta">
                                SKU {item.sku ?? "—"} · {item.category ?? "—"} · $
                                {Number(item.unit_cost).toFixed(2)} · {item.available} ud
                              </span>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  ) : null}
                </div>
                <span className="order-products-picker__label" style={{ marginTop: 10 }}>
                  Producto seleccionado
                </span>
                <div style={{ marginTop: 6 }}>
                  <ResponsiveSelect
                    id="order-services-product"
                    value={productPickerItem}
                    onChange={setProductPickerItem}
                    options={productSelectOptions}
                    placeholderOptionLabel={productNativePlaceholder}
                    modalTitle="Producto"
                    disabled={availableInventory.length === 0}
                    allowClear
                    allowClearLabel="Sin producto seleccionado"
                  />
                </div>
                {productPickerItem ? (
                  <span className="order-products-picker__stock">
                    <span className="material-symbols-outlined" aria-hidden>
                      inventory_2
                    </span>
                    Stock disponible:{" "}
                    <strong>
                      {(() => {
                        const row = availableInventory.find((i) => i.id === productPickerItem);
                        if (row) return `${row.available} ud`;
                        const item = inventoryMap.get(productPickerItem);
                        if (!item) return "—";
                        const used = draftProducts
                          .filter((d) => d.item_id === productPickerItem)
                          .reduce((acc, d) => acc + d.quantity, 0);
                        const q = Number(item.quantity);
                        const base = Number.isFinite(q) && q >= 0 ? q : 0;
                        return `${Math.max(0, base - used)} ud`;
                      })()}
                    </strong>
                  </span>
                ) : null}
              </label>

              <label className="order-products-picker__field">
                <span className="order-products-picker__label">Cantidad</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  step={1}
                  value={productPickerQuantity}
                  onChange={(e) => setProductPickerQuantity(Number(e.target.value))}
                />
              </label>

              <label className="order-products-picker__field">
                <span className="order-products-picker__label">Precio unitario</span>
                <input
                  className="input order-products-picker__price"
                  type="text"
                  inputMode="decimal"
                  value={productPickerPrice ? `$${productPickerPrice}` : "—"}
                  readOnly
                  tabIndex={-1}
                  aria-readonly="true"
                />
              </label>

              <button
                type="button"
                className="button order-products-picker__action"
                onClick={addDraftProduct}
                disabled={!productPickerItem}
              >
                Añadir
              </button>
            </div>
          </div>

          {draftProducts.length === 0 ? (
            <p className="order-products-empty">
              No has añadido productos. Solo se cobrarán los servicios seleccionados.
            </p>
          ) : (
            <div className="order-products-list">
              {draftProducts.map((draft, index) => {
                const item = inventoryMap.get(draft.item_id);
                return (
                  <div key={`${draft.item_id}-${index}`} className="order-products-list__row">
                    <div className="order-products-list__main">
                      <span className="order-products-list__name">{item?.name ?? "Producto"}</span>
                      <span className="order-products-list__meta">
                        SKU {item?.sku ?? "—"} · {draft.quantity} ud · ${draft.unit_price.toFixed(2)} c/u
                      </span>
                    </div>
                    <span className="order-products-list__total">
                      ${(draft.quantity * draft.unit_price).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      className="order-products-list__remove"
                      onClick={() => removeDraftProduct(index)}
                      aria-label="Eliminar producto"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Servicios y asignación</h3>
        <p style={{ color: "#b9accf", fontSize: "0.9rem", marginTop: 0 }}>
          Todos los campos son obligatorios para crear la orden.
        </p>
        {canPickAssignee ? (
          <label htmlFor="order-services-assignee">
            Detallista principal *
            <ResponsiveSelect
              id="order-services-assignee"
              value={assignedTo}
              onChange={setAssignedTo}
              options={assigneeSelectOptions}
              placeholderOptionLabel="Selecciona un responsable"
              modalTitle="Detallista principal"
              required
              disabled={profiles.length === 0}
            />
          </label>
        ) : (
          <div
            className="order-services-self-assign"
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              marginBottom: 4
            }}
          >
            <p style={{ margin: 0, fontWeight: 600, color: "#f0ecfa" }}>Responsable de la orden</p>
            <p style={{ margin: "6px 0 0", color: "#b9accf", fontSize: "0.9rem" }}>
              La orden quedará asignada a{" "}
              <strong style={{ color: "#f0ecfa", fontWeight: 600 }}>{currentUserName.trim() || "tu usuario"}</strong>.
              
            </p>
          </div>
        )}
        {canPickAssignee && profiles.length === 0 ? (
          <p style={{ color: "#ff8f9c", fontSize: "0.9rem", marginTop: 8 }}>
            No hay usuarios en el sistema. Añade perfiles antes de poder crear la orden.
          </p>
        ) : null}
        <label htmlFor="order-services-priority" style={{ marginTop: 10 }}>
          Prioridad *
          <ResponsiveSelect
            id="order-services-priority"
            value={priority}
            onChange={(v) => setPriority((v || "") as WorkOrderPriority | "")}
            options={prioritySelectOptions}
            placeholderOptionLabel="Selecciona prioridad"
            modalTitle="Prioridad"
            required
          />
        </label>
        <label style={{ marginTop: 10 }}>
          Inicio programado *
          <input
            className="input"
            type="datetime-local"
            value={scheduledStart}
            onChange={(e) => setScheduledStart(e.target.value)}
            required
          />
        </label>
        <label style={{ marginTop: 10 }}>
          Fin programado *
          <input
            className="input"
            type="datetime-local"
            value={scheduledEnd}
            onChange={(e) => setScheduledEnd(e.target.value)}
            required
          />
        </label>
        <label style={{ marginTop: 10 }}>
          Notas de la orden *
          <textarea
            className="textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Motivo de la visita, observaciones del cliente, etc."
            rows={4}
            required
          />
        </label>
        {canApplyDiscount ? (
          <label style={{ marginTop: 10 }}>
            Descuento (opcional)
            <input
              className="input"
              type="number"
              min={0}
              step={0.01}
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              placeholder="0.00"
            />
            <span style={{ display: "block", marginTop: 6, fontSize: "0.82rem", color: "#b9accf" }}>
              Monto en dólares a descontar del total de la orden. También podrás ajustarlo antes de facturar.
            </span>
          </label>
        ) : null}
        <OrderIntakePhotosField
          notes={intakeNotes}
          onNotesChange={setIntakeNotes}
          photos={intakePhotos}
          onPhotosChange={setIntakePhotos}
          disabled={loading}
        />
        <div className="card order-summary-card" style={{ marginTop: 12 }}>
          <h4 style={{ marginTop: 0 }}>Resumen de la orden</h4>
          <div className="order-summary-line">
            <span>{selectedItems.length} servicios</span>
            {canViewServicePricing ? <span>${servicesTotal.toFixed(2)}</span> : null}
          </div>
          {draftProducts.length > 0 ? (
            <div className="order-summary-line">
              <span>
                {draftProducts.reduce((acc, d) => acc + d.quantity, 0)} producto(s)
              </span>
              {canViewServicePricing ? <span>${productsTotal.toFixed(2)}</span> : null}
            </div>
          ) : null}
          {canApplyDiscount && parsedDiscount > 0 ? (
            <div className="order-summary-line">
              <span>Descuento</span>
              <span>-${parsedDiscount.toFixed(2)}</span>
            </div>
          ) : null}
          {canViewServicePricing ? (
            <div className="order-summary-line order-summary-line--total">
              <span>Total estimado</span>
              <strong>${estimatedTotal.toFixed(2)}</strong>
            </div>
          ) : canApplyDiscount && parsedDiscount > 0 ? (
            <div className="order-summary-line order-summary-line--total">
              <span>Descuento aplicado</span>
              <strong>${parsedDiscount.toFixed(2)}</strong>
            </div>
          ) : null}
        </div>
        {error ? <p style={{ color: "#ff8f9c" }}>{error}</p> : null}
        <button className="button" style={{ marginTop: 12 }} type="submit" disabled={loading}>
          {loading ? "Creando…" : "Crear orden de trabajo"}
        </button>
      </div>
    </form>
  );
}
