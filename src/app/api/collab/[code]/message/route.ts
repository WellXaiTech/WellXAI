import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";
import { type CollabSession, collabKey } from "@/lib/collab";
import { streamChatReply, type ChatMessage } from "@/lib/ai";

async function collectStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result;
}

// Any participant can post -- the reply is generated once here and
// saved into the shared message list, so everyone sees the same answer
// on their next poll instead of each person getting their own.
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { code } = await params;
  const key = collabKey(code);
  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const displayName = typeof body.displayName === "string" && body.displayName.trim() ? body.displayName.trim().slice(0, 40) : "Someone";
  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  try {
    const data = await kv.get<CollabSession>(key);
    if (!data) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (!data.participants.some((p) => p.id === userId)) {
      data.participants.push({ id: userId, name: displayName });
    }

    data.messages.push({
      id: crypto.randomUUID(),
      role: "user",
      content,
      authorId: userId,
      authorName: displayName,
      createdAt: Date.now(),
    });

    // Persisted here, before the (slow) AI call below, instead of only once
    // at the very end -- two participants posting close together used to
    // both read the same pre-update session, and whichever of their final
    // writes landed last would silently overwrite the other's message and
    // reply. Writing the user's own message right away shrinks that race
    // window from "however long the AI reply takes" down to one KV round
    // trip, and the reply is layered onto a freshly re-read copy below so
    // it doesn't clobber anything another participant added in between.
    await kv.set(key, data);

    // Each speaker's name is prefixed so the model can tell participants
    // apart in a multi-person thread instead of treating them as one
    // undifferentiated "user".
    const history: ChatMessage[] = data.messages.map((m) => ({
      role: m.role,
      content: m.role === "user" ? `${m.authorName ?? "Someone"}: ${m.content}` : m.content,
    }));

    const replyText = await collectStream(streamChatReply(history, null, {}));

    const assistantMessage = {
      id: crypto.randomUUID(),
      role: "assistant" as const,
      content: replyText,
      createdAt: Date.now(),
    };

    const latest = (await kv.get<CollabSession>(key)) ?? data;
    latest.messages.push(assistantMessage);
    await kv.set(key, latest);

    return NextResponse.json({ session: latest });
  } catch (err) {
    console.error("Collab message error", err);
    const message = err instanceof Error ? err.message : "Failed to send message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
