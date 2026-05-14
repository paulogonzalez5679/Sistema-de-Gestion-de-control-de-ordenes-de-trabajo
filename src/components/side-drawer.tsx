"use client";

import { useEffect, type ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function SideDrawer({ open, title, onClose, children, footer }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button type="button" className="app-drawer-backdrop" onClick={onClose} aria-label="Cerrar panel" />
      <aside
        className="app-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-drawer-title"
      >
        <header className="app-drawer__header">
          <h2 id="app-drawer-title" className="app-drawer__title">
            {title}
          </h2>
          <button type="button" className="app-drawer__close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>
        <div className="app-drawer__body custom-scrollbar">{children}</div>
        {footer ? <footer className="app-drawer__footer">{footer}</footer> : null}
      </aside>
    </>
  );
}
