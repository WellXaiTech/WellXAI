import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestUser } from "@/lib/requestUser";
import { generateEbookCoverImage } from "@/lib/ai";
import { uploadCoverImage } from "@/lib/ebookStorage";

// Generates a cover image with AI and saves it as this book's cover.imageUrl
// straight away (rather than just returning the bytes) -- one request from
// the editor's "Generate with AI" button does the whole round trip.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id } = await params;

  const { data: ebook } = await supabaseAdmin
    .from("ebooks")
    .select("user_id, title, description, cover")
    .eq("id", id)
    .maybeSingle();
  if (!ebook || ebook.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const bytes = await generateEbookCoverImage(ebook.title, ebook.description ?? "");
    const imageUrl = await uploadCoverImage(bytes);
    if (!imageUrl) throw new Error("Failed to store the generated cover");

    const cover = { ...(ebook.cover ?? {}), imageUrl };
    const { data, error } = await supabaseAdmin.from("ebooks").update({ cover }).eq("id", id).select("cover").single();
    if (error || !data) throw error ?? new Error("update failed");

    return NextResponse.json({ cover: data.cover });
  } catch (err) {
    console.error("Ebook cover generate error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate a cover";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
