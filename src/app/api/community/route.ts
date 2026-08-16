import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";
import { COMMUNITY_KEY, COMMUNITY_MESSAGE_LIMIT, type CommunityMessage } from "@/lib/community";

// Polled by every app that has the Community screen open -- same
// no-push-infra pattern as the per-code collab chat, but everyone reads
// and writes the same single global key instead of one per session.
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const messages = (await kv.get<CommunityMessage[]>(COMMUNITY_KEY)) ?? [];
    return NextResponse.json({ messages });
  } catch (err) {
    console.error("Community get error", err);
    const message = err instanceof Error ? err.message : "Failed to load community";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim().slice(0, 2000) : "";
  const displayName = typeof body.displayName === "string" && body.displayName.trim() ? body.displayName.trim().slice(0, 40) : "Someone";
  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  try {
    const messages = (await kv.get<CommunityMessage[]>(COMMUNITY_KEY)) ?? [];
    messages.push({
      id: crypto.randomUUID(),
      authorId: userId,
      authorName: displayName,
      content,
      createdAt: Date.now(),
    });
    const trimmed = messages.length > COMMUNITY_MESSAGE_LIMIT ? messages.slice(messages.length - COMMUNITY_MESSAGE_LIMIT) : messages;
    await kv.set(COMMUNITY_KEY, trimmed);
    return NextResponse.json({ messages: trimmed });
  } catch (err) {
    console.error("Community post error", err);
    const message = err instanceof Error ? err.message : "Failed to send message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
