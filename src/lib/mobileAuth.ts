import { encode, decode } from "next-auth/jwt";
import { isRevoked, recordSession, clientIpFromHeaders } from "@/lib/sessions";
import { supabaseAdmin } from "@/lib/supabase";

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

export type VerifiedMobileIdentity = {
  sub: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  deviceModel: string | null;
};

/**
 * Records the Trusted Devices session and mints the bearer token -- the
 * tail end shared by every mobile sign-in path once the identity is
 * verified, whether that's a plain Google sign-in, one that also cleared a
 * TOTP check, or one that cleared a passkey assertion instead.
 */
export async function finishMobileSignIn(request: Request, identity: VerifiedMobileIdentity) {
  const sessionId = crypto.randomUUID();
  try {
    const ip = clientIpFromHeaders(request.headers);
    await recordSession(identity.sub, sessionId, request.headers.get("user-agent"), ip, "mobile", identity.deviceModel);
  } catch (err) {
    console.error("recordSession (mobile) failed:", err);
  }

  // A successful sign-in reactivates a deactivated account -- there's no
  // separate "reactivate" screen, getting past Google (+2FA/passkey, if on)
  // again is proof enough this is really the owner. Data was never touched
  // by deactivation in the first place.
  try {
    await supabaseAdmin.from("users").update({ deactivated_at: null }).eq("id", identity.sub);
  } catch (err) {
    console.error("Account reactivate-on-signin failed:", err);
  }

  const token = await mintMobileToken({
    sub: identity.sub,
    email: identity.email,
    name: identity.name,
    picture: identity.picture,
    sessionId,
  });

  return Response.json({
    token,
    user: {
      id: identity.sub,
      email: identity.email,
      name: identity.name,
      image: identity.picture,
    },
  });
}
