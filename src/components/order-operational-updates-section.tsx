"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { OrderImage, WorkOrderUpdate } from "@/lib/types";
import { ClientListPagination } from "@/components/client-list-pagination";
import { formatDateTime } from "@/lib/ui-labels";

type Props = {
  orderId: string;
  checkInAt: string | null;
  completedAt: string | null;
};

type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

const UPDATES_PAGE_SIZE = 10;
const IMAGES_PAGE_SIZE = 6;

export function OrderOperationalUpdatesSection({ orderId, checkInAt, completedAt }: Props) {
  const [updates, setUpdates] = useState<WorkOrderUpdate[]>([]);
  const [updatesTotal, setUpdatesTotal] = useState(0);
  const [updatesPage, setUpdatesPage] = useState(1);
  const [images, setImages] = useState<OrderImage[]>([]);
  const [imagesTotal, setImagesTotal] = useState(0);
  const [imagesPage, setImagesPage] = useState(1);
  const [message, setMessage] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (overrideUpdatesPage?: number, overrideImagesPage?: number) => {
      const uP = overrideUpdatesPage ?? updatesPage;
      const iP = overrideImagesPage ?? imagesPage;
      const [updateRes, imageRes] = await Promise.all([
        fetch(`/api/orders/${orderId}/updates?page=${uP}&pageSize=${UPDATES_PAGE_SIZE}`),
        fetch(`/api/orders/${orderId}/images?page=${iP}&pageSize=${IMAGES_PAGE_SIZE}`)
      ]);
      const u = (await updateRes.json()) as Paged<WorkOrderUpdate>;
      const i = (await imageRes.json()) as Paged<OrderImage>;
      setUpdates(u.items ?? []);
      setUpdatesTotal(typeof u.total === "number" ? u.total : 0);
      setImages(i.items ?? []);
      setImagesTotal(typeof i.total === "number" ? i.total : 0);
    },
    [orderId, updatesPage, imagesPage]
  );

  useEffect(() => {
    refresh().catch(() => setError("No se pudieron cargar las actualizaciones."));
  }, [refresh]);

  async function submitUpdate(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setStatusLoading(true);
    setError(null);
    const response = await fetch(`/api/orders/${orderId}/updates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });
    if (!response.ok) {
      setError("No se pudo publicar la nota.");
      setStatusLoading(false);
      return;
    }
    setMessage("");
    setUpdatesPage(1);
    await refresh(1);
    setStatusLoading(false);
  }

  async function handleFileChange(file: File | null) {
    if (!file) return;
    const base64 = await fileToBase64(file);
    const response = await fetch(`/api/orders/${orderId}/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64_data: base64, caption: file.name })
    });
    if (!response.ok) {
      setError("No se pudo subir la imagen.");
      return;
    }
    setImagesPage(1);
    await refresh(undefined, 1);
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Actualizaciones</h3>

      {checkInAt ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600 }}>Inicio de ejecución</div>
          <div style={{ color: "#b9accf", fontSize: 14 }}>
            Registrado al pulsar «Iniciar ejecución»: {formatDateTime(checkInAt)}
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 12, color: "#b9accf", fontSize: 14 }}>
          Aún no se ha iniciado la ejecución en el sistema.
        </div>
      )}

      {completedAt ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600 }}>Fin de ejecución</div>
          <div style={{ color: "#b9accf", fontSize: 14 }}>{formatDateTime(completedAt)}</div>
        </div>
      ) : null}

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Notas del equipo</div>
        {updatesTotal === 0 ? (
          <p style={{ color: "#b9accf", margin: 0 }}>Aún no hay notas del equipo.</p>
        ) : (
          <>
            {updates.map((update) => (
              <div key={update.id} style={{ marginBottom: 12 }}>
                <div>{update.message}</div>
                <div style={{ color: "#b9accf", fontSize: 12 }}>{formatDateTime(update.created_at)}</div>
              </div>
            ))}
            {updates.length === 0 && updatesTotal > 0 ? (
              <p style={{ color: "#b9accf", fontSize: 14 }}>No hay notas en esta página.</p>
            ) : null}
            <ClientListPagination
              page={updatesPage}
              pageSize={UPDATES_PAGE_SIZE}
              total={updatesTotal}
              onPageChange={setUpdatesPage}
              ariaLabel="Paginación de notas"
            />
          </>
        )}
      </div>

      <form onSubmit={submitUpdate}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Añadir nota</label>
        <textarea
          className="textarea"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Actualizaciones o notas sobre el estado del vehículo…"
          rows={4}
        />
        <button className="button" type="submit" disabled={statusLoading} style={{ marginTop: 8 }}>
          {statusLoading ? "Publicando…" : "Publicar nota"}
        </button>
      </form>

      <label style={{ display: "block", marginTop: 16 }}>
        <span style={{ fontWeight: 600 }}>Subir foto</span>
        <input className="input" type="file" accept="image/*" onChange={(e) => void handleFileChange(e.target.files?.[0] ?? null)} />
      </label>

      {imagesTotal > 0 ? (
        <>
          <h4 style={{ marginTop: 20 }}>Imágenes subidas</h4>
          {images.map((image) => (
            <details key={image.id} style={{ marginBottom: 8 }}>
              <summary>{image.caption ?? "Imagen capturada"}</summary>
              <img src={image.base64_data} alt={image.caption ?? "Imagen capturada"} style={{ width: "100%", borderRadius: 8 }} />
            </details>
          ))}
          {images.length === 0 ? (
            <p style={{ color: "#b9accf", fontSize: 14 }}>No hay imágenes en esta página.</p>
          ) : null}
          <ClientListPagination
            page={imagesPage}
            pageSize={IMAGES_PAGE_SIZE}
            total={imagesTotal}
            onPageChange={setImagesPage}
            ariaLabel="Paginación de imágenes"
          />
        </>
      ) : null}

      {error ? <p style={{ color: "#ff8f9c", marginTop: 12 }}>{error}</p> : null}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
