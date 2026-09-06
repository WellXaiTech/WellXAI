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

// General-purpose fixed-window limiter for guessable-secret endpoints
// (account passwords, emailed OTP codes, TOTP codes) -- these need a much
// tighter ceiling than API throughput and are keyed by whatever scopes the
// guess (a user id, a pendingId, an IP), not an API key. Fails open on a KV
// error, same reasoning as checkApiRateLimit: a rate limiter that can 500 a
// legitimate request because of an infra hiccup is worse than briefly
// allowing a few extra guesses through.
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const windowKey = `chatgiza:ratelimit:${key}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;

  try {
    const count = await kv.incr(windowKey);
    if (count === 1) await kv.expire(windowKey, windowSeconds);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
  } catch (err) {
    console.error("Rate limit check failed, allowing request:", err);
    return { allowed: true, remaining: limit };
  }
}

// Read-only counterpart to checkRateLimit -- reports the same fixed-window
// count a real request would see, without consuming a slot itself, so a
// usage-display UI can show real numbers without secretly eating into the
// user's own limit just by rendering.
export async function peekRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ used: number; limit: number; resetsInSeconds: number }> {
  const windowMs = windowSeconds * 1000;
  const windowIndex = Math.floor(Date.now() / windowMs);
  const windowKey = `chatgiza:ratelimit:${key}:${windowIndex}`;
  const resetsInSeconds = Math.ceil(((windowIndex + 1) * windowMs - Date.now()) / 1000);

  try {
    const used = (await kv.get<number>(windowKey)) ?? 0;
    return { used, limit, resetsInSeconds };
  } catch (err) {
    console.error("Rate limit peek failed:", err);
    return { used: 0, limit, resetsInSeconds };
  }
}
