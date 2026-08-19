import { finishMobileSignIn } from "@/lib/mobileAuth";
import { kv } from "@vercel/kv";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPassword } from "@/lib/password";

// Same KV key + shape the TOTP step of the Google sign-in path
// (src/app/api/mobile/auth/route.ts) already uses, so a password sign-in
// that needs a second factor stages into the exact same place -- the
// existing PUT handler there verifies the code and finishes the sign-in;
// nothing about that route needs to change to support this second entry
// point into it.
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

// Sign-in via the in-app password (Security > Change Password), looked up
// by either the account's email or its saved contact phone number
// (users.phone) -- not a separate identity from the Google-linked account,
// just an alternate way in. Only works for accounts that have actually set
// a password; Google-only accounts have no password_hash and get a plain
// "incorrect" response same as a wrong password would, so this can't be
// used to probe which emails/numbers have accounts.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const identifier = typeof body?.identifier === "string" ? body.identifier.trim() : "";
  const method = body?.method === "phone" ? "phone" : "email";
  const password = typeof body?.password === "string" ? body.password : "";
  const deviceModel = typeof body?.deviceModel === "string" && body.deviceModel.trim() ? body.deviceModel.trim().slice(0, 60) : null;

  if (!identifier || !password) {
    return Response.json({ error: "Enter your details and password" }, { status: 400 });
  }

  const column = method === "phone" ? "phone" : "email";
  const lookupValue = method === "phone" ? identifier : identifier.toLowerCase();

  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id, email, name, image, password_hash, totp_enabled")
    .eq(column, lookupValue)
    .maybeSingle();

  const storedHash = userRow?.password_hash as string | null | undefined;
  if (!storedHash || !verifyPassword(password, storedHash)) {
    return Response.json({ error: "Incorrect details or password" }, { status: 401 });
  }

  const pending: PendingLogin = {
    sub: userRow!.id as string,
    email: userRow!.email as string,
    name: (userRow!.name as string | null) ?? null,
    picture: (userRow!.image as string | null) ?? null,
    deviceModel,
  };

  if (userRow!.totp_enabled) {
    const pendingId = crypto.randomUUID();
    await kv.set(pendingLoginKey(pendingId), pending, { ex: 300 });
    return Response.json({ totpRequired: true, pendingId });
  }

  return finishMobileSignIn(request, pending);
}
