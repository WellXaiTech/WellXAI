import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestUser } from "@/lib/requestUser";
import { generateTotpSecret, generateTotpUri, verifyTotp } from "@/lib/totp";

function pendingTotpSetupKey(userId: string) {
  return `chatgiza:totp-setup:${userId}`;
}

// Whether Authenticator App 2FA is currently on for this account.
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin.from("users").select("totp_enabled").eq("id", user.id).maybeSingle();
  if (error) {
    console.error("TOTP status error:", error);
    return NextResponse.json({ error: "Failed to load 2FA status" }, { status: 500 });
  }
  return NextResponse.json({ enabled: !!data?.totp_enabled });
}

// Step 1: generates a fresh secret and stages it in KV -- not written to
// users.totp_secret / turned on until the first code from the authenticator
// app is confirmed via PUT below, so a setup that's abandoned mid-way never
// silently locks the account behind a code no app ever produced.
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const { data } = await supabaseAdmin.from("users").select("email").eq("id", user.id).maybeSingle();
    const email = (data?.email as string | null) || user.id;

    const secret = generateTotpSecret();
    await kv.set(pendingTotpSetupKey(user.id), { secret }, { ex: 600 });

    return NextResponse.json({ secret, otpauthUri: generateTotpUri(secret, email) });
  } catch (err) {
    console.error("TOTP setup error:", err);
    return NextResponse.json({ error: "Couldn't start 2FA setup -- try again" }, { status: 500 });
  }
}

// Step 2: confirms the first code from the authenticator app and only then
// turns 2FA on, proving the scan/manual entry actually worked before it
// starts being required at login.
export async function PUT(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!code) {
    return NextResponse.json({ error: "Enter the code from your authenticator app" }, { status: 400 });
  }

  try {
    const pending = await kv.get<{ secret: string }>(pendingTotpSetupKey(user.id));
    if (!pending?.secret || !verifyTotp(pending.secret, code)) {
      return NextResponse.json({ error: "That code is incorrect or has expired" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("users").update({ totp_secret: pending.secret, totp_enabled: true }).eq("id", user.id);
    if (error) throw error;
    await kv.del(pendingTotpSetupKey(user.id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("TOTP confirm error:", err);
    return NextResponse.json({ error: "Failed to enable 2FA" }, { status: 500 });
  }
}

// Turns 2FA back off. Requires a currently-valid code, same bar as turning
// it on, so a stolen session token alone can't disable the account's
// second factor.
export async function DELETE(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!code) {
    return NextResponse.json({ error: "Enter your current authenticator code" }, { status: 400 });
  }

  try {
    const { data } = await supabaseAdmin.from("users").select("totp_secret").eq("id", user.id).maybeSingle();
    const secret = data?.totp_secret as string | null;
    if (!secret || !verifyTotp(secret, code)) {
      return NextResponse.json({ error: "That code is incorrect" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("users").update({ totp_secret: null, totp_enabled: false }).eq("id", user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("TOTP disable error:", err);
    return NextResponse.json({ error: "Failed to disable 2FA" }, { status: 500 });
  }
}
