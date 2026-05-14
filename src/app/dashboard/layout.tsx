import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { DashboardHeaderActions } from "@/components/dashboard-header-actions";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getProfileByUserId } from "@/modules/profiles/profile.service";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfileByUserId(user.id);
  const displayName = profile?.full_name?.trim() || user.email || "Usuario";
  const email = user.email ?? "";

  return (
    <DashboardShell
      userRole={profile?.role ?? null}
      headerSlot={
        <DashboardHeaderActions
          displayName={displayName}
          email={email}
          userRole={profile?.role ?? null}
        />
      }
    >
      {children}
    </DashboardShell>
  );
}
