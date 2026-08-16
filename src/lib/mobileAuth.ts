import { encode, decode } from "next-auth/jwt";
import { isRevoked } from "@/lib/sessions";

// The native Android app has no browser session cookie, so it authenticates
// with a standalone bearer token instead — minted here using Auth.js's own
// JWT encoding (same AUTH_SECRET, a fixed custom salt so it never collides
// with the cookie-derived salt Auth.js uses for its own session cookie).
// The token's `sub` is the same stable Google account id web sessions use,
// so a signed-in native user's history/account data is the exact same
// account as their web one — not a separate identity.
const SALT = "chatgiza-mobile-token";
const MAX_AGE_SECONDS = 60 * 24 * 60 * 60; // 60 days

export type MobileTokenPayload = {
  sub: string;
  email?: string | null;
  name?: string | null;
  picture?: string | null;
  sessionId?: string;
};

export async function mintMobileToken(payload: MobileTokenPayload): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return encode({ token: payload, secret, salt: SALT, maxAge: MAX_AGE_SECONDS });
}

export async function verifyMobileToken(token: string): Promise<MobileTokenPayload | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  try {
    const payload = await decode<MobileTokenPayload>({ token, secret, salt: SALT });
    return payload?.sub ? payload : null;
  } catch {
    return null;
  }
}

/**
 * Returns the decoded token payload, or null if absent/invalid/revoked.
 * Checks the Trusted Devices revocation list the same way the web JWT
 * callback does (see src/auth.ts) -- there's no server-side token store to
 * invalidate directly, so this is what makes deleting a device on the
 * Trusted Devices screen actually sign that device out, not just remove it
 * from the list.
 */
export async function getMobilePayload(request: Request): Promise<MobileTokenPayload | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const payload = await verifyMobileToken(authHeader.slice(7));
  if (!payload?.sub) return null;
  if (payload.sessionId) {
    const revoked = await isRevoked(payload.sub, payload.sessionId);
    if (revoked) return null;
  }
  return payload;
}

/** Returns the signed-in user id from a mobile bearer token, or null if absent/invalid/revoked. */
export async function getMobileUserId(request: Request): Promise<string | null> {
  const payload = await getMobilePayload(request);
  return payload?.sub ?? null;
}
