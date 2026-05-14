"use client";

import { useCallback, useEffect, useId, useState } from "react";

type Props = {
  photoUrl: string | null;
  plate: string;
  vin?: string | null;
  vehicleTitle: string;
};

export function ClientVehiclePhotoTrigger({ photoUrl, plate, vin, vehicleTitle }: Props) {
  const [open, setOpen] = useState(false);
  const dialogTitleId = useId();
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

  return (
    <>
      <div className="client-profile-vehicle-meta">
        <span className="client-profile-vehicle-plate-text">
          Matrícula {plate}
          {vin ? ` • VIN ${vin}` : ""}
        </span>
        {photoUrl ? (
          <button
            type="button"
            className="button secondary button-compact client-profile-vehicle-photo-btn"
            onClick={() => setOpen(true)}
          >
            Ver auto
          </button>
        ) : null}
      </div>

      {open && photoUrl ? (
        <div className="vehicle-photo-modal-overlay" role="presentation" onClick={close}>
          <div
            className="vehicle-photo-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vehicle-photo-modal-toolbar">
              <p className="vehicle-photo-modal-title" id={dialogTitleId}>
                {vehicleTitle} · {plate}
              </p>
              <button type="button" className="button secondary button-compact" onClick={close}>
                Cerrar
              </button>
            </div>
            <div className="vehicle-photo-modal-frame">
              <img
                src={photoUrl}
                alt={`Foto de registro del vehículo ${vehicleTitle}`}
                className="vehicle-photo-modal-img"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
