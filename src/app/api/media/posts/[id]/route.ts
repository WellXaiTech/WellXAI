import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestUser } from "@/lib/requestUser";
import { deletePostImage, deletePostVideo } from "@/lib/mediaStorage";

// Only the post's own author can remove it -- this is a shared public feed,
// not a local per-device list, so ownership has to be checked server-side.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const { data: post } = await supabaseAdmin
      .from("media_posts")
      .select("user_id, image_url, video_url")
      .eq("id", id)
      .maybeSingle();
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    if (post.user_id !== user.id) {
      return NextResponse.json({ error: "You can only delete your own posts" }, { status: 403 });
    }
    const { data: carouselImages } = await supabaseAdmin.from("media_post_images").select("url").eq("post_id", id);
    // media_post_images rows themselves cascade-delete with the post (FK ON
    // DELETE CASCADE) -- only the underlying Storage files need cleaning up
    // by hand here.
    await supabaseAdmin.from("media_posts").delete().eq("id", id);
    await Promise.all([
      deletePostImage(post.image_url),
      deletePostVideo(post.video_url),
      ...(carouselImages ?? []).map((row) => deletePostImage(row.url)),
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Media post DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
