"use client";

import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode
} from "react";

type Props = {
  /** Texto accesible del botón disparador (p. ej. "Acciones de la orden 42") */
  ariaLabel: string;
  children: ReactNode;
  align?: "start" | "end";
};

/**
 * Menú contextual tipo kebab (⋮). Posicionamiento fijo, cierre fuera / Escape, táctil.
 */
export function ActionDropdown({ ariaLabel, children, align = "end" }: Props) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 220 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const menuWidth = Math.min(280, Math.max(200, window.innerWidth - 16));
    const left =
      align === "end"
        ? Math.max(8, r.right - menuWidth)
        : Math.min(Math.max(8, r.left), window.innerWidth - menuWidth - 8);
    const top = Math.min(r.bottom + 6, window.innerHeight - 8);
    setCoords({ top, left, width: menuWidth });
  }, [align]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => menuRef.current?.querySelector<HTMLElement>("a,button")?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const portal =
    open && typeof document !== "undefined"
      ? createPortal(
          <>
            <div
              ref={menuRef}
              id={listId}
              className="action-dropdown__menu"
              role="menu"
              style={{
                position: "fixed",
                top: coords.top,
                left: coords.left,
                width: coords.width,
                maxHeight: `min(70vh, ${window.innerHeight - coords.top - 12}px)`,
                zIndex: 10040
              }}
            >
              {children}
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <div className="action-dropdown">
      <button
        ref={triggerRef}
        type="button"
        className="action-dropdown__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) queueMicrotask(() => updatePosition());
        }}
      >
        <span className="material-symbols-outlined" aria-hidden>
          more_vert
        </span>
      </button>
      {portal}
    </div>
  );
}
