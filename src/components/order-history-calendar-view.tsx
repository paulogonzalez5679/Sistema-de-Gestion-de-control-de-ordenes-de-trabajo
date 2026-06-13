"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  OrderHistoryDrawer,
  type OrderHistoryDrawerState
} from "@/components/order-history-drawer";
import {
  APP_DISPLAY_TIME_ZONE,
  calendarDayKeyFromIso,
  calendarDayKeyFromLocalDate
} from "@/lib/app-timezone";
import { formatOrderStatus } from "@/lib/ui-labels";
import type { OrderHistoryEntry } from "@/modules/orders/order.service";

const CAL_LOCALE_OPTS: Intl.DateTimeFormatOptions = { timeZone: APP_DISPLAY_TIME_ZONE };
const HISTORY_GRID_HEIGHT = 320;

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = x.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function isToday(d: Date): boolean {
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

function formatRangeTitle(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const y = weekStart.getFullYear() !== weekEnd.getFullYear();
  const startStr = weekStart.toLocaleDateString("es", { ...opts, year: y ? "numeric" : undefined });
  const endStr = weekEnd.toLocaleDateString("es", { ...opts, year: "numeric" });
  return `${startStr} – ${endStr}`;
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    ...CAL_LOCALE_OPTS
  });
}

function formatHistoryTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", ...CAL_LOCALE_OPTS });
}

