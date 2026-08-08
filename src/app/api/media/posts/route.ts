import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getRequestUser } from "@/lib/requestUser";

// ChatGiZa Media's public feed — every signed-in user can read it, and any
// signed-in user can post to it. Stored as a Redis LIST (not a single JSON
// blob) so two people posting at once can't clobber each other's write —
// LPUSH is atomic, a read-modify-write on one big array wouldn't be.
const FEED_KEY = "chatgiza:media-posts";
const MAX_FEED_LENGTH = 300;
const MAX_TEXT_LENGTH = 2000;
// No blob storage is provisioned yet, so photos are inlined as base64 data
// URLs right in the post record. Capped well under Vercel's request body
// limit -- this is meant for a single shared photo, not a gallery.
const MAX_IMAGE_DATA_URL_LENGTH = 700_000;

type Sentiment = "bullish" | "neutral" | "bearish";

type MediaPost = {
  id: string;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  text: string;
  imageDataUrl: string | null;
  sentiment: Sentiment | null;
  createdAt: number;
};

function likesKey(postId: string) {
  return `chatgiza:media-post-likes:${postId}`;
}

function commentsKey(postId: string) {
  return `chatgiza:media-comments:${postId}`;
}

function parsePost(entry: unknown): MediaPost | null {
  try {
    const parsed = typeof entry === "string" ? JSON.parse(entry) : entry;
    if (parsed && typeof parsed.id === "string") return parsed as MediaPost;
    return null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const raw = await kv.lrange<string>(FEED_KEY, 0, 49);
    const posts = raw.map(parsePost).filter((p): p is MediaPost => p !== null);

    const [likeCounts, likedByMe, commentCounts] = await Promise.all([
      Promise.all(posts.map((p) => kv.scard(likesKey(p.id)))),
      Promise.all(posts.map((p) => kv.sismember(likesKey(p.id), user.id))),
      Promise.all(posts.map((p) => kv.llen(commentsKey(p.id)))),
    ]);

    const enriched = posts.map((p, i) => ({
      ...p,
      likeCount: likeCounts[i] ?? 0,
      likedByMe: Boolean(likedByMe[i]),
      commentCount: commentCounts[i] ?? 0,
    }));

    return NextResponse.json({ posts: enriched });
  } catch (err) {
    console.error("Media posts GET error:", err);
    return NextResponse.json({ error: "Failed to load posts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, MAX_TEXT_LENGTH) : "";
  const imageDataUrl =
    typeof body?.imageDataUrl === "string" && body.imageDataUrl.startsWith("data:image/") &&
    body.imageDataUrl.length <= MAX_IMAGE_DATA_URL_LENGTH
      ? body.imageDataUrl
      : null;
  const sentiment: Sentiment | null =
    body?.sentiment === "bullish" || body?.sentiment === "neutral" || body?.sentiment === "bearish"
      ? body.sentiment
      : null;

  if (!text && !imageDataUrl) {
    return NextResponse.json({ error: "A post needs text or a photo" }, { status: 400 });
  }

  const post: MediaPost = {
    id: crypto.randomUUID(),
    authorId: user.id,
    authorName: user.name,
    authorImage: user.image,
    text,
    imageDataUrl,
    sentiment,
    createdAt: Date.now(),
  };

  try {
    await kv.lpush(FEED_KEY, JSON.stringify(post));
    await kv.ltrim(FEED_KEY, 0, MAX_FEED_LENGTH - 1);
    return NextResponse.json({ post: { ...post, likeCount: 0, likedByMe: false, commentCount: 0 } });
  } catch (err) {
    console.error("Media posts POST error:", err);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
