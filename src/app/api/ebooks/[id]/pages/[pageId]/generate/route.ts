import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestUser } from "@/lib/requestUser";
import { generateEbookPage } from "@/lib/ai";
import { htmlToMarkdown } from "@/lib/htmlToMarkdown";
import { markdownToHtml } from "@/lib/markdownToHtml";

const MAX_INSTRUCTION_LENGTH = 1000;

// The editor's "Write with AI" button on a single page -- writes just that
// page, using every earlier page (by position) as context, and returns the
// draft text for the user to review/edit before it's saved (saving still
// goes through the plain PATCH route once they're happy with it).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; pageId: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id, pageId } = await params;
  const body = await req.json().catch(() => null);
  const instruction = typeof body?.instruction === "string" ? body.instruction.trim().slice(0, MAX_INSTRUCTION_LENGTH) : "";

  try {
    const { data: ebook } = await supabaseAdmin
      .from("ebooks")
      .select("user_id, title, description")
      .eq("id", id)
      .maybeSingle();
    if (ebook?.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: targetPage } = await supabaseAdmin
      .from("ebook_pages")
      .select("position")
      .eq("id", pageId)
      .eq("ebook_id", id)
      .maybeSingle();
    if (!targetPage) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: earlierPages, error } = await supabaseAdmin
      .from("ebook_pages")
      .select("content, position")
      .eq("ebook_id", id)
      .lt("position", targetPage.position)
      .order("position", { ascending: true });
    if (error) throw error;

    // Pages are stored as HTML (Tiptap's native format) -- converted back to
    // Markdown here so the model's context is clean prose, not raw tags.
    const markdown = await generateEbookPage(
      ebook.title,
      ebook.description ?? "",
      (earlierPages ?? []).map((p) => htmlToMarkdown(p.content)),
      instruction
    );

    return NextResponse.json({ content: markdownToHtml(markdown) });
  } catch (err) {
    console.error("Ebook page generate error:", err);
    const message = err instanceof Error ? err.message : "Failed to write this page";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
