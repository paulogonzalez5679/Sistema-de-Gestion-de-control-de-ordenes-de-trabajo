import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getProfileByUserId } from "@/modules/profiles/profile.service";
import type { Profile } from "@/lib/types";

export async function getSessionProfile(): Promise<Profile | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return null;
    return await getProfileByUserId(user.id);
  } catch {
    return null;
  }
}
