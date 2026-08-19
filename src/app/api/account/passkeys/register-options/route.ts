import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { kv } from "@vercel/kv";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestUser } from "@/lib/requestUser";
import { RP_ID, RP_NAME, pendingPasskeyRegKey } from "@/lib/webauthn";

// Step 1 of adding a passkey: generates a fresh challenge (staged in KV,
// not trusted from the client) and lists the account's existing passkeys
// as excludeCredentials so the same authenticator can't be registered
// twice.
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const { data: userRow } = await supabaseAdmin.from("users").select("email").eq("id", user.id).maybeSingle();
    const email = (userRow?.email as string | null) || user.id;

    const { data: existing } = await supabaseAdmin.from("passkey_credentials").select("id").eq("user_id", user.id);

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: user.id,
      userName: email,
      userDisplayName: user.name || email,
      attestationType: "none",
      excludeCredentials: (existing ?? []).map((row) => ({
        id: isoBase64URL.toBuffer(row.id as string),
        type: "public-key" as const,
      })),
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "preferred",
      },
    });

    await kv.set(pendingPasskeyRegKey(user.id), { challenge: options.challenge }, { ex: 300 });

    return NextResponse.json({ options });
  } catch (err) {
    console.error("Passkey register-options error:", err);
    return NextResponse.json({ error: "Couldn't start passkey registration -- try again" }, { status: 500 });
  }
}
