import { finishMobileSignIn } from "@/lib/mobileAuth";
import { kv } from "@vercel/kv";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyTotp } from "@/lib/totp";

function pendingLoginKey(pendingId: string) {
  return `chatgiza:totp-login:${pendingId}`;
}

type PendingLogin = {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
  deviceModel: string | null;
};

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

  const pending: PendingLogin = {
    sub: payload.sub,
    email: payload.email,
    name: payload.name ?? null,
    picture: payload.picture ?? null,
    deviceModel,
  };

  // Authenticator App 2FA gate: if this account has it turned on, the
  // Google sign-in alone isn't enough to mint a real session token yet --
  // stage the verified identity under a short-lived pendingId and make the
  // app collect a TOTP code (see PUT below) before actually signing in.
  const { data: userRow } = await supabaseAdmin.from("users").select("totp_enabled").eq("id", payload.sub).maybeSingle();
  if (userRow?.totp_enabled) {
    const pendingId = crypto.randomUUID();
    await kv.set(pendingLoginKey(pendingId), pending, { ex: 300 });
    return Response.json({ totpRequired: true, pendingId });
  }

  return finishMobileSignIn(request, pending);
}

// Step 2 of a 2FA-gated sign-in: verifies the authenticator code against the
// identity POST staged above, then finishes minting the token exactly the
// way POST would have if 2FA weren't on.
export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const pendingId = typeof body?.pendingId === "string" ? body.pendingId : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!pendingId || !code) {
    return Response.json({ error: "pendingId and code are required" }, { status: 400 });
  }

  const pending = await kv.get<PendingLogin>(pendingLoginKey(pendingId));
  if (!pending) {
    return Response.json({ error: "This sign-in attempt expired -- try again" }, { status: 400 });
  }

  const { data: userRow } = await supabaseAdmin.from("users").select("totp_secret").eq("id", pending.sub).maybeSingle();
  const secret = userRow?.totp_secret as string | null;
  if (!secret || !verifyTotp(secret, code)) {
    return Response.json({ error: "That code is incorrect" }, { status: 401 });
  }

  await kv.del(pendingLoginKey(pendingId));
  return finishMobileSignIn(request, pending);
}
