import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestUser } from "@/lib/requestUser";

// Updates the account's contact email (users.email in Supabase). Separate
// from the Google sign-in identity itself -- changing this only updates
// where ChatGiZa shows/uses the address, the same way Change Password's
// in-app password is independent of the Google account.
export async function PUT(req: NextRequest) {
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

  try {
    const { error } = await supabaseAdmin.from("users").update({ email }).eq("id", user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true, email });
  } catch (err) {
    console.error("Email update error:", err);
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
