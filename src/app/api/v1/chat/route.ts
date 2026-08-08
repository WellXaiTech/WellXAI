import { NextRequest, NextResponse } from "next/server";
import { streamChatReply, type ChatMessage } from "@/lib/ai";
import { resolveApiKey } from "@/lib/apiKeys";
import { checkApiRateLimit } from "@/lib/rateLimit";

// The public developer API (see /developers) -- authenticated with an API
// key (Authorization: Bearer gz_live_...) instead of the web session /
// mobile token every other route uses. Returns one JSON object rather than
// streaming, matching the documented shape third-party integrators expect.
async function readFullStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return text;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const apiKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!apiKey) {
    return NextResponse.json({ error: { message: "Missing API key" } }, { status: 401 });
  }

  const resolved = await resolveApiKey(apiKey);
  if (!resolved) {
    return NextResponse.json({ error: { message: "Invalid or revoked API key" } }, { status: 401 });
  }

  const rateLimit = await checkApiRateLimit(resolved.id, resolved.priority);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: { message: "Rate limit exceeded. Enterprise/workspace keys get a higher limit." } },
      { status: 429, headers: { "X-RateLimit-Limit": String(rateLimit.limit), "X-RateLimit-Remaining": "0" } }
    );
  }

  const body = await req.json().catch(() => null);
  const rawMessages = body?.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return NextResponse.json({ error: { message: "messages array is required" } }, { status: 400 });
  }

  const messages: ChatMessage[] = rawMessages
    .filter(
      (m: unknown): m is { role: unknown; content: unknown } =>
        !!m && typeof m === "object" && ("role" in m) && ("content" in m)
    )
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: typeof m.content === "string" ? m.content : "",
    }));

  if (messages.length === 0) {
    return NextResponse.json({ error: { message: "messages must include at least one valid message" } }, { status: 400 });
  }

  try {
    const stream = streamChatReply(messages, null);
    const content = await readFullStream(stream);
    return NextResponse.json(
      {
        id: `msg_${crypto.randomUUID().replace(/-/g, "")}`,
        model: "chatgiza-1",
        role: "assistant",
        content,
      },
      { headers: { "X-RateLimit-Limit": String(rateLimit.limit), "X-RateLimit-Remaining": String(rateLimit.remaining) } }
    );
  } catch (err) {
    console.error("v1/chat error:", err);
    return NextResponse.json({ error: { message: "Couldn't generate a reply" } }, { status: 500 });
  }
}
