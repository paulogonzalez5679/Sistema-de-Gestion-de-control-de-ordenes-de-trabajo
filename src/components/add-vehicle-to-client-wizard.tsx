"use client";

import { InlineSpinner } from "@/components/inline-spinner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useState } from "react";

type Step = 1 | 2 | 3 | 4;

/** Alta de vehículo para un cliente existente (matrícula, datos, foto y confirmación). Sin datos de persona ni orden. */
export function AddVehicleToClientWizard({
  clientId,
  clientName,
  backHref
}: {
  clientId: string;
  clientName: string;
  backHref: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [plate, setPlate] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [year, setYear] = useState("");

  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

  const resetPhotoInput = useCallback(() => {
    setPhotoDataUrl(null);
  }, []);

  function handleStep1(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!plate.trim() || !make.trim() || !model.trim()) {
      setError("Matrícula, marca y modelo son obligatorios.");
      return;
    }
    setStep(2);
  }

  function handleFileChange(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  function handleStep2Continue() {
    setError(null);
    if (!photoDataUrl) {
      setError("Selecciona o captura una foto del vehículo.");
      return;
    }
    setStep(3);
  }

  async function handleConfirm() {
    if (!photoDataUrl) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          plate: plate.trim().toUpperCase(),
          make: make.trim(),
          model: model.trim(),
          color: color.trim() || null,
          year: year ? Number(year) : null,
          car_registration_photo: photoDataUrl
        })
      });
      const data = (await response.json()) as { error?: string; id?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo registrar el vehículo.");
      if (!data?.id) throw new Error("Respuesta inválida del servidor.");
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al registrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="registration-flow">
      <header className="registration-flow-header">
        <button type="button" className="registration-icon-btn" onClick={() => router.push(backHref)} aria-label="Volver">
          ←
        </button>
        <span className="registration-flow-brand">Nuevo vehículo</span>
        <span className="registration-flow-header-spacer" aria-hidden />
      </header>

      {step < 4 ? (
        <div className="registration-step-meta">
          <p className="registration-breadcrumb">
            <Link href={backHref}>{clientName}</Link> / Vehículo
          </p>
          <h1 className="registration-title">
            {step === 1 && "Datos del vehículo"}
            {step === 2 && "Foto del vehículo"}
            {step === 3 && "Confirmar registro"}
          </h1>
        </div>
      ) : null}

      {error ? <p className="registration-error">{error}</p> : null}

      {step === 1 ? (
        <form className="registration-glass-panel" onSubmit={handleStep1}>
          <div className="registration-section-head">
            <span className="registration-section-icon">🚗</span>
            <h2 className="registration-section-title">Vehículo para {clientName}</h2>
          </div>
          <label className="registration-field">
            <span className="registration-label">Matrícula</span>
            <input
              className="registration-input registration-input-plate"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              placeholder="p. ej. 1234 ABC"
              required
            />
          </label>
          <div className="registration-grid">
            <label className="registration-field">
              <span className="registration-label">Marca</span>
              <input className="registration-input" value={make} onChange={(e) => setMake(e.target.value)} required />
            </label>
            <label className="registration-field">
              <span className="registration-label">Modelo</span>
              <input className="registration-input" value={model} onChange={(e) => setModel(e.target.value)} required />
            </label>
            <label className="registration-field">
              <span className="registration-label">Color</span>
              <input className="registration-input" value={color} onChange={(e) => setColor(e.target.value)} />
            </label>
            <label className="registration-field">
              <span className="registration-label">Año</span>
              <input
                className="registration-input"
                type="number"
                min={1980}
                max={2035}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </label>
          </div>
          <div className="registration-sticky-actions">
            <button type="button" className="button secondary" onClick={() => router.push(backHref)}>
              Cancelar
            </button>
            <button type="submit" className="registration-btn-primary">
              Siguiente
            </button>
          </div>
        </form>
      ) : null}

      {step === 2 ? (
        <div className="registration-glass-panel registration-capture">
          <p className="registration-capture-hint">Centra el vehículo en el encuadre y usa buena luz.</p>
          <label className="registration-dropzone">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="registration-file-input"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
            {!photoDataUrl ? (
              <>
                <span className="registration-dropzone-icon">📷</span>
                <span className="registration-dropzone-title">Añadir foto del vehículo</span>
                <span className="registration-hint">Captura o sube una imagen</span>
              </>
            ) : (
              <img src={photoDataUrl} alt="Vista previa" className="registration-preview-thumb" />
            )}
          </label>
          <div className="registration-sticky-actions">
            <button type="button" className="button secondary" onClick={() => setStep(1)}>
              Atrás
            </button>
            <button type="button" className="registration-btn-primary" onClick={handleStep2Continue}>
              Continuar
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 && photoDataUrl ? (
        <div className="registration-glass-panel registration-confirm">
          <h2 className="registration-section-title">¿Confirmas esta foto?</h2>
          <img src={photoDataUrl} alt="Confirmación" className="registration-preview-large" />
          <div className="registration-sticky-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                resetPhotoInput();
                setStep(2);
              }}
            >
              Tomar otra
            </button>
            <button type="button" className="registration-btn-primary" onClick={handleConfirm} disabled={loading}>
              <span className="btn-loading-inner">
                {loading ? <InlineSpinner size="sm" /> : null}
                {loading ? "Registrando…" : "Confirmar y guardar"}
              </span>
            </button>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="registration-success">
          <div className="registration-success-icon">✓</div>
          <h2 className="registration-success-title">Vehículo registrado</h2>
          <p className="registration-success-text">El vehículo quedó vinculado al perfil del cliente.</p>
          <div className="registration-success-actions">
            <Link className="registration-btn-primary" href={backHref} style={{ textDecoration: "none" }}>
              Volver al perfil
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
