import { redirect } from "next/navigation";
import { StorageSettingsForm } from "@/components/storage-settings-form";
import { canManageAppSettings } from "@/lib/roles";
import { getSessionProfile } from "@/lib/session-profile";

export default async function SettingsPage() {
  const session = await getSessionProfile();
  if (!canManageAppSettings(session?.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="staff-page">
      <header className="staff-page__header">
        <div>
          <p className="staff-page__eyebrow">Administración</p>
          <h1 className="staff-page__title">Configuración</h1>
          <p className="staff-page__lead">
            Ajustes del taller en esta instalación. La ruta de fotos se guarda en el PC local, no en la nube.
          </p>
        </div>
      </header>

      <StorageSettingsForm />
    </div>
  );
}
