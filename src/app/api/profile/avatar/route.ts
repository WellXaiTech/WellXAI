import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestUser } from "@/lib/requestUser";

// Updates the account's real avatar (users.image in Supabase) -- separate
// from the rest of /api/profile since that's KV-backed nickname/bio/etc,
// while the avatar lives alongside the rest of the account record (same
// field Google sign-in itself writes). Lets picking a preset avatar in the
// Android app's picker actually show up everywhere userImage is read --
// ChatGiZa Media posts/profile included -- not just the couple of screens
// that check the local preset id directly.
export async function PUT(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const image = typeof body?.image === "string" ? body.image.trim() : "";
  if (!image || image.length > 500 || !/^https:\/\//.test(image)) {
    return NextResponse.json({ error: "A valid https image URL is required" }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin.from("users").update({ image }).eq("id", user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true, image });
  } catch (err) {
    console.error("Avatar update error:", err);
    return NextResponse.json({ error: "Failed to update avatar" }, { status: 500 });
  }
}
