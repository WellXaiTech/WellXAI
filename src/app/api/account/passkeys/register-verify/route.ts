import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { kv } from "@vercel/kv";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestUser } from "@/lib/requestUser";
import { EXPECTED_ORIGINS, RP_ID, pendingPasskeyRegKey } from "@/lib/webauthn";

// Step 2: verifies the attestation the authenticator produced against the
// challenge staged by register-options, then stores the credential. Only
// now does the passkey actually exist -- an abandoned registration never
// gets this far.
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const response = body?.response;
  const deviceName = typeof body?.deviceName === "string" ? body.deviceName.trim().slice(0, 60) : null;
  if (!response) {
    return NextResponse.json({ error: "response is required" }, { status: 400 });
  }

  try {
    const pending = await kv.get<{ challenge: string }>(pendingPasskeyRegKey(user.id));
    if (!pending?.challenge) {
      return NextResponse.json({ error: "This passkey setup expired -- try again" }, { status: 400 });
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: pending.challenge,
      expectedOrigin: EXPECTED_ORIGINS,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: "Couldn't verify that passkey -- try again" }, { status: 400 });
    }

    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
    const { error } = await supabaseAdmin.from("passkey_credentials").insert({
      id: isoBase64URL.fromBuffer(credentialID),
      user_id: user.id,
      public_key: isoBase64URL.fromBuffer(credentialPublicKey),
      counter,
      device_name: deviceName,
    });
    if (error) throw error;

    await kv.del(pendingPasskeyRegKey(user.id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Passkey register-verify error:", err);
    return NextResponse.json({ error: "Failed to save passkey" }, { status: 500 });
  }
}
