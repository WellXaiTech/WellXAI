import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestUser } from "@/lib/requestUser";

// Updates the account's contact phone number (users.phone in Supabase).
// Self-reported, not SMS-verified -- there's no SMS provider wired up here,
// same trust level as the in-app password.
export async function PUT(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  if (!phone || phone.length > 20 || !/^[0-9+()\-\s]+$/.test(phone)) {
    return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin.from("users").update({ phone }).eq("id", user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true, phone });
  } catch (err) {
    console.error("Phone update error:", err);
    return NextResponse.json({ error: "Failed to update phone number" }, { status: 500 });
  }
}
