"use client";

import { InlineSpinner } from "@/components/inline-spinner";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { Client } from "@/lib/types";

type Props = {
  client: Client;
};

export function EditClientForm({ client }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState(client.full_name);
  const [phone, setPhone] = useState(client.phone);
  const [email, setEmail] = useState(client.email ?? "");
  const [cedula, setCedula] = useState(client.cedula ?? "");
  const [notes, setNotes] = useState(client.notes ?? "");
  const [isVerified, setIsVerified] = useState(client.is_verified);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const name = fullName.trim();
    const ph = phone.trim();
    if (!name || !ph) {
      setError("Nombre completo y teléfono son obligatorios.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name,
          phone: ph,
          email: email.trim() === "" ? null : email.trim(),
          cedula: cedula.trim() === "" ? null : cedula.trim(),
          notes: notes.trim() === "" ? null : notes,
          is_verified: isVerified
        })
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : "No se pudo guardar.";
        throw new Error(msg);
      }
      router.push(`/dashboard/clients/${client.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Error al guardar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit} style={{ maxWidth: 560 }}>
      <label>
        Nombre completo *
        <input className="input" value={fullName} onChange={(ev) => setFullName(ev.target.value)} required autoComplete="name" />
      </label>
      <label>
        Teléfono *
        <input className="input" value={phone} onChange={(ev) => setPhone(ev.target.value)} required autoComplete="tel" />
      </label>
      <label>
        Correo
        <input className="input" type="email" value={email} onChange={(ev) => setEmail(ev.target.value)} autoComplete="email" />
      </label>
      <label>
        Cédula o RUC
        <input className="input" value={cedula} onChange={(ev) => setCedula(ev.target.value)} autoComplete="off" />
      </label>
      <label>
        Notas
        <textarea className="input" rows={4} value={notes} onChange={(ev) => setNotes(ev.target.value)} />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <input type="checkbox" checked={isVerified} onChange={(ev) => setIsVerified(ev.target.checked)} />
        <span>Cliente verificado</span>
      </label>

      {error ? <p style={{ color: "#ff8f9c", margin: 0 }}>{error}</p> : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button type="submit" className="button" disabled={loading}>
          <span className="btn-loading-inner">
            {loading ? <InlineSpinner size="sm" /> : null}
            {loading ? "Guardando…" : "Guardar cambios"}
          </span>
        </button>
        <Link className="button secondary" href={`/dashboard/clients/${client.id}`}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
