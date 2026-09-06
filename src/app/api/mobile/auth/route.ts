import { finishMobileSignIn, resolveMobileSignIn, pendingLoginKey, type PendingLogin } from "@/lib/mobileAuth";
import { kv } from "@vercel/kv";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyTotp } from "@/lib/totp";
import { checkRateLimit } from "@/lib/rateLimit";

// Verifies a Google ID token obtained natively (Android Credential Manager)
// the same way the web "google-one-tap" Credentials provider does (see
// src/auth.ts), then mints a bearer token the native app stores and sends
// as `Authorization: Bearer <token>` on every subsequent API call — there is
// no browser cookie for a native client to carry a session in.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const idToken = body?.idToken;
  if (!idToken || typeof idToken !== "string") {
    return Response.json({ error: "idToken is required" }, { status: 400 });
  }

  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) {
    return Response.json({ error: "Invalid Google token" }, { status: 401 });
  }
  const payload = await res.json();

  if (payload.aud !== process.env.AUTH_GOOGLE_ID) {
    return Response.json({ error: "Token audience mismatch" }, { status: 401 });
  }
  if (!payload.sub || !payload.email) {
    return Response.json({ error: "Incomplete Google profile" }, { status: 401 });
  }

  const deviceModel = typeof body?.deviceModel === "string" && body.deviceModel.trim() ? body.deviceModel.trim().slice(0, 60) : null;

  const pending = {
    sub: payload.sub,
    email: payload.email,
    name: payload.name ?? null,
    picture: payload.picture ?? null,
    deviceModel,
  };

  return resolveMobileSignIn(request, pending, body?.deviceTrustToken);
}

// Step 2 of a 2FA-gated sign-in: verifies the code against the identity
// staged above, then finishes minting the token exactly the way an
// unchallenged sign-in would. Branches on the pending entry's own `kind` --
// a TOTP-enabled account checks the code against its authenticator secret,
// every other account (the mandatory-email-code fallback) checks it against
// the code that was actually emailed at stage time.
export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const pendingId = typeof body?.pendingId === "string" ? body.pendingId : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!pendingId || !code) {
    return Response.json({ error: "pendingId and code are required" }, { status: 400 });
  }

  const rate = await checkRateLimit(`totp-mobile:${pendingId}`, 8, 300);
  if (!rate.allowed) {
    return Response.json({ error: "Too many attempts -- start sign-in again" }, { status: 429 });
  }

  const pending = await kv.get<PendingLogin>(pendingLoginKey(pendingId));
  if (!pending) {
    return Response.json({ error: "This sign-in attempt expired -- try again" }, { status: 400 });
  }

  if (pending.kind === "email") {
    if (!pending.code || pending.code !== code) {
      return Response.json({ error: "That code is incorrect" }, { status: 401 });
    }
  } else {
    const { data: userRow } = await supabaseAdmin.from("users").select("totp_secret").eq("id", pending.sub).maybeSingle();
    const secret = userRow?.totp_secret as string | null;
    if (!secret || !verifyTotp(secret, code)) {
      return Response.json({ error: "That code is incorrect" }, { status: 401 });
    }
  }

  await kv.del(pendingLoginKey(pendingId));
  return finishMobileSignIn(request, pending);
}
