import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestUser } from "@/lib/requestUser";
import { deleteEbookFile, isOwnEbookUrl } from "@/lib/ebookStorage";

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;

export type EbookCover = {
  title?: string;
  subtitle?: string;
  author?: string;
  background?: string;
  imageUrl?: string;
};

type EbookRow = {
  id: string;
  title: string;
  description: string | null;
  source: "uploaded" | "written";
  status: "draft" | "ready";
  file_url: string | null;
  cover: EbookCover | null;
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
    cover: row.cover,
    createdAt: new Date(row.created_at).getTime(),
  };
}

async function loadOwnedEbook(id: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("ebooks")
    .select("id, user_id, title, description, source, status, file_url, cover, created_at")
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

  try {
    const existing = await loadOwnedEbook(id, user.id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updates: Record<string, string | EbookCover | null> = {};
    // Lets a written book's PDF be replaced by one the writer already has,
    // as an alternative to the page-by-page /export pipeline -- same
    // ownership check as a normal upload (POST /api/ebooks), just applied
    // to an existing book instead of a brand new one. Also flips status to
    // 'ready' so the editor's own "View PDF" affordance picks it up.
    if (typeof body?.fileUrl === "string") {
      if (!isOwnEbookUrl(body.fileUrl)) {
        return NextResponse.json({ error: "Invalid file" }, { status: 400 });
      }
      updates.file_url = body.fileUrl;
      updates.status = "ready";
    }
    if (typeof body?.title === "string") {
      const title = body.title.trim().slice(0, MAX_TITLE_LENGTH);
      if (!title) return NextResponse.json({ error: "A title is required" }, { status: 400 });
      updates.title = title;
    }
    if (typeof body?.description === "string") {
      updates.description = body.description.trim().slice(0, MAX_DESCRIPTION_LENGTH) || null;
    }
    // Merged shallowly with whatever's already saved (not replaced outright)
    // so, e.g., typing a subtitle doesn't wipe out an already-generated
    // cover image the client's own local state doesn't currently hold.
    if (body?.cover && typeof body.cover === "object") {
      const merged: EbookCover = { ...(existing.cover ?? {}), ...body.cover };
      (Object.keys(merged) as (keyof EbookCover)[]).forEach((k) => {
        if (merged[k] === null || merged[k] === undefined || merged[k] === "") delete merged[k];
      });
      updates.cover = merged;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

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
