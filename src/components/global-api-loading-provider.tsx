"use client";

import { useEffect, useRef, useState } from "react";
import { shouldInstrumentBrowserFetch } from "@/lib/fetch-instrumentation";

const NATIVE_FETCH_KEY = "__luxeDetailNativeFetch";

type WindowWithNative = Window & { [NATIVE_FETCH_KEY]?: typeof fetch };

export function GlobalApiLoadingProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState(0);
  const depthRef = useRef(0);

  useEffect(() => {
    const w = window as WindowWithNative;
    if (w[NATIVE_FETCH_KEY]) {
      return;
    }

    const nativeFetch = window.fetch.bind(window);
    w[NATIVE_FETCH_KEY] = nativeFetch;

    window.fetch = function instrumentedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      if (!shouldInstrumentBrowserFetch(input, init)) {
        return nativeFetch(input, init);
      }
      depthRef.current += 1;
      setPending(depthRef.current);
      return nativeFetch(input, init).finally(() => {
        depthRef.current = Math.max(0, depthRef.current - 1);
        setPending(depthRef.current);
      });
    };

    return () => {
      window.fetch = nativeFetch;
      delete w[NATIVE_FETCH_KEY];
    };
  }, []);

  /* Misma envoltura siempre: si el overlay se inserta/retira según `pending`, React
   * desmonta `children` y efectos como OrderAuditBeacon vuelven a disparar fetch en bucle. */
  const idle = pending <= 0;

  return (
    <>
      <div
        className={`global-api-loading${idle ? " global-api-loading--idle" : ""}`}
        role="status"
        aria-live="polite"
        aria-busy={!idle}
        aria-hidden={idle}
        aria-label={idle ? undefined : "Cargando"}
      >
        <div className="global-api-loading__backdrop" aria-hidden />
        <div className="global-api-loading__panel">
          <span className="global-api-loading__spinner" aria-hidden />
          <span className="global-api-loading__label">Cargando…</span>
        </div>
      </div>
      {children}
    </>
  );
}
