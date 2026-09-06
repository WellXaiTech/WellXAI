import { resolveMobileSignIn } from "@/lib/mobileAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPassword } from "@/lib/password";
import { checkRateLimit } from "@/lib/rateLimit";
import { clientIpFromHeaders } from "@/lib/sessions";

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

  // Two independent limiters: one per source IP so a single attacker can't
  // spray guesses across many accounts, one per identifier so a botnet
  // can't spread guesses against one account across many IPs.
  const ip = clientIpFromHeaders(request.headers);
  const [ipRate, idRate] = await Promise.all([
    checkRateLimit(`pwd-mobile-ip:${ip}`, 20, 900),
    checkRateLimit(`pwd-mobile-id:${lookupValue}`, 10, 900),
  ]);
  if (!ipRate.allowed || !idRate.allowed) {
    return Response.json({ error: "Too many attempts -- try again in a few minutes" }, { status: 429 });
  }

  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id, email, name, image, password_hash")
    .eq(column, lookupValue)
    .maybeSingle();

  const storedHash = userRow?.password_hash as string | null | undefined;
  if (!storedHash || !verifyPassword(password, storedHash)) {
    return Response.json({ error: "Incorrect details or password" }, { status: 401 });
  }

  const pending = {
    sub: userRow!.id as string,
    email: userRow!.email as string | null,
    name: (userRow!.name as string | null) ?? null,
    picture: (userRow!.image as string | null) ?? null,
    deviceModel,
  };

  return resolveMobileSignIn(request, pending, body?.deviceTrustToken);
}
