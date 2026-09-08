import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ensureUserExists } from "@/lib/userIndex";
import { getRequestUser } from "@/lib/requestUser";
import { isOwnEbookUrl } from "@/lib/ebookStorage";
import type { EbookCover } from "./[id]/route";

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;

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

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("ebooks")
    .select("id, title, description, source, status, file_url, cover, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Ebooks GET error:", error);
    return NextResponse.json({ error: "Failed to load e-books" }, { status: 500 });
  }

  return NextResponse.json({ ebooks: (data ?? []).map((row) => toEbook(row as EbookRow)) });
}

// Saves the metadata row for a PDF the client already uploaded directly to
// Storage via /api/ebooks/upload-url -- this route never sees the file bytes
// for an upload, only the resulting URL, which it verifies actually points
// at our own bucket before trusting it (see isOwnEbookUrl).
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, MAX_TITLE_LENGTH) : "";
  const description =
    typeof body?.description === "string" ? body.description.trim().slice(0, MAX_DESCRIPTION_LENGTH) : "";
  const fileUrl = typeof body?.fileUrl === "string" ? body.fileUrl : "";

  if (!title) {
    return NextResponse.json({ error: "A title is required" }, { status: 400 });
  }
  if (!fileUrl || !isOwnEbookUrl(fileUrl)) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }

  try {
    await ensureUserExists(user.id, "", user.name, user.image ?? "");

    const { data, error } = await supabaseAdmin
      .from("ebooks")
      .insert({
        user_id: user.id,
        title,
        description: description || null,
        source: "uploaded",
        status: "ready",
        file_url: fileUrl,
      })
      .select()
      .single();
    if (error || !data) throw error ?? new Error("insert failed");

    return NextResponse.json({ ebook: toEbook(data as EbookRow) });
  } catch (err) {
    console.error("Ebooks POST error:", err);
    return NextResponse.json({ error: "Failed to save the book" }, { status: 500 });
  }
}
