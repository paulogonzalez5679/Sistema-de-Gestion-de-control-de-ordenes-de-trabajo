"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AppointmentEnrichedDetail } from "@/modules/orders/order.service";
import { formatDateTime, formatTimeOnly } from "@/lib/ui-labels";
import { SideDrawer } from "@/components/side-drawer";

type Props = {
  appointmentId: string | null;
  onClose: () => void;
};

export function AppointmentSideDrawer({ appointmentId, onClose }: Props) {
  const [data, setData] = useState<AppointmentEnrichedDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!appointmentId) {
      setData(null);
      setErr(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setData(null);
    fetch(`/api/appointments/${appointmentId}`)
      .then((r) => {
        if (r.status === 404) throw new Error("notfound");
        if (r.status === 403) throw new Error("forbidden");
        if (!r.ok) throw new Error("err");
        return r.json();
      })
      .then((json) => {
        if (!cancelled) setData(json as AppointmentEnrichedDetail);
      })
      .catch((e) => {
        if (!cancelled) {
          if (e instanceof Error && e.message === "forbidden") {
            setErr("No tienes permiso para ver esta cita.");
          } else if (e instanceof Error && e.message === "notfound") {
            setErr("Esta cita no existe o ya no está disponible.");
          } else {
            setErr("No se pudo cargar la cita.");
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  const open = Boolean(appointmentId);
  const apt = data?.appointment;

  return (
    <SideDrawer
      open={open}
      title="Detalle de cita"
      onClose={onClose}
      footer={
        apt ? (
          <div className="app-drawer__actions">
            <Link className="button" href={`/dashboard/orders/assigned/${apt.work_order_id}`}>
              Ir a la orden
            </Link>
          </div>
        ) : null
      }
    >
      {loading ? <p className="app-drawer__muted">Cargando…</p> : null}
      {err ? <p className="app-drawer__error">{err}</p> : null}
      {data && !loading ? (
        <>
          <div className="app-drawer__section">
            <p className="app-drawer__eyebrow">Cliente</p>
            <p className="app-drawer__strong">{data.client?.full_name ?? "—"}</p>
            {data.client?.phone ? <p className="app-drawer__muted">{data.client.phone}</p> : null}
          </div>

          <div className="app-drawer__section">
            <p className="app-drawer__eyebrow">Vehículo</p>
            <p className="app-drawer__strong">
              {[data.vehicle?.year, data.vehicle?.make, data.vehicle?.model].filter(Boolean).join(" ") || "—"}
            </p>
            {data.vehicle?.plate ? <p className="app-drawer__muted">Matrícula {data.vehicle.plate}</p> : null}
          </div>

          <div className="app-drawer__section app-drawer__timebox">
            <div className="app-drawer__timebox-date">
              <span className="app-drawer__timebox-month">
                {new Date(data.appointment.starts_at).toLocaleDateString("es", { month: "short" })}
              </span>
              <span className="app-drawer__timebox-day">
                {new Date(data.appointment.starts_at).getDate()}
              </span>
            </div>
            <div>
              <p className="app-drawer__strong">
                {formatDateTime(data.appointment.starts_at)} — {formatTimeOnly(data.appointment.ends_at)}
              </p>
              <p className="app-drawer__muted">Bahía: {data.appointment.bay?.trim() ? data.appointment.bay : "—"}</p>
            </div>
          </div>

          <div className="app-drawer__section">
            <p className="app-drawer__eyebrow">Servicios</p>
            {data.orderServices.length === 0 ? (
              <p className="app-drawer__muted">Sin líneas cargadas.</p>
            ) : (
              <ul className="app-drawer__list">
                {data.orderServices.map((s) => (
                  <li key={s.id}>
                    Servicio {String(s.service_id).slice(0, 8)}…
                    {"price" in s && s.price != null ? ` · $${Number(s.price).toFixed(2)}` : ""}
                  </li>
                ))}
              </ul>
            )}
            {data.order ? (
              <p className="app-drawer__total">Total estimado: ${Number(data.order.total_amount).toFixed(2)}</p>
            ) : null}
          </div>
        </>
      ) : null}
    </SideDrawer>
  );
}
