import { encode, decode } from "next-auth/jwt";

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

/** Returns the signed-in user id from a mobile bearer token, or null if absent/invalid. */
export async function getMobileUserId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const payload = await verifyMobileToken(authHeader.slice(7));
  return payload?.sub ?? null;
}
