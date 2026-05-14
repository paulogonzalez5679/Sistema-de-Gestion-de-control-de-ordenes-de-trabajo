"use client";

import { useCallback, useEffect, useId, useState } from "react";

export type ResponsiveSelectOption = { value: string; label: string };

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: ResponsiveSelectOption[];
  /** Texto de la opción vacía (value=\"\") en el select nativo. */
  placeholderOptionLabel: string;
  /** Título del modal en móvil / tablet. */
  modalTitle: string;
  required?: boolean;
  disabled?: boolean;
  /** Si es true y el campo no es obligatorio, el modal incluye la opción de dejar vacío. */
  allowClear?: boolean;
  /** Texto del botón que vacía la selección en el modal (solo con `allowClear`). */
  allowClearLabel?: string;
  /** Mensaje en el modal cuando la lista de opciones está vacía (p. ej. filtro sin coincidencias). */
  emptyOptionsMessage?: string;
  /** Texto del disparador cuando el valor está vacío (sustituye `placeholderOptionLabel` solo en el botón). */
  emptyValueTriggerLabel?: string;
};

export function ResponsiveSelect({
  id: idProp,
  value,
  onChange,
  options,
  placeholderOptionLabel,
  modalTitle,
  required,
  disabled,
  allowClear,
  allowClearLabel,
  emptyOptionsMessage,
  emptyValueTriggerLabel
}: Props) {
  const uid = useId();
  const selectId = idProp ?? `responsive-select-${uid}`;
  const [open, setOpen] = useState(false);
  const titleId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  const selected = options.find((o) => o.value === value);
  const triggerLabel =
    selected?.label ??
    (value === "" ? (emptyValueTriggerLabel ?? placeholderOptionLabel) : placeholderOptionLabel);

  function pick(next: string) {
    onChange(next);
    close();
  }

  return (
    <div className="responsive-select">
      <select
        id={selectId}
        className="input responsive-select__native"
        value={value}
        disabled={disabled}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled={Boolean(required)}>
          {placeholderOptionLabel}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="input responsive-select__trigger"
        disabled={disabled}
        aria-label={modalTitle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${selectId}-listbox` : undefined}
        onClick={() => {
          if (!disabled) setOpen(true);
        }}
      >
        <span className="responsive-select__trigger-text">{triggerLabel}</span>
        <span className="material-symbols-outlined responsive-select__chevron" aria-hidden>
          expand_more
        </span>
      </button>

      {open ? (
        <div className="responsive-select-modal-overlay" role="presentation" onClick={close}>
          <div
            className="responsive-select-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="responsive-select-modal-head">
              <p className="responsive-select-modal-title" id={titleId}>
                {modalTitle}
              </p>
              <button type="button" className="button secondary button-compact" onClick={close}>
                Cerrar
              </button>
            </div>
            <ul id={`${selectId}-listbox`} className="responsive-select-modal-list" role="listbox">
              {allowClear && !required ? (
                <li key="__clear" role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === ""}
                    className={`responsive-select-modal-option responsive-select-modal-option--muted${
                      value === "" ? " is-selected" : ""
                    }`}
                    onClick={() => pick("")}
                  >
                    {allowClearLabel ?? "Quitar selección"}
                  </button>
                </li>
              ) : null}
              {options.map((o) => (
                <li key={o.value} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={o.value === value}
                    className={`responsive-select-modal-option${o.value === value ? " is-selected" : ""}`}
                    onClick={() => pick(o.value)}
                  >
                    {o.label}
                  </button>
                </li>
              ))}
              {options.length === 0 ? (
                <li className="responsive-select-modal-empty">
                  {emptyOptionsMessage ?? "No hay opciones disponibles."}
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
