import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getRequestUser } from "@/lib/requestUser";

const FEED_KEY = "chatgiza:media-posts";

// Only the post's own author can remove it -- this is a shared public feed
// now, not a local per-device list, so "dismiss" has to actually check
// ownership server-side rather than just filtering a local array.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const raw = await kv.lrange<string>(FEED_KEY, 0, -1);
    const entry = raw.find((e) => {
      try {
        return (typeof e === "string" ? JSON.parse(e) : e)?.id === id;
      } catch {
        return false;
      }
    });
    if (!entry) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    const parsed = typeof entry === "string" ? JSON.parse(entry) : entry;
    if (parsed.authorId !== user.id) {
      return NextResponse.json({ error: "You can only delete your own posts" }, { status: 403 });
    }
    await kv.lrem(FEED_KEY, 1, entry);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Media post DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
