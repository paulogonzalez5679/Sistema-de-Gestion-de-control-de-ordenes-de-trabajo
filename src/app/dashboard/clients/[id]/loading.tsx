export default function ClientProfileLoading() {
  return (
    <div className="card app-route-loading" style={{ minHeight: 240 }}>
      <span className="app-route-loading__spinner" aria-hidden />
      <p style={{ margin: 0 }}>Cargando perfil del cliente…</p>
    </div>
  );
}
