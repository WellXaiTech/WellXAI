import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ensureUserExists } from "@/lib/userIndex";
import { getRequestUser } from "@/lib/requestUser";

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;

// Creates a new 'written' book -- status 'draft', no file yet -- with one
// empty first page, and returns it so the client can jump straight into the
// /ebook/[id] editor. Separate from the plain POST /api/ebooks (which saves
// an already-uploaded PDF's metadata) since this one also seeds ebook_pages.
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, MAX_TITLE_LENGTH) : "";
  const description =
    typeof body?.description === "string" ? body.description.trim().slice(0, MAX_DESCRIPTION_LENGTH) : "";
  if (!title) {
    return NextResponse.json({ error: "A title is required" }, { status: 400 });
  }

  try {
    await ensureUserExists(user.id, "", user.name, user.image ?? "");

    const { data: ebook, error } = await supabaseAdmin
      .from("ebooks")
      .insert({ user_id: user.id, title, description: description || null, source: "written", status: "draft", file_url: null })
      .select()
      .single();
    if (error || !ebook) throw error ?? new Error("insert failed");

    const { data: page, error: pageError } = await supabaseAdmin
      .from("ebook_pages")
      .insert({ ebook_id: ebook.id, position: 0, content: "" })
      .select()
      .single();
    if (pageError || !page) throw pageError ?? new Error("page insert failed");

    return NextResponse.json({
      ebook: {
        id: ebook.id,
        title: ebook.title,
        description: ebook.description,
        source: ebook.source,
        status: ebook.status,
        fileUrl: ebook.file_url,
        createdAt: new Date(ebook.created_at).getTime(),
      },
      firstPageId: page.id,
    });
  } catch (err) {
    console.error("Ebook draft POST error:", err);
    return NextResponse.json({ error: "Failed to start the book" }, { status: 500 });
  }
}
