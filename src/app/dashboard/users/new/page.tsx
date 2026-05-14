import { redirect } from "next/navigation";
import { UserForm } from "@/components/user-form";
import { canManageUsers } from "@/lib/roles";
import { getSessionProfile } from "@/lib/session-profile";

export default async function NewUserPage() {
  const session = await getSessionProfile();
  if (!canManageUsers(session?.role)) {
    redirect("/dashboard");
  }

  return <UserForm mode="create" />;
}
