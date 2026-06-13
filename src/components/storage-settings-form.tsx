"use client";

import { FormEvent, useEffect, useState } from "react";

type StorageSummary = {
  settings: { mediaRoot: string | null };
  defaultDataDir: string;
  defaultMediaRoot: string;
  effectiveMediaRoot: string;
  settingsFile: string;
};

export function StorageSettingsForm() {
  const [summary, setSummary] = useState<StorageSummary | null>(null);
  const [mediaRootInput, setMediaRootInput] = useState("");
  const [useDefault, setUseDefault] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/settings/storage");
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(typeof payload?.error === "string" ? payload.error : "No se pudo cargar la configuración.");
        }
        if (!cancelled) {
          setSummary(payload);
          const custom = payload.settings?.mediaRoot?.trim();
          setUseDefault(!custom);
          setMediaRootInput(custom || payload.defaultMediaRoot || "");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar configuración.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/settings/storage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaRoot: useDefault ? null : mediaRootInput.trim()
        })
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "No se pudo guardar.");
      }
      setSummary(payload);
      setMessage("Configuración guardada. Las nuevas fotos usarán la ruta indicada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <p style={{ margin: 0, color: "#b9accf" }}>Cargando configuración de almacenamiento…</p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={(e) => void onSubmit(e)}>
      <h2 style={{ marginTop: 0 }}>Almacenamiento local de fotos</h2>
      <p style={{ color: "#b9accf", fontSize: "0.92rem", marginTop: 0 }}>
        Las fotos de ingreso de órdenes se guardan en el disco del PC del taller (no en Supabase). En el
        paquete Windows la carpeta predeterminada se crea junto al ejecutable.
      </p>

      {summary ? (
        <dl className="order-detail-dl" style={{ marginBottom: 18 }}>
          <div>
            <dt>Carpeta de datos del taller</dt>
            <dd style={{ wordBreak: "break-all" }}>{summary.defaultDataDir}</dd>
          </div>
          <div>
            <dt>Ruta efectiva actual</dt>
            <dd style={{ wordBreak: "break-all" }}>{summary.effectiveMediaRoot}</dd>
          </div>
          <div>
            <dt>Archivo de configuración</dt>
            <dd style={{ wordBreak: "break-all" }}>{summary.settingsFile}</dd>
          </div>
        </dl>
      ) : null}

      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 12 }}>
        <input
          type="radio"
          name="storageMode"
          checked={useDefault}
          onChange={() => setUseDefault(true)}
        />
        <span>
          Usar ruta predeterminada
          {summary ? (
            <span style={{ display: "block", color: "#b9accf", fontSize: "0.85rem" }}>
              {summary.defaultMediaRoot}
            </span>
          ) : null}
        </span>
      </label>

      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 12 }}>
        <input
          type="radio"
          name="storageMode"
          checked={!useDefault}
          onChange={() => setUseDefault(false)}
        />
        <span>Ruta personalizada (absoluta)</span>
      </label>

      {!useDefault ? (
        <label style={{ display: "block", marginBottom: 16 }}>
          Carpeta para fotos y archivos
          <input
            className="input"
            type="text"
            value={mediaRootInput}
            onChange={(e) => setMediaRootInput(e.target.value)}
            placeholder="Ej. D:\KenzoStudio\media o /Users/taller/KenzoStudio/media"
            required={!useDefault}
          />
        </label>
      ) : null}

      {message ? <p style={{ color: "#86efac", fontSize: "0.9rem" }}>{message}</p> : null}
      {error ? <p style={{ color: "#f87171", fontSize: "0.9rem" }}>{error}</p> : null}

      <button type="submit" className="button" disabled={saving}>
        {saving ? "Guardando…" : "Guardar configuración"}
      </button>
    </form>
  );
}
