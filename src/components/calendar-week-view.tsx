"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppointmentSideDrawer } from "@/components/appointment-side-drawer";
import { APP_DISPLAY_TIME_ZONE } from "@/lib/app-timezone";
import type { Appointment } from "@/lib/types";

const CAL_LOCALE_OPTS: Intl.DateTimeFormatOptions = { timeZone: APP_DISPLAY_TIME_ZONE };

const START_HOUR = 7;
const END_HOUR = 21;
const HOUR_HEIGHT = 44;
const HOURS = END_HOUR - START_HOUR;
const GRID_HEIGHT = HOURS * HOUR_HEIGHT;

function maxDate(...xs: Date[]) {
  return new Date(Math.max(...xs.map((d) => d.getTime())));
}

function minDate(...xs: Date[]) {
  return new Date(Math.min(...xs.map((d) => d.getTime())));
}

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

/** Segment visible en un día de columna (recorte por día y franja horaria). */
function segmentForDay(apt: Appointment, day: Date): { top: number; height: number } | null {
  const start = new Date(apt.starts_at);
  const end = new Date(apt.ends_at);
  const col0 = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
  const col1 = addDays(col0, 1);
  const win0 = new Date(col0);
  win0.setHours(START_HOUR, 0, 0, 0);
  const win1 = new Date(col0);
  win1.setHours(END_HOUR, 0, 0, 0);

  const s0 = maxDate(start, col0);
  const e0 = minDate(end, col1);
  if (!(e0 > s0)) return null;
  const s1 = maxDate(s0, win0);
  const e1 = minDate(e0, win1);
  if (!(e1 > s1)) return null;

  const mins = (d: Date) => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
  const t0 = mins(s1) - START_HOUR * 60;
  const t1 = mins(e1) - START_HOUR * 60;
  const top = (t0 / 60) * HOUR_HEIGHT;
  const height = Math.max(((t1 - t0) / 60) * HOUR_HEIGHT, 20);
  return { top, height };
}

function formatHourLabel(h: number): string {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return d.toLocaleTimeString("es", { hour: "numeric", minute: "2-digit", ...CAL_LOCALE_OPTS });
}

function formatRangeTitle(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const y = weekStart.getFullYear() !== weekEnd.getFullYear();
  const startStr = weekStart.toLocaleDateString("es", { ...opts, year: y ? "numeric" : undefined });
  const endStr = weekEnd.toLocaleDateString("es", { ...opts, year: "numeric" });
  return `${startStr} – ${endStr}`;
}

function formatEventTime(startsAt: string, endsAt: string): string {
  const a = new Date(startsAt);
  const b = new Date(endsAt);
  const t: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", ...CAL_LOCALE_OPTS };
  return `${a.toLocaleTimeString("es", t)} – ${b.toLocaleTimeString("es", t)}`;
}

export function CalendarWeekView() {
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tick, setTick] = useState(0);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  const weekEndExclusive = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const start = weekStart.toISOString();
    const end = weekEndExclusive.toISOString();
    fetch(`/api/appointments?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
      .then((res) => {
        if (!res.ok) throw new Error("fetch");
        return res.json();
      })
      .then((data) => setAppointments(Array.isArray(data) ? data : []))
      .catch(() => setError("No se pudieron cargar las citas."))
      .finally(() => setLoading(false));
  }, [weekStart, weekEndExclusive]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return appointments;
    return appointments.filter(
      (a) =>
        a.work_order_id.toLowerCase().includes(q) ||
        (a.bay ?? "").toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
    );
  }, [appointments, search]);

  const goToday = () => setWeekStart(startOfWeekMonday(new Date()));
  const goPrev = () => setWeekStart((ws) => addDays(ws, -7));
  const goNext = () => setWeekStart((ws) => addDays(ws, 7));

  const nowLineTop = useMemo(() => {
    const now = new Date();
    if (now < weekStart || now >= weekEndExclusive) return null;
    const mins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    const t0 = mins - START_HOUR * 60;
    if (t0 < 0 || t0 > HOURS * 60) return null;
    return (t0 / 60) * HOUR_HEIGHT;
  }, [weekStart, weekEndExclusive, tick]);

  const hours = useMemo(() => Array.from({ length: HOURS }, (_, i) => START_HOUR + i), []);

  return (
    <div className="gc-calendar-layout">
    <div className="gc-calendar">
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
            placeholder="Buscar por orden, bahía…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar citas"
          />
        </div>
      </div>

      {loading ? <p className="gc-calendar__status">Cargando agenda…</p> : null}
      {error ? <p className="gc-calendar__status gc-calendar__status--error">{error}</p> : null}

      <div className="gc-calendar__frame">
        <div className="gc-calendar__scroll custom-scrollbar">
          <div className="gc-calendar__scroll-sizer">
            <div className="gc-calendar__header-row">
              <div className="gc-calendar__gutter-corner" aria-hidden />
              {weekDays.map((d) => {
                const today = isToday(d);
                return (
                  <div key={d.getTime()} className={`gc-calendar__day-head${today ? " gc-calendar__day-head--today" : ""}`}>
                    <span className="gc-calendar__day-head-dow">
                      {d.toLocaleDateString("es", { weekday: "short" }).replace(".", "")}
                    </span>
                    <span className="gc-calendar__day-head-num">{d.getDate()}</span>
                  </div>
                );
              })}
            </div>

            <div className="gc-calendar__grid" style={{ minHeight: GRID_HEIGHT }}>
            <div className="gc-calendar__time-col">
              {hours.map((h) => (
                <div key={h} className="gc-calendar__time-slot" style={{ height: HOUR_HEIGHT }}>
                  <span>{formatHourLabel(h)}</span>
                </div>
              ))}
            </div>

            {weekDays.map((day) => {
              const today = isToday(day);
              return (
                <div
                  key={day.getTime()}
                  className={`gc-calendar__day-col${today ? " gc-calendar__day-col--today" : ""}`}
                  style={{ minHeight: GRID_HEIGHT }}
                >
                  <div className="gc-calendar__day-lines" aria-hidden>
                    {hours.map((h) => (
                      <div key={h} className="gc-calendar__hour-line" style={{ height: HOUR_HEIGHT }} />
                    ))}
                  </div>

                  {today && nowLineTop !== null ? (
                    <div className="gc-calendar__now-line" style={{ top: nowLineTop }}>
                      <span className="gc-calendar__now-dot" />
                    </div>
                  ) : null}

                  <div className="gc-calendar__events">
                    {filtered.flatMap((apt) => {
                      const seg = segmentForDay(apt, day);
                      if (!seg) return [];
                      const shortId = apt.work_order_id.slice(0, 8);
                      let toneHash = 0;
                      for (let i = 0; i < apt.id.length; i += 1) toneHash += apt.id.charCodeAt(i);
                      const tone = toneHash % 5;
                      return [
                        <button
                          key={`${apt.id}-${day.getTime()}`}
                          type="button"
                          className={`gc-calendar__event gc-calendar__event--tone-${tone}`}
                          style={{ top: seg.top, height: seg.height }}
                          onClick={() => setSelectedAppointmentId(apt.id)}
                        >
                          <span className="gc-calendar__event-time">{formatEventTime(apt.starts_at, apt.ends_at)}</span>
                          <span className="gc-calendar__event-title">Orden {shortId}…</span>
                          {apt.bay ? <span className="gc-calendar__event-meta">{apt.bay}</span> : null}
                        </button>
                      ];
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
    <AppointmentSideDrawer
      appointmentId={selectedAppointmentId}
      onClose={() => setSelectedAppointmentId(null)}
    />
    </div>
  );
}
