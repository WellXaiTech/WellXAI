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
