import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestUser } from "@/lib/requestUser";
import { uploadPostImage } from "@/lib/mediaStorage";

const MAX_IMAGE_DATA_URL_LENGTH = 700_000;

// Updates the account's real avatar (users.image in Supabase) -- separate
// from the rest of /api/profile since that's KV-backed nickname/bio/etc,
// while the avatar lives alongside the rest of the account record (same
// field Google sign-in itself writes). Lets picking a preset avatar in the
// Android app's picker actually show up everywhere userImage is read --
// ChatGiZa Media posts/profile included -- not just the couple of screens
// that check the local preset id directly. Also accepts a base64 data URL
// (a photo picked from the device's own gallery) -- uploaded to the same
// Storage bucket ChatGiZa Media post photos use, so users.image never ends
// up holding a giant base64 blob.
export async function PUT(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const input = typeof body?.image === "string" ? body.image.trim() : "";

  let image: string;
  if (input.startsWith("data:image/")) {
    if (input.length > MAX_IMAGE_DATA_URL_LENGTH) {
      return NextResponse.json({ error: "That photo is too large" }, { status: 400 });
    }
    const uploaded = await uploadPostImage(input);
    if (!uploaded) {
      return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
    }
    image = uploaded;
  } else if (input && input.length <= 500 && /^https:\/\//.test(input)) {
    image = input;
  } else {
    return NextResponse.json({ error: "A valid image is required" }, { status: 400 });
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
