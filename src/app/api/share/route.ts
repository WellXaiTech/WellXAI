import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { generateShareId, shareKey, type SharedConversation, type SharedMessage } from "@/lib/share";

const MAX_MESSAGES = 500;
const MAX_MESSAGE_LENGTH = 20000;

// Public, read-only snapshots of a conversation at share time -- anyone with
// the link can view them (like ChatGPT's "Share" links), no sign-in check
// on GET. Not a live sync: editing the original conversation afterwards
// does not change the shared copy.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 200) || "Untitled chat" : "Untitled chat";
  const rawMessages: unknown[] = Array.isArray(body?.messages) ? body.messages : [];

  const messages: SharedMessage[] = rawMessages
    .filter(
      (m: unknown): m is { role: unknown; content: unknown } =>
        !!m && typeof m === "object" && typeof (m as { content?: unknown }).content === "string"
    )
    .map(
      (m): SharedMessage => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: (m.content as string).slice(0, MAX_MESSAGE_LENGTH),
      })
    )
    .filter((m) => m.content.trim().length > 0)
    .slice(0, MAX_MESSAGES);

  if (messages.length === 0) {
    return NextResponse.json({ error: "Nothing to share" }, { status: 400 });
  }

  try {
    let id = generateShareId();
    for (let attempt = 0; attempt < 3; attempt++) {
      const existing = await kv.get(shareKey(id));
      if (!existing) break;
      id = generateShareId();
    }

    const data: SharedConversation = { id, title, messages, createdAt: Date.now() };
    await kv.set(shareKey(id), data);
    return NextResponse.json({ id });
  } catch (err) {
    console.error("Share create error", err);
    const message = err instanceof Error ? err.message : "Failed to create share link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
