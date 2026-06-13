"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { compressIntakePhoto } from "@/lib/intake-photo-client";

export const INTAKE_MIN_PHOTOS = 1;
export const INTAKE_MAX_PHOTOS = 5;

type Preview = {
  id: string;
  url: string;
  file: File;
};

export type OrderIntakePhotosFieldProps = {
  notes: string;
  onNotesChange: (value: string) => void;
  photos: File[];
  onPhotosChange: (files: File[]) => void;
  disabled?: boolean;
};

export function OrderIntakePhotosField({
  notes,
  onNotesChange,
  photos,
  onPhotosChange,
  disabled = false
}: OrderIntakePhotosFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const next: Preview[] = photos.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      url: URL.createObjectURL(file),
      file
    }));
    setPreviews(next);
    return () => {
      next.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [photos]);

  const addFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length || disabled) return;
      setLocalError(null);
      const incoming = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
      if (!incoming.length) {
        setLocalError("Seleccione archivos de imagen (JPEG, PNG o WebP).");
        return;
      }
      const remaining = INTAKE_MAX_PHOTOS - photos.length;
      if (remaining <= 0) {
        setLocalError(`Máximo ${INTAKE_MAX_PHOTOS} fotos de ingreso.`);
        return;
      }
      const slice = incoming.slice(0, remaining);
      setCompressing(true);
      try {
        const compressed: File[] = [];
        for (const file of slice) {
          compressed.push(await compressIntakePhoto(file));
        }
        onPhotosChange([...photos, ...compressed]);
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : "No se pudieron procesar las fotos.");
      } finally {
        setCompressing(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [disabled, onPhotosChange, photos]
  );

  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h4 style={{ marginTop: 0 }}>Ingreso del vehículo (obligatorio)</h4>
      <p style={{ color: "#b9accf", fontSize: "0.9rem", marginTop: 0 }}>
        Registre el estado al recibir el auto: entre {INTAKE_MIN_PHOTOS} y {INTAKE_MAX_PHOTOS} fotos y
        una descripción de lo observado. Las imágenes se guardan en disco local del taller, no en la nube.
      </p>

      <label style={{ display: "block" }}>
        Detalles encontrados al ingreso *
        <textarea
          className="textarea"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Rayones, abolladuras, suciedad, accesorios, nivel de combustible, etc."
          rows={4}
          required
          disabled={disabled}
        />
      </label>

      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            className="button button--secondary"
            disabled={disabled || compressing || photos.length >= INTAKE_MAX_PHOTOS}
            onClick={() => inputRef.current?.click()}
          >
            {compressing ? "Comprimiendo…" : "Agregar fotos"}
          </button>
          <span style={{ fontSize: "0.85rem", color: "#b9accf" }}>
            {photos.length}/{INTAKE_MAX_PHOTOS} · mínimo {INTAKE_MIN_PHOTOS}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            multiple
            hidden
            disabled={disabled}
            onChange={(e) => void addFiles(e.target.files)}
          />
        </div>

        {localError ? (
          <p style={{ color: "#f87171", fontSize: "0.85rem", marginTop: 10 }}>{localError}</p>
        ) : null}

        {previews.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: 10,
              marginTop: 14
            }}
          >
            {previews.map((preview, index) => (
              <figure
                key={preview.id}
                style={{
                  margin: 0,
                  border: "1px solid #2a203d",
                  borderRadius: 10,
                  overflow: "hidden",
                  position: "relative"
                }}
              >
                <img
                  src={preview.url}
                  alt={`Foto ingreso ${index + 1}`}
                  style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }}
                />
                <button
                  type="button"
                  className="button button--ghost"
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    padding: "2px 8px",
                    fontSize: "0.75rem",
                    minHeight: 0
                  }}
                  disabled={disabled}
                  onClick={() => removePhoto(index)}
                  aria-label={`Quitar foto ${index + 1}`}
                >
                  ✕
                </button>
              </figure>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