export function OrderHistoryCalendarView() {
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [orders, setOrders] = useState<OrderHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState<OrderHistoryDrawerState>({ mode: "closed" });

  const weekEndExclusive = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const start = weekStart.toISOString();
    const end = weekEndExclusive.toISOString();
    fetch(`/api/orders/history?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
      .then((res) => {
        if (!res.ok) throw new Error("fetch");
        return res.json();
      })
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setError("No se pudo cargar el historial de órdenes."))
      .finally(() => setLoading(false));
  }, [weekStart, weekEndExclusive]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.order_number.toLowerCase().includes(q) ||
        (o.client_name ?? "").toLowerCase().includes(q) ||
        o.vehicle_label.toLowerCase().includes(q) ||
        (o.assignee_name ?? "").toLowerCase().includes(q)
    );
  }, [orders, search]);

  const ordersByDay = useMemo(() => {
    const map = new Map<string, OrderHistoryEntry[]>();
    for (const order of filtered) {
      const key = calendarDayKeyFromIso(order.history_at);
      if (!key) continue;
      const bucket = map.get(key) ?? [];
      bucket.push(order);
      map.set(key, bucket);
    }
    for (const [, bucket] of map) {
      bucket.sort((a, b) => new Date(a.history_at).getTime() - new Date(b.history_at).getTime());
    }
    return map;
  }, [filtered]);

  const goToday = () => setWeekStart(startOfWeekMonday(new Date()));
  const goPrev = () => setWeekStart((ws) => addDays(ws, -7));
  const goNext = () => setWeekStart((ws) => addDays(ws, 7));

  function openDayDrawer(day: Date) {
    const dayKey = calendarDayKeyFromLocalDate(day);
    const dayOrders = ordersByDay.get(dayKey) ?? [];
    setDrawer({ mode: "day", dayLabel: formatDayLabel(day), orders: dayOrders });
  }

  function openOrderDrawer(orderId: string, day: Date) {
    const dayKey = calendarDayKeyFromLocalDate(day);
    const dayOrders = ordersByDay.get(dayKey) ?? [];
    setDrawer({ mode: "order", orderId, dayLabel: formatDayLabel(day), orders: dayOrders });
  }

  return (
    <div className="gc-calendar-layout">
      <div className="gc-calendar gc-calendar--history">
        <div className="gc-calendar__toolbar">
          <div className="gc-calendar__toolbar-left">
            <div className="gc-calendar__nav">
              <button type="button" className="gc-calendar__nav-btn" onClick={goPrev} aria-label="Semana anterior">
                ‹
              </button>
              <button type="button" className="gc-calendar__nav-btn" onClick={goToday}>
                Hoy
              </button>
              <button type="button" className="gc-calendar__nav-btn" onClick={goNext} aria-label="Semana siguiente">
                ›
              </button>
            </div>
            <h2 className="gc-calendar__title">{formatRangeTitle(weekStart)}</h2>
          </div>
          <div className="gc-calendar__toolbar-right">
            <input
              className="gc-calendar__search"
              type="search"
              placeholder="Buscar por orden, cliente, vehículo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar en historial"
            />
          </div>
        </div>

        <p className="order-history-calendar__hint">
          Órdenes en estado <strong>por facturar</strong> o <strong>facturado</strong>. Pulsa un día para ver el
          listado o una orden para abrir el detalle.
        </p>

        {loading ? <p className="gc-calendar__status">Cargando historial…</p> : null}
        {error ? <p className="gc-calendar__status gc-calendar__status--error">{error}</p> : null}

        <div className="gc-calendar__frame">
          <div className="gc-calendar__scroll custom-scrollbar">
            <div className="gc-calendar__scroll-sizer">
              <div className="gc-calendar__header-row gc-calendar__header-row--history">
                {weekDays.map((d) => {
                  const today = isToday(d);
                  const dayKey = calendarDayKeyFromLocalDate(d);
                  const count = ordersByDay.get(dayKey)?.length ?? 0;
                  return (
                    <button
                      key={d.getTime()}
                      type="button"
                      className={`gc-calendar__day-head gc-calendar__day-head--clickable${today ? " gc-calendar__day-head--today" : ""}`}
                      onClick={() => openDayDrawer(d)}
                    >
                      <span className="gc-calendar__day-head-dow">
                        {d.toLocaleDateString("es", { weekday: "short" }).replace(".", "")}
                      </span>
                      <span className="gc-calendar__day-head-num">{d.getDate()}</span>
                      {count > 0 ? <span className="gc-calendar__day-head-count">{count}</span> : null}
                    </button>
                  );
                })}
              </div>

              <div className="gc-calendar__history-grid" style={{ minHeight: HISTORY_GRID_HEIGHT }}>
                {weekDays.map((day) => {
                  const today = isToday(day);
                  const dayKey = calendarDayKeyFromLocalDate(day);
                  const dayOrders = ordersByDay.get(dayKey) ?? [];
                  return (
                    <div
                      key={day.getTime()}
                      className={`gc-calendar__day-col gc-calendar__day-col--history${today ? " gc-calendar__day-col--today" : ""}`}
                      style={{ minHeight: HISTORY_GRID_HEIGHT }}
                    >
                      <button
                        type="button"
                        className="gc-calendar__history-day-hit"
                        onClick={() => openDayDrawer(day)}
                        aria-label={`Ver órdenes del ${formatDayLabel(day)}`}
                      />
                      <div className="gc-calendar__history-events">
                        {dayOrders.map((order, index) => {
                          const tone = index % 5;
                          return (
                            <button
                              key={order.id}
                              type="button"
                              className={`gc-calendar__event gc-calendar__event--history gc-calendar__event--tone-${tone}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                openOrderDrawer(order.id, day);
                              }}
                            >
                              <span className="gc-calendar__event-time">{formatHistoryTime(order.history_at)}</span>
                              <span className="gc-calendar__event-title">{order.order_number}</span>
                              <span className="gc-calendar__event-meta">
                                {formatOrderStatus(order.status)} · {order.client_name ?? "Cliente"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <OrderHistoryDrawer
        state={drawer}
        onClose={() => setDrawer({ mode: "closed" })}
        onOpenOrder={(orderId) => {
          if (drawer.mode === "day") {
            setDrawer({ mode: "order", orderId, dayLabel: drawer.dayLabel, orders: drawer.orders });
          }
        }}
        onBackToDay={() => {
          if (drawer.mode === "order") {
            setDrawer({ mode: "day", dayLabel: drawer.dayLabel, orders: drawer.orders });
          }
        }}
      />
    </div>
  );
}
