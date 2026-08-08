import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { createVideoUploadSlot } from "@/lib/mediaStorage";

const ALLOWED_MIME = new Set(["video/mp4", "video/webm", "video/quicktime"]);

// Mints a short-lived Supabase Storage signed upload URL so the client can
// upload a video directly to Storage -- video files are too large to pass
// through this API's own request body.
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const mime = typeof body?.mime === "string" ? body.mime : "";
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json({ error: "Unsupported video type" }, { status: 400 });
  }

  const slot = await createVideoUploadSlot(mime);
  if (!slot) {
    return NextResponse.json({ error: "Failed to prepare upload" }, { status: 500 });
  }
  return NextResponse.json(slot);
}
