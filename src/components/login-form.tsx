"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";

function translateAuthMessage(msg: string): string {
  const m = msg.trim();
  const lower = m.toLowerCase();
  if (lower.includes("invalid login credentials")) return "Credenciales incorrectas. Revisa correo y contraseña.";
  if (lower.includes("email not confirmed")) return "Confirma tu correo antes de iniciar sesión.";
  if (lower.includes("too many requests")) return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
  return m;
}

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
    const supabase = createSupabaseBrowserClient();
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        const msg = signInError.message ?? "";
        const networkHint =
          /fetch|network|failed/i.test(msg) || signInError.name === "AuthRetryableFetchError"
            ? " Comprueba que la URL del proyecto en Supabase coincida con NEXT_PUBLIC_SUPABASE_URL (debe ser https://<ref>.supabase.co con las mismas claves)."
            : "";
        setError(translateAuthMessage(msg) + networkHint);
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isFetch =
        message.includes("fetch") || message.includes("Failed to fetch") || message.includes("ENOTFOUND");
      setError(
        isFetch
          ? "No se pudo conectar con Supabase. Verifica que NEXT_PUBLIC_SUPABASE_URL en .env coincida exactamente con la URL del proyecto y reinicia npm run dev."
          : translateAuthMessage(message)
      );
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>LuxeDetail AI</h1>
      <p style={{ color: "#b9accf" }}>Acceso de operador</p>
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
