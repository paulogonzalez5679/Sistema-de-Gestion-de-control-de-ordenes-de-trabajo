/** Spinner compacto para botones y mensajes de carga en línea. */
export function InlineSpinner({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <span
      className={`inline-spinner${size === "sm" ? " inline-spinner--sm" : ""}`}
      aria-hidden
    />
  );
}
