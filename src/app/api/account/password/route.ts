import { NextRequest, NextResponse } from "next/server";
import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "crypto";
import { kv } from "@vercel/kv";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestUser } from "@/lib/requestUser";
import { sendMail } from "@/lib/mailer";
import { passwordChangeCodeEmail } from "@/lib/emailTemplates";

// Node's built-in scrypt instead of a bcrypt dependency -- no native
// bindings to worry about on Vercel's serverless runtime, and it's already
// a recommended password-hashing KDF.
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function pendingPasswordKey(userId: string) {
  return `chatgiza:password-otp:${userId}`;
}

// Whether this account has ever set an in-app password -- accounts that
// have only ever signed in with Google won't have one, so the app can skip
// straight to "set a new password" instead of asking for a nonexistent one.
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin.from("users").select("password_hash").eq("id", user.id).maybeSingle();
  if (error) {
    console.error("Password status error:", error);
    return NextResponse.json({ error: "Failed to load password status" }, { status: 500 });
  }
  return NextResponse.json({ hasPassword: !!data?.password_hash });
}

// Step 1: verifies oldPassword (if one's already set), then emails a 6-digit
// code and stashes the new password's hash in KV against it -- the password
// itself isn't written to users.password_hash until the code is confirmed
// via PUT below, so a code someone else intercepts is useless without also
// getting past the Google-account inbox it was sent to.
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const oldPassword = typeof body?.oldPassword === "string" ? body.oldPassword : undefined;
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  try {
    const { data } = await supabaseAdmin.from("users").select("email, password_hash").eq("id", user.id).maybeSingle();
    const email = data?.email as string | null | undefined;
    if (!email) {
      return NextResponse.json({ error: "No email on file for this account" }, { status: 400 });
    }
    const existingHash = data?.password_hash as string | null | undefined;
    if (existingHash) {
      if (!oldPassword || !verifyPassword(oldPassword, existingHash)) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
      }
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    await kv.set(
      pendingPasswordKey(user.id),
      { code, newPasswordHash: hashPassword(newPassword) },
      { ex: 600 }
    );

    const { subject, html } = passwordChangeCodeEmail(code);
    await sendMail(email, subject, html);

    return NextResponse.json({ ok: true, codeSent: true });
  } catch (err) {
    console.error("Password change request error:", err);
    return NextResponse.json({ error: "Couldn't send the verification code -- try again" }, { status: 500 });
  }
}

// Step 2: confirms the emailed code and only then actually writes
// password_hash.
export async function PUT(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!code) {
    return NextResponse.json({ error: "Enter the code from your email" }, { status: 400 });
  }

  try {
    const pending = await kv.get<{ code: string; newPasswordHash: string }>(pendingPasswordKey(user.id));
    if (!pending || pending.code !== code) {
      return NextResponse.json({ error: "That code is incorrect or has expired" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("users").update({ password_hash: pending.newPasswordHash }).eq("id", user.id);
    if (error) throw error;
    await kv.del(pendingPasswordKey(user.id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Password change confirm error:", err);
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}
