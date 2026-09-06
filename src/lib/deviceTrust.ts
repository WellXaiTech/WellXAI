import { encode, decode } from "next-auth/jwt";

// A signed, stateless "this device already cleared its second factor"
// marker -- same mechanism as mintMobileToken/verifyMobileToken in
// mobileAuth.ts (Auth.js's own JWT encode/decode, AUTH_SECRET, a distinct
// salt so it can never be confused with the mobile bearer token, the web
// session cookie, or the SSO login token). Web stores this in an httpOnly
// cookie; Android stores it in TokenStore and echoes it back on every
// mobileAuth/authWithPassword call. No server-side storage at all: a token
// that decodes to the same `sub` currently signing in is trust, full stop,
// and it's re-minted on every successful completion (a sliding window, not
// a fixed one). Sign-out on either platform must discard it, otherwise
// "trusted until sign-out" doesn't actually hold.
const SALT = "chatgiza-device-trust";
const MAX_AGE_SECONDS = 90 * 24 * 60 * 60; // 90 days

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

export async function mintDeviceTrustToken(sub: string): Promise<string> {
  return encode({ token: { sub }, secret: authSecret(), salt: SALT, maxAge: MAX_AGE_SECONDS });
}

/** Returns the trusted account id if `token` is valid, otherwise null. */
export async function verifyDeviceTrustToken(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  try {
    const payload = await decode<{ sub: string }>({ token, secret: authSecret(), salt: SALT });
    return payload?.sub ?? null;
  } catch {
    return null;
  }
}
