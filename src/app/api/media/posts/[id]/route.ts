import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestUser } from "@/lib/requestUser";
import { deletePostImage } from "@/lib/mediaStorage";

// Only the post's own author can remove it -- this is a shared public feed,
// not a local per-device list, so ownership has to be checked server-side.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const { data: post } = await supabaseAdmin.from("media_posts").select("user_id, image_url").eq("id", id).maybeSingle();
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    if (post.user_id !== user.id) {
      return NextResponse.json({ error: "You can only delete your own posts" }, { status: 403 });
    }
    await supabaseAdmin.from("media_posts").delete().eq("id", id);
    await deletePostImage(post.image_url);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Media post DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
