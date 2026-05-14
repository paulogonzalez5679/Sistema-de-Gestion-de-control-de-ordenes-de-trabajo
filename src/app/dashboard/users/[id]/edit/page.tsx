import { notFound, redirect } from "next/navigation";
import { UserForm } from "@/components/user-form";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { canManageUsers } from "@/lib/roles";
import { getSessionProfile } from "@/lib/session-profile";
import { getProfileByUserId } from "@/modules/profiles/profile.service";

type Props = { params: Promise<{ id: string }> };

export default async function EditUserPage({ params }: Props) {
  const session = await getSessionProfile();
  if (!canManageUsers(session?.role)) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const profile = await getProfileByUserId(id);
  if (!profile) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? "";

  return <UserForm mode="edit" profile={profile} currentUserId={currentUserId} />;
}
