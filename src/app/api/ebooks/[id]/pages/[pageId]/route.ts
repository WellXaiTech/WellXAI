import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestUser } from "@/lib/requestUser";

const MAX_CONTENT_LENGTH = 20_000;

async function loadOwnedPage(ebookId: string, pageId: string, userId: string) {
  const { data: ebook } = await supabaseAdmin.from("ebooks").select("user_id").eq("id", ebookId).maybeSingle();
  if (ebook?.user_id !== userId) return null;
  const { data: page } = await supabaseAdmin
    .from("ebook_pages")
    .select("id, ebook_id, position")
    .eq("id", pageId)
    .eq("ebook_id", ebookId)
    .maybeSingle();
  return page ?? null;
}

// Autosave for the editor's textarea (content), and the up/down reorder
// controls (position) -- both land here since a page only ever has these
// two mutable fields.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; pageId: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id, pageId } = await params;
  const body = await req.json().catch(() => null);

  const updates: Record<string, string | number> = { updated_at: new Date().toISOString() };
  if (typeof body?.content === "string") updates.content = body.content.slice(0, MAX_CONTENT_LENGTH);
  if (typeof body?.position === "number" && Number.isInteger(body.position)) updates.position = body.position;
  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const owned = await loadOwnedPage(id, pageId, user.id);
    if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data, error } = await supabaseAdmin
      .from("ebook_pages")
      .update(updates)
      .eq("id", pageId)
      .select("id, position, content, updated_at")
      .single();
    if (error || !data) throw error ?? new Error("update failed");

    return NextResponse.json({
      page: { id: data.id, position: data.position, content: data.content, updatedAt: new Date(data.updated_at).getTime() },
    });
  } catch (err) {
    console.error("Ebook page PATCH error:", err);
    return NextResponse.json({ error: "Failed to save the page" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; pageId: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id, pageId } = await params;

  try {
    const owned = await loadOwnedPage(id, pageId, user.id);
    if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { error } = await supabaseAdmin.from("ebook_pages").delete().eq("id", pageId);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Ebook page DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete the page" }, { status: 500 });
  }
}
