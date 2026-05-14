import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Ancho máximo del contenido (clases CSS: narrow, wide, full) */
  maxWidth?: "narrow" | "wide" | "full";
  className?: string;
};

/**
 * Contenedor de página con padding responsive y ancho máximo escalable.
 */
export function AdaptiveLayout({ children, maxWidth = "wide", className = "" }: Props) {
  const mw = maxWidth === "narrow" ? "app-page app-page--narrow" : maxWidth === "full" ? "app-page app-page--full" : "app-page app-page--wide";
  return <div className={`${mw} ${className}`.trim()}>{children}</div>;
}
