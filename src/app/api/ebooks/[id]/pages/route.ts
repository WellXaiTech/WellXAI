import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestUser } from "@/lib/requestUser";

type PageRow = { id: string; position: number; content: string; updated_at: string };

function toPage(row: PageRow) {
  return { id: row.id, position: row.position, content: row.content, updatedAt: new Date(row.updated_at).getTime() };
}

async function assertOwnsEbook(ebookId: string, userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from("ebooks").select("user_id").eq("id", ebookId).maybeSingle();
  return data?.user_id === userId;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id } = await params;
  if (!(await assertOwnsEbook(id, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("ebook_pages")
    .select("id, position, content, updated_at")
    .eq("ebook_id", id)
    .order("position", { ascending: true });
  if (error) {
    console.error("Ebook pages GET error:", error);
    return NextResponse.json({ error: "Failed to load pages" }, { status: 500 });
  }
  return NextResponse.json({ pages: (data ?? []).map((row) => toPage(row as PageRow)) });
}

// Appends a new blank page at the end -- the editor calls this for its
// "+ Add page" button; content is filled in afterward by hand or AI.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id } = await params;
  if (!(await assertOwnsEbook(id, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const { count } = await supabaseAdmin
      .from("ebook_pages")
      .select("*", { count: "exact", head: true })
      .eq("ebook_id", id);

    const { data, error } = await supabaseAdmin
      .from("ebook_pages")
      .insert({ ebook_id: id, position: count ?? 0, content: "" })
      .select()
      .single();
    if (error || !data) throw error ?? new Error("insert failed");

    return NextResponse.json({ page: toPage(data as PageRow) });
  } catch (err) {
    console.error("Ebook pages POST error:", err);
    return NextResponse.json({ error: "Failed to add a page" }, { status: 500 });
  }
}
