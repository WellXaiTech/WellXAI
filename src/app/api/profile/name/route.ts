import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestUser } from "@/lib/requestUser";

// Updates the account's real display name (users.name in Supabase) -- the
// same field Google sign-in writes, and the one every screen reads for the
// visible name (ChatGiZa Media posts/profile included), not just a
// device-local nickname.
export async function PUT(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 60) {
    return NextResponse.json({ error: "A name between 1 and 60 characters is required" }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin.from("users").update({ name }).eq("id", user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true, name });
  } catch (err) {
    console.error("Name update error:", err);
    return NextResponse.json({ error: "Failed to update name" }, { status: 500 });
  }
}
