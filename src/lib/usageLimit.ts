import { kv } from "@vercel/kv";

function planKey(userId: string) {
  return `chatgiza:plan:${userId}`;
}

export async function isPaidAccount(userId?: string | null): Promise<boolean> {
  if (!userId) return false;
  try {
    const tier = await kv.get(planKey(userId));
    return Boolean(tier);
  } catch (err) {
    console.error("Plan lookup failed:", err);
    return false;
  }
}

export async function setAccountPlan(userId: string, tier: string): Promise<void> {
  try {
    await kv.set(planKey(userId), tier);
  } catch (err) {
    console.error("Failed to persist account plan:", err);
  }
}

// The Build page (AI website builder + GitHub/Vercel/Supabase) is meant
// to eventually gate to Growth/Enterprise only, but the tier/pricing
// decision for it is still being worked out -- open to any signed-in
// user for now. BUILD_ACCESS_TIERS is left in place so re-enabling the
// gate later is a one-line change back to the tier check below it.
const BUILD_ACCESS_TIERS = new Set(["growth", "enterprise"]);
void BUILD_ACCESS_TIERS;

export async function hasBuildAccess(userId?: string | null): Promise<boolean> {
  return !!userId;
}
