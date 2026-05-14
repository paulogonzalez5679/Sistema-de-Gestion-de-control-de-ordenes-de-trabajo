import { redirect } from "next/navigation";
import { canManageInventory } from "@/lib/roles";
import { getSessionProfile } from "@/lib/session-profile";

export default async function InventoryLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  if (!canManageInventory(profile?.role)) {
    redirect("/dashboard");
  }
  return children;
}
