import { kv } from "@vercel/kv";

// "API Priority" (Enterprise tier) cashes out to a real, meaningfully
// higher throughput ceiling on the public API -- not just a cosmetic
// label. Fixed 1-minute windows via KV INCR/EXPIRE: simple, and more than
// accurate enough for a per-minute ceiling (worst case a client sees
// slightly more than the limit right at a window boundary).
const STANDARD_LIMIT_PER_MINUTE = 20;
const PRIORITY_LIMIT_PER_MINUTE = 100;

export async function checkApiRateLimit(
  apiKeyId: string,
  priority: boolean
): Promise<{ allowed: boolean; limit: number; remaining: number }> {
  const limit = priority ? PRIORITY_LIMIT_PER_MINUTE : STANDARD_LIMIT_PER_MINUTE;
  const windowKey = `chatgiza:ratelimit:${apiKeyId}:${Math.floor(Date.now() / 60000)}`;

  try {
    const count = await kv.incr(windowKey);
    if (count === 1) await kv.expire(windowKey, 60);
    return { allowed: count <= limit, limit, remaining: Math.max(0, limit - count) };
  } catch (err) {
    console.error("Rate limit check failed, allowing request:", err);
    return { allowed: true, limit, remaining: limit };
  }
}
