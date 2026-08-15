import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { shareKey, type SharedConversation } from "@/lib/share";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const data = await kv.get<SharedConversation>(shareKey(id));
    if (!data) {
      return NextResponse.json({ error: "This shared chat is unavailable." }, { status: 404 });
    }
    return NextResponse.json({ conversation: data });
  } catch (err) {
    console.error("Share get error", err);
    return NextResponse.json({ error: "Failed to load shared chat" }, { status: 500 });
  }
}

// Knowing the (unguessable) share id is treated as proof of ownership,
// the same way the link itself grants viewing -- there's no sign-in check
// on share creation, so there's nothing to compare a DELETE caller against.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await kv.del(shareKey(id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Share delete error", err);
    return NextResponse.json({ error: "Failed to remove share link" }, { status: 500 });
  }
}
