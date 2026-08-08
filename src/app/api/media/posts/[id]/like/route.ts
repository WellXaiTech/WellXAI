import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getRequestUser } from "@/lib/requestUser";

function likesKey(postId: string) {
  return `chatgiza:media-post-likes:${postId}`;
}

// A Redis SET of liker ids, not a counter on the post record itself --
// toggling is then just "am I already in the set" (SISMEMBER) followed by
// SADD/SREM, which is safe under concurrent likes from different users in
// a way a read-post/increment-count/write-post round trip would not be.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id } = await params;
  const key = likesKey(id);

  try {
    const alreadyLiked = await kv.sismember(key, user.id);
    if (alreadyLiked) {
      await kv.srem(key, user.id);
    } else {
      await kv.sadd(key, user.id);
    }
    const likeCount = await kv.scard(key);
    return NextResponse.json({ liked: !alreadyLiked, likeCount });
  } catch (err) {
    console.error("Media post like error:", err);
    return NextResponse.json({ error: "Failed to update like" }, { status: 500 });
  }
}
