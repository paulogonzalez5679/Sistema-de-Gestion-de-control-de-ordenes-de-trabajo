"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      let payload: { error?: string } = {};
      try {
        payload = (await response.json()) as { error?: string };
      } catch {
        payload = {};
      }

      if (!response.ok) {
        setError(payload.error ?? "No se pudo iniciar sesión.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(
        process.env.NODE_ENV === "development"
          ? "No se pudo conectar con el servidor. Verifica que la app esté en ejecución."
          : "No se pudo conectar con el servicio de autenticación. Inténtalo más tarde."
      );
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Kenzo Studio</h1>
      <p style={{ color: "#b9accf" }}>Bienvenido a Kenzo Studio</p>
      <label>
        Correo del operador
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label style={{ marginTop: 10 }}>
        Contraseña
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {error ? <p style={{ color: "#ff8f9c" }}>{error}</p> : null}
      <button className="button" type="submit" disabled={loading} style={{ marginTop: 14, width: "100%" }}>
        {loading ? "Iniciando sesión…" : "Entrar"}
      </button>
    </form>
  );
}
