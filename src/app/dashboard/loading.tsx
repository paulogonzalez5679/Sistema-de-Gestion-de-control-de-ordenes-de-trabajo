export default function DashboardLoading() {
  return (
    <div className="card app-route-loading" style={{ minHeight: 200 }}>
      <span className="app-route-loading__spinner" aria-hidden />
      <p style={{ margin: 0 }}>Cargando panel…</p>
    </div>
  );
}
