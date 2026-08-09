import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ensureUserExists } from "@/lib/userIndex";
import { getRequestUser } from "@/lib/requestUser";
import { uploadPostImage, isOwnVideoUrl } from "@/lib/mediaStorage";

const MAX_TEXT_LENGTH = 2000;
// The client still sends base64 data URLs (that's what the existing upload
// flow produces) -- each capped well under Vercel's request body limit.
// The server uploads them to Supabase Storage and stores the resulting
// public URLs, not the base64 itself.
const MAX_IMAGE_DATA_URL_LENGTH = 700_000;
const MAX_IMAGES_PER_POST = 10;
const FEED_PAGE_SIZE = 50;

type Sentiment = "bullish" | "neutral" | "bearish";

type PostRow = {
  id: string;
  user_id: string;
  caption: string | null;
  image_url: string | null;
  video_url: string | null;
  sentiment: Sentiment | null;
  created_at: string;
  users: { name: string | null; image: string | null } | { name: string | null; image: string | null }[] | null;
};

function authorOf(row: PostRow): { authorName: string; authorImage: string | null } {
  const u = Array.isArray(row.users) ? row.users[0] : row.users;
  return { authorName: u?.name || "ChatGiZa user", authorImage: u?.image ?? null };
}

// Posts have moved to a media_post_images carousel table, but older rows
// (and older API clients) only ever had the single image_url column -- this
// merges both into one imageUrls[] shape so every caller only deals with
// one representation, new or legacy.
function toPost(row: PostRow, carouselUrls: string[] | undefined) {
  const imageUrls = carouselUrls?.length ? carouselUrls : row.image_url ? [row.image_url] : [];
  return {
    id: row.id,
    authorId: row.user_id,
    ...authorOf(row),
    text: row.caption ?? "",
    imageDataUrl: imageUrls[0] ?? null,
    imageUrls,
    videoUrl: row.video_url,
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
    // The FK must be named explicitly -- media_likes and media_comments each
    // also link media_posts to users, so a bare "users(...)" embed is
    // ambiguous to PostgREST (it errors with PGRST201, which silently
    // became an empty feed here since only `data` was destructured).
    const { data: rows, error } = await supabaseAdmin
      .from("media_posts")
      .select("id, user_id, caption, image_url, video_url, sentiment, created_at, users!media_posts_user_id_fkey(name, image)")
      .order("created_at", { ascending: false })
      .limit(FEED_PAGE_SIZE);
    if (error) throw error;
    const postRows = (rows ?? []) as PostRow[];
    const postIds = postRows.map((r) => r.id);

    const { data: imageRows, error: imageErr } = await supabaseAdmin
      .from("media_post_images")
      .select("post_id, url, position")
      .in("post_id", postIds.length ? postIds : ["__none__"])
      .order("position", { ascending: true });
    if (imageErr) throw imageErr;
    const carouselByPost = new Map<string, string[]>();
    for (const row of imageRows ?? []) {
      const list = carouselByPost.get(row.post_id) ?? [];
      list.push(row.url);
      carouselByPost.set(row.post_id, list);
    }

    const posts = postRows.map((row) => toPost(row, carouselByPost.get(row.id)));

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

  // Accepts the new plural imageDataUrls (a carousel) or the older singular
  // imageDataUrl (still sent by not-yet-updated clients) -- normalized to
  // one list either way.
  const rawImageInputs: string[] = Array.isArray(body?.imageDataUrls)
    ? body.imageDataUrls.filter((u: unknown): u is string => typeof u === "string")
    : typeof body?.imageDataUrl === "string"
      ? [body.imageDataUrl]
      : [];
  if (rawImageInputs.length > MAX_IMAGES_PER_POST) {
    return NextResponse.json({ error: `A post can have at most ${MAX_IMAGES_PER_POST} photos` }, { status: 400 });
  }
  for (const dataUrl of rawImageInputs) {
    if (!dataUrl.startsWith("data:image/")) {
      return NextResponse.json({ error: "Invalid photo data" }, { status: 400 });
    }
    if (dataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
      return NextResponse.json({ error: "One of the photos is too large" }, { status: 400 });
    }
  }

  // Videos are uploaded straight to Storage by the client beforehand (see
  // /api/media/video-upload-url) -- here we only ever receive the resulting
  // URL, which we verify actually points at our own video bucket before
  // trusting it, since we never saw the bytes ourselves.
  const videoUrl = typeof body?.videoUrl === "string" && isOwnVideoUrl(body.videoUrl) ? body.videoUrl : null;
  const sentiment: Sentiment | null =
    body?.sentiment === "bullish" || body?.sentiment === "neutral" || body?.sentiment === "bearish" ? body.sentiment : null;

  if (!text && rawImageInputs.length === 0 && !videoUrl) {
    return NextResponse.json({ error: "A post needs text, a photo, or a video" }, { status: 400 });
  }

  try {
    await ensureUserExists(user.id, "", user.name, user.image ?? "");

    const uploadedUrls = await Promise.all(rawImageInputs.map((dataUrl) => uploadPostImage(dataUrl)));
    if (uploadedUrls.some((url) => !url)) {
      return NextResponse.json({ error: "Failed to upload one of the photos" }, { status: 500 });
    }
    const imageUrls = uploadedUrls as string[];

    const { data, error } = await supabaseAdmin
      .from("media_posts")
      .insert({ user_id: user.id, caption: text || null, video_url: videoUrl, sentiment })
      .select()
      .single();
    if (error || !data) throw error ?? new Error("insert failed");

    if (imageUrls.length > 0) {
      const { error: imagesError } = await supabaseAdmin
        .from("media_post_images")
        .insert(imageUrls.map((url, position) => ({ post_id: data.id, url, position })));
      if (imagesError) throw imagesError;
    }

    return NextResponse.json({
      post: {
        id: data.id,
        authorId: user.id,
        authorName: user.name,
        authorImage: user.image,
        text,
        imageDataUrl: imageUrls[0] ?? null,
        imageUrls,
        videoUrl,
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
