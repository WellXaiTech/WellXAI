import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ensureUserExists } from "@/lib/userIndex";
import { getRequestUser } from "@/lib/requestUser";

const MAX_COMMENT_LENGTH = 500;

type CommentRow = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  users: { name: string | null; image: string | null } | { name: string | null; image: string | null }[] | null;
};

function toComment(row: CommentRow) {
  const u = Array.isArray(row.users) ? row.users[0] : row.users;
  return {
    id: row.id,
    authorId: row.user_id,
    authorName: u?.name || "ChatGiZa user",
    authorImage: u?.image ?? null,
    text: row.content,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const { data } = await supabaseAdmin
      .from("media_comments")
      .select("id, user_id, content, created_at, users(name, image)")
      .eq("post_id", id)
      .order("created_at", { ascending: true });
    return NextResponse.json({ comments: ((data ?? []) as CommentRow[]).map(toComment) });
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

  try {
    await ensureUserExists(user.id, "", user.name, user.image ?? "");

    const { data, error } = await supabaseAdmin
      .from("media_comments")
      .insert({ post_id: id, user_id: user.id, content: text })
      .select()
      .single();
    if (error || !data) throw error ?? new Error("insert failed");

    return NextResponse.json({
      comment: { id: data.id, authorId: user.id, authorName: user.name, authorImage: user.image, text, createdAt: new Date(data.created_at).getTime() },
    });
  } catch (err) {
    console.error("Media comments POST error:", err);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}
