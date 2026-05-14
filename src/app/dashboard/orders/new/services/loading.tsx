export default function OrderServicesStepLoading() {
  return (
    <div className="card app-route-loading" style={{ minHeight: 200 }}>
      <span className="app-route-loading__spinner" aria-hidden />
      <p style={{ margin: 0 }}>Cargando servicios de la orden…</p>
    </div>
  );
}
