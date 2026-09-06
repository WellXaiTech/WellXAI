import { encode, decode } from "next-auth/jwt";
import { randomInt } from "crypto";
import { kv } from "@vercel/kv";
import { isRevoked, recordSession, clientIpFromHeaders } from "@/lib/sessions";
import { supabaseAdmin } from "@/lib/supabase";
import { ensureUserExists } from "@/lib/userIndex";
import { mintDeviceTrustToken, verifyDeviceTrustToken } from "@/lib/deviceTrust";
import { sendMail } from "@/lib/mailer";
import { signInCodeEmail } from "@/lib/emailTemplates";

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

// Shared by both mobile sign-in entry points (Google in
// src/app/api/mobile/auth/route.ts, password in
// src/app/api/mobile/auth-password/route.ts) -- the pending identity staged
// while a second factor is still outstanding. `kind` records which ladder
// rung this is so the PUT confirm step below knows whether to check a TOTP
// code or an emailed one against the same shape.
export function pendingLoginKey(pendingId: string) {
  return `chatgiza:totp-login:${pendingId}`;
}

export type PendingLogin = VerifiedMobileIdentity & {
  kind: "totp" | "email";
  // Only set when kind is "email" -- the code just emailed, checked by the
  // PUT handler in src/app/api/mobile/auth/route.ts.
  code?: string;
};

/**
 * Every account now needs a second factor on every sign-in, not just ones
 * that opted into TOTP: TOTP if enabled, otherwise a passkey confirmation if
 * the account has one registered (Android already has the full
 * discoverable-credential passkey-login flow built -- the client re-runs it
 * directly on `passkeyRequired: true`, no pendingId needed since that flow
 * identifies the account from the credential itself), otherwise a mandatory
 * emailed code. A device that already cleared this once sends back its
 * deviceTrustToken and skips straight through -- see src/lib/deviceTrust.ts.
 */
export async function resolveMobileSignIn(
  request: Request,
  pending: VerifiedMobileIdentity,
  deviceTrustToken?: unknown
) {
  const trustedSub = await verifyDeviceTrustToken(typeof deviceTrustToken === "string" ? deviceTrustToken : null);
  if (trustedSub === pending.sub) {
    return finishMobileSignIn(request, pending);
  }

  const { data: userRow } = await supabaseAdmin.from("users").select("totp_enabled").eq("id", pending.sub).maybeSingle();
  if (userRow?.totp_enabled) {
    const pendingId = crypto.randomUUID();
    await kv.set(pendingLoginKey(pendingId), { ...pending, kind: "totp" } satisfies PendingLogin, { ex: 300 });
    return Response.json({ totpRequired: true, pendingId });
  }

  const { count } = await supabaseAdmin
    .from("passkey_credentials")
    .select("id", { count: "exact", head: true })
    .eq("user_id", pending.sub);
  if (count && count > 0) {
    return Response.json({ passkeyRequired: true });
  }

  if (!pending.email) {
    return Response.json(
      { error: "This account has no email on file to send a sign-in code to -- add one in Security settings first, or contact support" },
      { status: 400 }
    );
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const pendingId = crypto.randomUUID();
  await kv.set(pendingLoginKey(pendingId), { ...pending, kind: "email", code } satisfies PendingLogin, { ex: 300 });
  const { subject, html, from } = signInCodeEmail(code);
  await sendMail(pending.email, subject, html, from);
  return Response.json({ emailCodeRequired: true, pendingId });
}

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

  // Mobile bearer-token auth never runs through auth.ts's web jwt callback,
  // which is what normally creates a users row on first sign-in -- so a
  // mobile-only user could sign in successfully for months with no users
  // row at all, only surfacing as a foreign-key violation the first time
  // some OTHER feature (passkeys, workspace, media posts) tried to insert
  // against user_id. Guarantee the row exists right here instead, the same
  // fix already applied at each of those individual call sites.
  try {
    await ensureUserExists(identity.sub, identity.email ?? "", identity.name ?? "", identity.picture ?? "", "android");
  } catch (err) {
    console.error("ensureUserExists (mobile sign-in) failed:", err);
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

  // Re-minted on every successful completion, whether this call just
  // cleared a real second-factor challenge or skipped straight through
  // because the caller already presented a still-valid one -- a sliding
  // trust window, not a fixed one. The app stores this and echoes it back
  // on the next sign-in (see resolveMobileSignIn above) so this device
  // isn't challenged again until the user actually signs out.
  const deviceTrustToken = await mintDeviceTrustToken(identity.sub);

  return Response.json({
    token,
    deviceTrustToken,
    user: {
      id: identity.sub,
      email: identity.email,
      name: identity.name,
      image: identity.picture,
    },
  });
}
