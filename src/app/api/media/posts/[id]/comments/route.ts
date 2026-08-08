import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getRequestUser } from "@/lib/requestUser";

const MAX_COMMENT_LENGTH = 500;
const MAX_COMMENTS_PER_POST = 500;

type Comment = {
  id: string;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  text: string;
  createdAt: number;
};

function commentsKey(postId: string) {
  return `chatgiza:media-comments:${postId}`;
}

function parseComment(entry: unknown): Comment | null {
  try {
    const parsed = typeof entry === "string" ? JSON.parse(entry) : entry;
    if (parsed && typeof parsed.id === "string") return parsed as Comment;
    return null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id } = await params;

  try {
    // Oldest-first for reading a conversation top to bottom -- comments are
    // pushed onto the head with LPUSH for O(1) writes, so reverse on read.
    const raw = await kv.lrange<string>(commentsKey(id), 0, -1);
    const comments = raw.map(parseComment).filter((c): c is Comment => c !== null).reverse();
    return NextResponse.json({ comments });
  } catch (err) {
    console.error("Media comments GET error:", err);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, MAX_COMMENT_LENGTH) : "";
  if (!text) {
    return NextResponse.json({ error: "Comment can't be empty" }, { status: 400 });
  }

  const comment: Comment = {
    id: crypto.randomUUID(),
    authorId: user.id,
    authorName: user.name,
    authorImage: user.image,
    text,
    createdAt: Date.now(),
  };

  try {
    const key = commentsKey(id);
    await kv.lpush(key, JSON.stringify(comment));
    await kv.ltrim(key, 0, MAX_COMMENTS_PER_POST - 1);
    return NextResponse.json({ comment });
  } catch (err) {
    console.error("Media comments POST error:", err);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}
