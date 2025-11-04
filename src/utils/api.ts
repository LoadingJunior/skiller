import { supabase } from "../lib/supabase";
import { Badge, UserBadge } from "../types";

export async function getBadgesUser(id: string): Promise<Badge[] | []> {
  try {
    const badges: Badge[] = []
    const { data, error } = await supabase
      .from("user_badges")
      .select("*")
      .eq("user_id", id);
    console.log(data)
    const userBadges = data as unknown as UserBadge[];
    if (error) throw new Error("Network response was not ok");
    for (const user_badge of userBadges) {
        badges.push((await supabase.from("badges").select("*").eq("id", user_badge.badge_id).single()).data as unknown as Badge);
    }
    console.log(badges)
    return badges;
  } catch (error) {
    console.error("Failed to fetch badges:", error);
    return [];
  }
}
