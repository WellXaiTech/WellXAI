import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestUser } from "@/lib/requestUser";
import { deleteEbookFile } from "@/lib/ebookStorage";

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;

type EbookRow = {
  id: string;
  title: string;
  description: string | null;
  source: "uploaded" | "written";
  status: "draft" | "ready";
  file_url: string | null;
  created_at: string;
};

function toEbook(row: EbookRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    source: row.source,
    status: row.status,
    fileUrl: row.file_url,
    createdAt: new Date(row.created_at).getTime(),
  };
}

async function loadOwnedEbook(id: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("ebooks")
    .select("id, user_id, title, description, source, status, file_url, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.user_id !== userId) return null;
  return data as EbookRow & { user_id: string };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const row = await loadOwnedEbook(id, user.id);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ebook: toEbook(row) });
  } catch (err) {
    console.error("Ebook GET error:", err);
    return NextResponse.json({ error: "Failed to load the book" }, { status: 500 });
  }
}

// Renames a book or edits its brief -- the editor's title field and the
// "what this book is about" brief (also used as extra context for
// generateEbookPage) both save through here.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);

  const updates: Record<string, string | null> = {};
  if (typeof body?.title === "string") {
    const title = body.title.trim().slice(0, MAX_TITLE_LENGTH);
    if (!title) return NextResponse.json({ error: "A title is required" }, { status: 400 });
    updates.title = title;
  }
  if (typeof body?.description === "string") {
    updates.description = body.description.trim().slice(0, MAX_DESCRIPTION_LENGTH) || null;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const existing = await loadOwnedEbook(id, user.id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data, error } = await supabaseAdmin.from("ebooks").update(updates).eq("id", id).select().single();
    if (error || !data) throw error ?? new Error("update failed");
    return NextResponse.json({ ebook: toEbook(data as EbookRow) });
  } catch (err) {
    console.error("Ebook PATCH error:", err);
    return NextResponse.json({ error: "Failed to update the book" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id } = await params;

  const { data: row, error: fetchError } = await supabaseAdmin
    .from("ebooks")
    .select("id, user_id, file_url")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) {
    console.error("Ebook DELETE fetch error:", fetchError);
    return NextResponse.json({ error: "Failed to delete the book" }, { status: 500 });
  }
  if (!row || row.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ebook_pages rows cascade-delete via their FK, no separate cleanup needed.
  const { error } = await supabaseAdmin.from("ebooks").delete().eq("id", id);
  if (error) {
    console.error("Ebook DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete the book" }, { status: 500 });
  }

  await deleteEbookFile(row.file_url);
  return NextResponse.json({ ok: true });
}
