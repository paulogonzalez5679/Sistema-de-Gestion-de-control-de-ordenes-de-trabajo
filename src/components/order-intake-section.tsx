"use client";

import { useEffect, useState } from "react";

type IntakePhoto = {
  filename: string;
  url: string;
  mimeType: string;
};

type IntakePayload = {
  intakeConditionNotes: string;
  photos: IntakePhoto[];
};

export function OrderIntakeSection({ orderId }: { orderId: string }) {
  const [data, setData] = useState<IntakePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/intake`);
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(typeof payload?.error === "string" ? payload.error : "No se pudo cargar el ingreso.");
        }
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar fotos de ingreso.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (loading) {
    return (
      <section className="order-detail-card order-detail-card--stretch">
        <h2 className="order-detail-card__title">Ingreso del vehículo</h2>
        <p className="order-detail-muted">Cargando registro de ingreso…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="order-detail-card order-detail-card--stretch">
        <h2 className="order-detail-card__title">Ingreso del vehículo</h2>
        <p className="order-detail-muted">{error}</p>
      </section>
    );
  }

  if (!data || (!data.intakeConditionNotes && data.photos.length === 0)) {
    return (
      <section className="order-detail-card order-detail-card--stretch">
        <h2 className="order-detail-card__title">Ingreso del vehículo</h2>
        <p className="order-detail-muted">Sin registro de ingreso para esta orden.</p>
      </section>
    );
  }

  return (
    <section className="order-detail-card order-detail-card--stretch">
      <div className="order-detail-card__head">
        <h2 className="order-detail-card__title" style={{ marginBottom: 0 }}>
          Ingreso del vehículo
        </h2>
        <span className="order-detail-muted">{data.photos.length} foto(s)</span>
      </div>
      {data.intakeConditionNotes ? (
        <p className="order-detail-notes" style={{ marginTop: 0 }}>
          {data.intakeConditionNotes}
        </p>
      ) : null}
      {data.photos.length > 0 ? (
        <div className="order-intake-gallery">
          {data.photos.map((photo) => (
            <a
              key={photo.filename}
              href={photo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="order-intake-gallery__item"
            >
              <img src={photo.url} alt={`Ingreso ${photo.filename}`} loading="lazy" />
            </a>
          ))}
        </div>
      ) : null}
    </section>
  );
}
