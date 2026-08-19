import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { kv } from "@vercel/kv";
import { supabaseAdmin } from "@/lib/supabase";
import { finishMobileSignIn } from "@/lib/mobileAuth";
import { EXPECTED_ORIGINS, RP_ID, pendingPasskeyLoginKey } from "@/lib/webauthn";

// Unauthenticated -- verifies the assertion against the challenge staged by
// passkey-options, identifies which account signed based on the credential
// id in the response (discoverable-credential sign-in never tells the
// server who it's signing in as beforehand), then mints a token exactly
// like a Google sign-in would.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const requestId = typeof body?.requestId === "string" ? body.requestId : "";
  const response = body?.response;
  if (!requestId || !response?.id) {
    return Response.json({ error: "requestId and response are required" }, { status: 400 });
  }

  const deviceModel = typeof body?.deviceModel === "string" && body.deviceModel.trim() ? body.deviceModel.trim().slice(0, 60) : null;

  try {
    const pending = await kv.get<{ challenge: string }>(pendingPasskeyLoginKey(requestId));
    if (!pending?.challenge) {
      return Response.json({ error: "This sign-in attempt expired -- try again" }, { status: 400 });
    }

    const { data: credentialRow } = await supabaseAdmin
      .from("passkey_credentials")
      .select("id, user_id, public_key, counter")
      .eq("id", response.id)
      .maybeSingle();
    if (!credentialRow) {
      return Response.json({ error: "That passkey isn't registered with ChatGiZa" }, { status: 401 });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: pending.challenge,
      expectedOrigin: EXPECTED_ORIGINS,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: isoBase64URL.toBuffer(credentialRow.id as string),
        credentialPublicKey: isoBase64URL.toBuffer(credentialRow.public_key as string),
        counter: credentialRow.counter as number,
      },
    });

    if (!verification.verified) {
      return Response.json({ error: "Couldn't verify that passkey" }, { status: 401 });
    }

    await kv.del(pendingPasskeyLoginKey(requestId));
    await supabaseAdmin
      .from("passkey_credentials")
      .update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
      .eq("id", credentialRow.id);

    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id, email, name, image")
      .eq("id", credentialRow.user_id as string)
      .maybeSingle();
    if (!userRow) {
      return Response.json({ error: "Account not found" }, { status: 401 });
    }

    return finishMobileSignIn(request, {
      sub: userRow.id as string,
      email: (userRow.email as string | null) ?? null,
      name: (userRow.name as string | null) ?? null,
      picture: (userRow.image as string | null) ?? null,
      deviceModel,
    });
  } catch (err) {
    console.error("Passkey login verify error:", err);
    return Response.json({ error: "Couldn't sign in with that passkey -- try again" }, { status: 500 });
  }
}
