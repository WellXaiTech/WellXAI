import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ensureUserExists } from "@/lib/userIndex";
import { getRequestUser } from "@/lib/requestUser";

const MAX_TEXT_LENGTH = 2000;
// No blob storage is wired up yet, so photos are inlined as base64 data
// URLs right in the post row. Capped well under Vercel's request body
// limit -- this is meant for a single shared photo, not a gallery.
const MAX_IMAGE_DATA_URL_LENGTH = 700_000;
const FEED_PAGE_SIZE = 50;

type Sentiment = "bullish" | "neutral" | "bearish";

type PostRow = {
  id: string;
  user_id: string;
  caption: string | null;
  image_url: string | null;
  sentiment: Sentiment | null;
  created_at: string;
  users: { name: string | null; image: string | null } | { name: string | null; image: string | null }[] | null;
};

function authorOf(row: PostRow): { authorName: string; authorImage: string | null } {
  const u = Array.isArray(row.users) ? row.users[0] : row.users;
  return { authorName: u?.name || "ChatGiZa user", authorImage: u?.image ?? null };
}

function toPost(row: PostRow) {
  return {
    id: row.id,
    authorId: row.user_id,
    ...authorOf(row),
    text: row.caption ?? "",
    imageDataUrl: row.image_url,
    sentiment: row.sentiment,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const { data: rows } = await supabaseAdmin
      .from("media_posts")
      .select("id, user_id, caption, image_url, sentiment, created_at, users(name, image)")
      .order("created_at", { ascending: false })
      .limit(FEED_PAGE_SIZE);
    const posts = ((rows ?? []) as PostRow[]).map(toPost);

    const [likeCounts, likedByMe, commentCounts] = await Promise.all([
      Promise.all(posts.map((p) => supabaseAdmin.from("media_likes").select("*", { count: "exact", head: true }).eq("post_id", p.id))),
      Promise.all(
        posts.map((p) => supabaseAdmin.from("media_likes").select("post_id").eq("post_id", p.id).eq("user_id", user.id).maybeSingle())
      ),
      Promise.all(posts.map((p) => supabaseAdmin.from("media_comments").select("*", { count: "exact", head: true }).eq("post_id", p.id))),
    ]);

    const enriched = posts.map((p, i) => ({
      ...p,
      likeCount: likeCounts[i].count ?? 0,
      likedByMe: likedByMe[i].data !== null,
      commentCount: commentCounts[i].count ?? 0,
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
    typeof body?.imageDataUrl === "string" &&
    body.imageDataUrl.startsWith("data:image/") &&
    body.imageDataUrl.length <= MAX_IMAGE_DATA_URL_LENGTH
      ? body.imageDataUrl
      : null;
  const sentiment: Sentiment | null =
    body?.sentiment === "bullish" || body?.sentiment === "neutral" || body?.sentiment === "bearish" ? body.sentiment : null;

  if (!text && !imageDataUrl) {
    return NextResponse.json({ error: "A post needs text or a photo" }, { status: 400 });
  }

  try {
    await ensureUserExists(user.id, "", user.name, user.image ?? "");

    const { data, error } = await supabaseAdmin
      .from("media_posts")
      .insert({ user_id: user.id, caption: text || null, image_url: imageDataUrl, sentiment })
      .select()
      .single();
    if (error || !data) throw error ?? new Error("insert failed");

    return NextResponse.json({
      post: {
        id: data.id,
        authorId: user.id,
        authorName: user.name,
        authorImage: user.image,
        text,
        imageDataUrl,
        sentiment,
        createdAt: new Date(data.created_at).getTime(),
        likeCount: 0,
        likedByMe: false,
        commentCount: 0,
      },
    });
  } catch (err) {
    console.error("Media posts POST error:", err);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
