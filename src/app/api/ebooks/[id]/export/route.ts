import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestUser } from "@/lib/requestUser";
import { textToPdfBuffer } from "@/lib/generatePdf";
import { uploadGeneratedEbook, deleteEbookFile } from "@/lib/ebookStorage";
import { htmlToMarkdown } from "@/lib/htmlToMarkdown";

function isHtmlEmpty(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").trim().length === 0;
}

// Assembles every page (in order) into one Markdown document, renders it to
// a real PDF, and uploads it -- turning a 'draft' written book into a
// 'ready' one with a real file_url. Pages stay editable afterward; exporting
// again just re-renders and replaces the file.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const { data: ebook } = await supabaseAdmin
      .from("ebooks")
      .select("user_id, title, file_url")
      .eq("id", id)
      .maybeSingle();
    if (ebook?.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: pages, error } = await supabaseAdmin
      .from("ebook_pages")
      .select("content")
      .eq("ebook_id", id)
      .order("position", { ascending: true });
    if (error) throw error;

    // Pages are stored as HTML (Tiptap's native format) -- converted back to
    // Markdown here since generatePdf.ts's renderer works line-by-line over
    // Markdown, not HTML. Alignment, text color, and highlight are lost in
    // this step; plain Markdown (and jsPDF's own rendering) has no
    // equivalent for any of them.
    const body = (pages ?? [])
      .filter((p) => !isHtmlEmpty(p.content))
      .map((p) => htmlToMarkdown(p.content))
      .join("\n\n---\n\n");
    if (!body) {
      return NextResponse.json({ error: "This book has no content yet" }, { status: 400 });
    }

    const pdfBuffer = await textToPdfBuffer(ebook.title, body);
    const fileUrl = await uploadGeneratedEbook(pdfBuffer, ebook.title);
    if (!fileUrl) {
      return NextResponse.json({ error: "Failed to save the exported PDF" }, { status: 500 });
    }

    const previousFileUrl = ebook.file_url as string | null;
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("ebooks")
      .update({ status: "ready", file_url: fileUrl })
      .eq("id", id)
      .select()
      .single();
    if (updateError || !updated) throw updateError ?? new Error("update failed");

    if (previousFileUrl) await deleteEbookFile(previousFileUrl);

    return NextResponse.json({
      ebook: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        source: updated.source,
        status: updated.status,
        fileUrl: updated.file_url,
        createdAt: new Date(updated.created_at).getTime(),
      },
    });
  } catch (err) {
    console.error("Ebook export error:", err);
    return NextResponse.json({ error: "Failed to export the book" }, { status: 500 });
  }
}
