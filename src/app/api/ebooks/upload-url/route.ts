import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { createEbookUploadSlot } from "@/lib/ebookStorage";

// Mints a short-lived Supabase Storage signed upload URL so the client can
// upload a PDF directly to Storage -- same reasoning as
// /api/media/video-upload-url: books can be too large to pass through this
// API's own request body.
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const filename = typeof body?.filename === "string" ? body.filename : "book.pdf";

  const slot = await createEbookUploadSlot(filename);
  if (!slot) {
    return NextResponse.json({ error: "Failed to prepare upload" }, { status: 500 });
  }
  return NextResponse.json(slot);
}
