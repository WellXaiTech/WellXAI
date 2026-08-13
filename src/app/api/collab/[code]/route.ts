import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";
import { type CollabSession, collabKey } from "@/lib/collab";

// Polled by every participant's app every few seconds while the
// collaborative screen is open -- this is how everyone sees everyone
// else's messages without real push infra.
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { code } = await params;
  try {
    const data = await kv.get<CollabSession>(collabKey(code));
    if (!data) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json({ session: data });
  } catch (err) {
    console.error("Collab get error", err);
    const message = err instanceof Error ? err.message : "Failed to load session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
