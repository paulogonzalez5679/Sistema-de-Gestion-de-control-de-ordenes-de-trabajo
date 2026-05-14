"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkOrderStatus } from "@/lib/types";

type ServiceLine = {
  id: string;
  name: string;
  price: number;
  statusLabel: string;
  statusCode: string;
};

type ProductLine = {
  id: string;
  item_id: string;
  item_name: string;
  item_sku: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type InventoryRow = {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit_cost: number;
  quantity: number;
};

type Props = {
  orderId: string;
  orderNumber: string;
  status: WorkOrderStatus;
  editable: boolean;
  services: ServiceLine[];
  initialProducts: ProductLine[];
  inventory: InventoryRow[];
  initialDiscount: number;
  initialTotal: number;
};

export function OrderInvoiceReview({
  orderId,
  orderNumber,
  status,
  editable,
  services,
  initialProducts,
  inventory,
  initialDiscount,
  initialTotal
}: Props) {
  const router = useRouter();

  const [products, setProducts] = useState<ProductLine[]>(initialProducts);
  const [discountInput, setDiscountInput] = useState<string>(initialDiscount.toFixed(2));
  const [appliedDiscount, setAppliedDiscount] = useState<number>(initialDiscount);
  const [total, setTotal] = useState<number>(initialTotal);

  const [pickerItemId, setPickerItemId] = useState<string>("");
  const [pickerQuantity, setPickerQuantity] = useState<number>(1);
  const [pickerPrice, setPickerPrice] = useState<string>("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inventoryMap = useMemo(() => new Map(inventory.map((row) => [row.id, row])), [inventory]);

  const filteredInventory = useMemo(() => {
    const usedQty: Record<string, number> = {};
    for (const product of products) {
      usedQty[product.item_id] = (usedQty[product.item_id] ?? 0) + product.quantity;
    }
    const query = search.trim().toLowerCase();
    return inventory
      .map((row) => ({
        ...row,
        available: row.quantity - (usedQty[row.id] ?? 0)
      }))
      .filter((row) => row.available > 0)
      .filter((row) =>
        !query
          ? true
          : row.name.toLowerCase().includes(query) ||
            row.sku.toLowerCase().includes(query) ||
            row.category.toLowerCase().includes(query)
      );
  }, [inventory, products, search]);

  function onPickItem(id: string) {
    setPickerItemId(id);
    const item = inventoryMap.get(id);
    if (item) {
      setPickerPrice(item.unit_cost.toFixed(2));
    } else {
      setPickerPrice("");
    }
  }

  const servicesTotal = useMemo(
    () => services.reduce((acc, line) => acc + Number(line.price ?? 0), 0),
    [services]
  );
  const productsTotal = useMemo(
    () => products.reduce((acc, line) => acc + Number(line.line_total ?? line.unit_price * line.quantity), 0),
    [products]
  );
  const subtotal = servicesTotal + productsTotal;

  async function addProduct() {
    if (!editable) return;
    setError(null);
    if (!pickerItemId) {
      setError("Selecciona un producto para agregar.");
      return;
    }
    const qty = Math.floor(pickerQuantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("La cantidad debe ser un entero positivo.");
      return;
    }
    const price = Number(pickerPrice);
    if (!Number.isFinite(price) || price < 0) {
      setError("El precio unitario no es válido.");
      return;
    }
    setLoading("add");
    try {
      const res = await fetch(`/api/orders/${orderId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: pickerItemId, quantity: qty, unit_price: price })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo añadir el producto.");
      const item = inventoryMap.get(pickerItemId);
      setProducts((current) => [
        ...current,
        {
          id: data.id,
          item_id: data.item_id,
          item_name: item?.name ?? "Producto",
          item_sku: item?.sku ?? "—",
          quantity: Number(data.quantity),
          unit_price: Number(data.unit_price),
          line_total: Number(data.quantity) * Number(data.unit_price)
        }
      ]);
      setPickerItemId("");
      setPickerQuantity(1);
      setPickerPrice("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo añadir el producto.");
    } finally {
      setLoading(null);
    }
  }

  async function removeProduct(lineId: string) {
    if (!editable) return;
    if (!window.confirm("¿Quitar este producto de la orden? Volverá al stock.")) return;
    setError(null);
    setLoading(`remove:${lineId}`);
    try {
      const res = await fetch(`/api/orders/${orderId}/products/${lineId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "No se pudo eliminar el producto.");
      }
      setProducts((current) => current.filter((line) => line.id !== lineId));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo eliminar el producto.");
    } finally {
      setLoading(null);
    }
  }

  async function applyDiscount() {
    if (!editable) return;
    setError(null);
    const raw = discountInput.trim() === "" ? 0 : Number(discountInput);
    if (!Number.isFinite(raw) || raw < 0) {
      setError("El descuento no es válido.");
      return;
    }
    if (raw > subtotal) {
      setError(`El descuento ($${raw.toFixed(2)}) no puede ser mayor que el subtotal ($${subtotal.toFixed(2)}).`);
      return;
    }
    setLoading("discount");
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discount_amount: raw })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo aplicar el descuento.");
      setAppliedDiscount(Number(data.discount_amount ?? raw));
      setTotal(Number(data.total_amount ?? subtotal - raw));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo aplicar el descuento.");
    } finally {
      setLoading(null);
    }
  }

  async function confirmInvoice() {
    if (!editable) return;
    if (!window.confirm(`¿Confirmar facturación de la orden ${orderNumber}? Esta acción no se puede deshacer.`)) {
      return;
    }
    setError(null);
    setLoading("invoice");
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "invoiced" })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "No se pudo facturar la orden.");
      }
      router.push(`/dashboard/orders/assigned/${orderId}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo facturar la orden.");
      setLoading(null);
    }
  }

  /** Total que ve el usuario en vivo (no aún persistido) cuando solo cambió el input de descuento. */
  const previewDiscount = (() => {
    const raw = discountInput.trim() === "" ? 0 : Number(discountInput);
    if (!Number.isFinite(raw) || raw < 0) return appliedDiscount;
    return Math.min(subtotal, raw);
  })();
  const previewTotal = Math.max(0, subtotal - previewDiscount);
  const discountDirty = Math.abs(previewDiscount - appliedDiscount) > 0.005;

  return (
    <>
      <section className="order-detail-card order-detail-card--stretch order-invoice-section">
        <div className="order-invoice-section__head">
          <div>
            <h2 className="order-invoice-section__title">
              <span className="material-symbols-outlined" aria-hidden>
                checklist
              </span>
              Servicios de la orden
            </h2>
            <p className="order-invoice-section__copy">
              Servicios pactados durante la creación de la orden. No se pueden editar desde aquí.
            </p>
          </div>
          <span className="order-detail-muted">{services.length} línea(s)</span>
        </div>
        <div className="order-line-table-wrap">
          <table className="order-line-table">
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Estado</th>
                <th style={{ textAlign: "right" }}>Precio</th>
              </tr>
            </thead>
            <tbody>
              {services.length === 0 ? (
                <tr>
                  <td colSpan={3} className="order-detail-muted">
                    No hay líneas de servicio cargadas.
                  </td>
                </tr>
              ) : (
                services.map((service) => (
                  <tr key={service.id}>
                    <td>
                      <span className="order-line-name">{service.name}</span>
                    </td>
                    <td>
                      <span className={`status ${service.statusCode}`}>{service.statusLabel}</span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>${service.price.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="order-detail-card order-detail-card--stretch order-invoice-section">
        <div className="order-invoice-section__head">
          <div>
            <h2 className="order-invoice-section__title">
              <span className="material-symbols-outlined" aria-hidden>
                inventory_2
              </span>
              Productos consumidos
            </h2>
            <p className="order-invoice-section__copy">
              Añade los productos del inventario que se usaron en el servicio. El stock se actualiza al instante.
            </p>
          </div>
          <span className="order-detail-muted">{products.length} producto(s)</span>
        </div>

        {editable ? (
          <div className="order-invoice-picker">
            <label className="order-invoice-picker__field order-invoice-picker__field--grow">
              <span className="order-invoice-picker__label">Buscar producto</span>
              <input
                className="input"
                type="search"
                placeholder="Nombre, SKU o categoría"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="input"
                value={pickerItemId}
                onChange={(e) => onPickItem(e.target.value)}
                style={{ marginTop: 6 }}
              >
                <option value="">
                  {filteredInventory.length === 0
                    ? "Sin productos disponibles"
                    : "Selecciona un producto"}
                </option>
                {filteredInventory.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · ${item.unit_cost.toFixed(2)}
                  </option>
                ))}
              </select>
              {pickerItemId ? (
                <span className="order-products-picker__stock">
                  <span className="material-symbols-outlined" aria-hidden>
                    inventory_2
                  </span>
                  Stock disponible:{" "}
                  <strong>
                    {(() => {
                      const item = filteredInventory.find((i) => i.id === pickerItemId);
                      return item ? `${item.available} ud` : "—";
                    })()}
                  </strong>
                </span>
              ) : null}
            </label>
            <label className="order-invoice-picker__field">
              <span className="order-invoice-picker__label">Cantidad</span>
              <input
                className="input"
                type="number"
                min={1}
                step={1}
                value={pickerQuantity}
                onChange={(e) => setPickerQuantity(Number(e.target.value))}
              />
            </label>
            <label className="order-invoice-picker__field">
              <span className="order-invoice-picker__label">Precio unitario</span>
              <input
                className="input order-products-picker__price"
                type="text"
                inputMode="decimal"
                value={pickerPrice ? `$${pickerPrice}` : "—"}
                readOnly
                tabIndex={-1}
                aria-readonly="true"
              />
            </label>
            <button
              type="button"
              className="button order-invoice-picker__action"
              onClick={addProduct}
              disabled={!pickerItemId || loading === "add"}
            >
              {loading === "add" ? "Añadiendo…" : "Añadir"}
            </button>
          </div>
        ) : null}

        <div className="order-line-table-wrap">
          <table className="order-line-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th style={{ textAlign: "right" }}>Cantidad</th>
                <th style={{ textAlign: "right" }}>Precio</th>
                <th style={{ textAlign: "right" }}>Subtotal</th>
                {editable ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={editable ? 6 : 5} className="order-detail-muted">
                    Sin productos añadidos a esta orden.
                  </td>
                </tr>
              ) : (
                products.map((line) => (
                  <tr key={line.id}>
                    <td>
                      <span className="order-line-name">{line.item_name}</span>
                    </td>
                    <td className="order-detail-muted">{line.item_sku}</td>
                    <td style={{ textAlign: "right" }}>{line.quantity}</td>
                    <td style={{ textAlign: "right" }}>${line.unit_price.toFixed(2)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>
                      ${(line.quantity * line.unit_price).toFixed(2)}
                    </td>
                    {editable ? (
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="order-invoice-remove"
                          onClick={() => removeProduct(line.id)}
                          disabled={loading === `remove:${line.id}`}
                          aria-label={`Quitar ${line.item_name}`}
                        >
                          ×
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="order-detail-card order-detail-card--stretch order-invoice-summary">
        <h2 className="order-invoice-section__title">
          <span className="material-symbols-outlined" aria-hidden>
            payments
          </span>
          Resumen y facturación
        </h2>

        <div className="order-invoice-summary__grid">
          <div className="order-invoice-summary__rows">
            <div className="order-invoice-summary__row">
              <span>Servicios ({services.length})</span>
              <strong>${servicesTotal.toFixed(2)}</strong>
            </div>
            <div className="order-invoice-summary__row">
              <span>
                Productos ({products.reduce((acc, line) => acc + line.quantity, 0)} ud)
              </span>
              <strong>${productsTotal.toFixed(2)}</strong>
            </div>
            <div className="order-invoice-summary__row order-invoice-summary__row--subtotal">
              <span>Subtotal</span>
              <strong>${subtotal.toFixed(2)}</strong>
            </div>
            <div className="order-invoice-summary__row order-invoice-summary__row--discount">
              <span>Descuento aplicado</span>
              <strong>− ${previewDiscount.toFixed(2)}</strong>
            </div>
            <div className="order-invoice-summary__row order-invoice-summary__row--total">
              <span>Total a facturar</span>
              <strong>${previewTotal.toFixed(2)}</strong>
            </div>
          </div>

          <div className="order-invoice-summary__discount">
            <label className="order-invoice-summary__discount-label">
              <span className="material-symbols-outlined" aria-hidden>
                local_offer
              </span>
              Aplicar descuento
            </label>
            <div className="order-invoice-summary__discount-input">
              <span className="order-invoice-summary__discount-prefix">$</span>
              <input
                className="input"
                type="number"
                min={0}
                step="0.01"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder="0.00"
                disabled={!editable}
              />
            </div>
            <p className="order-invoice-summary__discount-hint">
              {appliedDiscount > 0
                ? `Descuento actual: $${appliedDiscount.toFixed(2)}. Total guardado: $${total.toFixed(2)}.`
                : "Sin descuento aplicado. Ingresa un valor y pulsa «Aplicar»."}
            </p>
            <button
              type="button"
              className="button secondary order-invoice-summary__apply"
              onClick={applyDiscount}
              disabled={!editable || !discountDirty || loading === "discount"}
            >
              {loading === "discount" ? "Aplicando…" : "Aplicar descuento"}
            </button>
          </div>
        </div>

        {error ? <p className="order-invoice-error">{error}</p> : null}

        {editable ? (
          <div className="order-invoice-summary__actions">
            <button
              type="button"
              className="button"
              onClick={confirmInvoice}
              disabled={loading === "invoice" || status !== "pending_invoice"}
              title={
                status !== "pending_invoice"
                  ? "La orden debe estar en estado «Por facturar» para confirmar."
                  : undefined
              }
            >
              {loading === "invoice" ? "Facturando…" : "Confirmar facturación"}
            </button>
            <span className="order-invoice-summary__actions-hint">
              {status === "pending_invoice"
                ? "Al confirmar, la orden pasará a «Facturada» y no podrá editarse."
                : `Estado actual: ${status}. La facturación solo está disponible para órdenes por facturar.`}
            </span>
          </div>
        ) : (
          <p className="order-invoice-locked">
            Esta orden ya fue facturada o cancelada. No se pueden modificar productos ni descuentos.
          </p>
        )}
      </section>
    </>
  );
}
