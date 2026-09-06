import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { kv } from "@vercel/kv";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestUser } from "@/lib/requestUser";
import { sendMail } from "@/lib/mailer";
import { emailChangeCodeEmail } from "@/lib/emailTemplates";
import { checkRateLimit } from "@/lib/rateLimit";

function pendingEmailKey(userId: string) {
  return `chatgiza:email-otp:${userId}`;
}

// Step 1: validates the requested new address and emails a 6-digit code TO
// THAT ADDRESS -- proving the account actually controls it before it
// becomes the account's contact email, same two-step shape as Change
// Password (see /api/account/password). This used to update users.email
// on request alone with no proof of ownership: this address is also where
// password-reset codes go (see /api/account/password) and doubles as an
// email+password sign-in identifier (see /api/mobile/auth-password), so
// silently repointing it let anyone with a brief window of account access
// redirect future account-recovery entirely to an address they control.
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!email || email.length > 254 || !validEmail) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const rate = await checkRateLimit(`email-change:${user.id}`, 10, 900);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many attempts -- try again in a few minutes" }, { status: 429 });
  }

  try {
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    await kv.set(pendingEmailKey(user.id), { code, email }, { ex: 300 });

    const { subject, html, from } = emailChangeCodeEmail(code);
    await sendMail(email, subject, html, from);

    return NextResponse.json({ ok: true, codeSent: true });
  } catch (err) {
    console.error("Email change request error:", err);
    return NextResponse.json({ error: "Couldn't send the verification code -- try again" }, { status: 500 });
  }
}

// Step 2: confirms the code sent to the new address and only then actually
// writes users.email.
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

  const rate = await checkRateLimit(`email-otp:${user.id}`, 10, 900);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many attempts -- try again in a few minutes" }, { status: 429 });
  }

  try {
    const pending = await kv.get<{ code: string; email: string }>(pendingEmailKey(user.id));
    if (!pending || pending.code !== code) {
      return NextResponse.json({ error: "That code is incorrect or has expired" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("users").update({ email: pending.email }).eq("id", user.id);
    if (error) throw error;
    await kv.del(pendingEmailKey(user.id));
    return NextResponse.json({ ok: true, email: pending.email });
  } catch (err) {
    console.error("Email change confirm error:", err);
    return NextResponse.json({ error: "Failed to update email" }, { status: 500 });
  }
}

// Unlinks the contact email (sets users.email to null). Safe to do because
// the account's real identity is the Google sub stored in users.id, not
// this address -- Google sign-in and passkeys keep working. The one real
// consequence: email-based password sign-in (POST /api/mobile/auth-password
// with method "email") can no longer find this account until an email is
// set again.
export async function DELETE(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const { error } = await supabaseAdmin.from("users").update({ email: null }).eq("id", user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Email unlink error:", err);
    return NextResponse.json({ error: "Failed to unlink email" }, { status: 500 });
  }
}
