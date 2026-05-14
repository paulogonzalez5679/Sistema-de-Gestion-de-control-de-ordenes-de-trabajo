import { redirect } from "next/navigation";
import { RewardForm } from "@/components/reward-form";
import { canManageUsers } from "@/lib/roles";
import { getSessionProfile } from "@/lib/session-profile";

export default async function NewRewardPage() {
  const profile = await getSessionProfile();
  if (!canManageUsers(profile?.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="row">
      <h1 style={{ margin: 0 }}>Nueva recompensa</h1>
      <RewardForm mode="create" />
    </div>
  );
}
