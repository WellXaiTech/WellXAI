import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { kv } from "@vercel/kv";
import { RP_ID, pendingPasskeyLoginKey } from "@/lib/webauthn";

// Unauthenticated -- there's no signed-in user yet, that's the whole point
// of signing in with a passkey. allowCredentials is deliberately empty so
// Credential Manager offers every discoverable passkey registered for this
// rpID rather than requiring the client to already know which account it
// is; passkey-verify below figures out who signed based on which
// credential id comes back.
export async function POST() {
  try {
    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      userVerification: "preferred",
      allowCredentials: [],
    });

    const requestId = crypto.randomUUID();
    await kv.set(pendingPasskeyLoginKey(requestId), { challenge: options.challenge }, { ex: 300 });

    return Response.json({ options, requestId });
  } catch (err) {
    console.error("Passkey login options error:", err);
    return Response.json({ error: "Couldn't start passkey sign-in -- try again" }, { status: 500 });
  }
}
