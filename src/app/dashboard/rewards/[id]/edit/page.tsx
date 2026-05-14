import { notFound, redirect } from "next/navigation";
import { RewardForm } from "@/components/reward-form";
import { canManageUsers } from "@/lib/roles";
import { getSessionProfile } from "@/lib/session-profile";
import { getRewardById } from "@/modules/loyalty/loyalty.service";

type Props = { params: Promise<{ id: string }> };

export default async function EditRewardPage({ params }: Props) {
  const profile = await getSessionProfile();
  if (!canManageUsers(profile?.role)) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const reward = await getRewardById(id);
  if (!reward) notFound();

  return (
    <div className="row">
      <h1 style={{ margin: 0 }}>Editar recompensa</h1>
      <RewardForm mode="edit" initial={reward} />
    </div>
  );
}
