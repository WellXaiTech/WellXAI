import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";
import { type CollabSession, collabKey } from "@/lib/collab";

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { code } = await params;
  const body = await req.json().catch(() => ({}));
  const displayName = typeof body.displayName === "string" && body.displayName.trim() ? body.displayName.trim().slice(0, 40) : "Someone";

  try {
    const data = await kv.get<CollabSession>(collabKey(code));
    if (!data) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (!data.participants.some((p) => p.id === userId)) {
      data.participants.push({ id: userId, name: displayName });
      await kv.set(collabKey(code), data);
    }
    return NextResponse.json({ session: data });
  } catch (err) {
    console.error("Collab join error", err);
    const message = err instanceof Error ? err.message : "Failed to join session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
