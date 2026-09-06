import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { AGENT_SYSTEM_PROMPT, AGENT_TOOLS } from "@/lib/agentTools";
import { sanitizeAgentMessages, hasImageContent } from "@/lib/agentMessages";
import { checkRateLimit } from "@/lib/rateLimit";
import { MODELS } from "@/lib/promptShared";
import { openAiLikelyDown, markOpenAiDown, markOpenAiUp } from "@/lib/ai";
import { toAnthropicTools, toAnthropicMessages, fromAnthropicResponse } from "@/lib/anthropicToolBridge";

// Same reasoning as /api/build/turn's limit -- the VS Code extension's own
// agent loop calls this endpoint again after every tool call, so this
// needs headroom for a normal multi-step task, not just one request per
// user action.
const AGENT_TURN_LIMIT_PER_MINUTE = 40;

// Without this, Vercel kills the function at its platform default before
// a slow gpt-5.5 completion finishes, and the extension just sees a bare
// request failure.
export const maxDuration = 60;

type StreamEvent =
  | { type: "content"; text: string }
  // Sent once, the first moment the model starts forming a tool call --
  // its arguments (a full file's contents, for write_file) can still take
  // a while to finish streaming after this, with no more visible text
  // chunks in the meantime. Without this, the chat panel goes silent
  // right after the model's narration text ends and looks stalled/done
  // for however long that takes, even though real work is still
  // happening.
  | { type: "tool_call_start" }
  | {
      type: "done";
      toolCalls: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
      content: string | null;
    }
  | { type: "error"; error: string };

// One turn of the coding-agent loop, driven by the VS Code extension (not
// this server) -- the extension owns tool execution, since it's the one
// with access to the user's actual workspace/terminal. Structurally
// identical to /api/build/turn: streamed as newline-delimited JSON so the
// extension can show the model's narration typing in live (via
// stream.markdown chunks) instead of the chat panel sitting blank until
// the whole completion finishes -- that dead-air wait was the extension's
// biggest "feels slow" gap compared to Build's own already-streamed
// composer. A final "done" event carries the assembled tool call(s), for
// the extension to execute and call this endpoint again with.
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY && !process.env.DEEPSEEK_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ChatGiZa's coding agent isn't configured yet." }, { status: 503 });
  }

  const rate = await checkRateLimit(`agent-turn:${user.id}`, AGENT_TURN_LIMIT_PER_MINUTE, 60);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests -- please slow down." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!Array.isArray(body?.messages)) {
    return NextResponse.json({ error: "messages array is required" }, { status: 400 });
  }
  // Whitelists roles to user/assistant/tool -- a client-supplied
  // {role: "system", ...} message here would otherwise sit right next to
  // the real system prompt below and could override or contradict it.
  const clientMessages = sanitizeAgentMessages(body.messages);
  // The extension's own workspace file list + package.json summary (see
  // getProjectOverview in tools.ts) -- gives the model real upfront
  // awareness of the whole project shape instead of it having to build
  // that picture blindly, one list_directory/read_file call at a time.
  // Capped defensively; the extension already caps file count on its
  // side, this just guards against an unexpectedly huge payload.
  const MAX_OVERVIEW_CHARS = 20000;
  const projectOverview =
    typeof body.projectOverview === "string" ? body.projectOverview.slice(0, MAX_OVERVIEW_CHARS) : null;

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(event: StreamEvent) {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      }

      try {
        const { default: OpenAI } = await import("openai");
        const messages = [
          { role: "system", content: AGENT_SYSTEM_PROMPT },
          ...(projectOverview ? [{ role: "system" as const, content: `Project overview:\n\n${projectOverview}` }] : []),
          ...clientMessages,
        ];

        // OpenAI stays primary; DeepSeek (same OpenAI-compatible
        // tool-calling shape, just a different baseURL/model) steps in if
        // OpenAI itself fails, so the extension keeps working either way
        // instead of the user just seeing an error.
        type ChatStreamChunk = {
          choices?: Array<{
            delta?: { content?: string | null; tool_calls?: Array<{ index: number; id?: string; function?: { name?: string; arguments?: string } }> };
          }>;
        };
        let apiStream: AsyncIterable<ChatStreamChunk> | undefined;
        if (process.env.OPENAI_API_KEY && !((await openAiLikelyDown()) && process.env.DEEPSEEK_API_KEY)) {
          try {
            const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            apiStream = (await client.chat.completions.create({
              model: MODELS.primary,
              messages: messages as Parameters<typeof client.chat.completions.create>[0]["messages"],
              tools: AGENT_TOOLS,
              tool_choice: "auto",
              stream: true,
            })) as unknown as AsyncIterable<ChatStreamChunk>;
            await markOpenAiUp();
          } catch (err) {
            if (!process.env.DEEPSEEK_API_KEY && !process.env.ANTHROPIC_API_KEY) throw err;
            console.error("Agent turn: OpenAI failed, falling back:", err);
            await markOpenAiDown(err);
            apiStream = undefined;
          }
        }
        // Skipped when the turn has an image and OpenAI already failed --
        // DeepSeek's hosted model can't see images at all, so trying it
        // here would just burn a request for nothing; go straight to the
        // vision-capable Anthropic tier below instead.
        if (!apiStream && process.env.DEEPSEEK_API_KEY && !hasImageContent(clientMessages)) {
          try {
            const client = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: MODELS.fallbackBaseUrl });
            apiStream = (await client.chat.completions.create({
              model: MODELS.fallback,
              messages: messages as Parameters<typeof client.chat.completions.create>[0]["messages"],
              tools: AGENT_TOOLS,
              tool_choice: "auto",
              stream: true,
            })) as unknown as AsyncIterable<ChatStreamChunk>;
          } catch (err) {
            if (!process.env.ANTHROPIC_API_KEY) throw err;
            console.error("Agent turn: DeepSeek failed, falling back to Anthropic:", err);
            apiStream = undefined;
          }
        }
        // Last-resort third tier: Claude (Opus 5), only reached if both
        // OpenAI and DeepSeek were unavailable or failed. Not streamed --
        // this is a rare path, so one buffered call is simpler and more
        // reliable than a third streaming-chunk assembler.
        if (!apiStream) {
          if (!process.env.ANTHROPIC_API_KEY) throw new Error("No AI provider is currently available.");
          const { default: Anthropic } = await import("@anthropic-ai/sdk");
          const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
          const response = await client.messages.create({
            model: MODELS.anthropicFallback,
            max_tokens: 4096,
            system: projectOverview ? `${AGENT_SYSTEM_PROMPT}\n\nProject overview:\n\n${projectOverview}` : AGENT_SYSTEM_PROMPT,
            messages: toAnthropicMessages(clientMessages),
            tools: toAnthropicTools(AGENT_TOOLS),
          });
          const parsed = fromAnthropicResponse(response.content);
          if (parsed.content) send({ type: "content", text: parsed.content });
          send({ type: "done", toolCalls: parsed.tool_calls ?? [], content: parsed.content });
          return;
        }

        // Tool call argument fragments arrive spread across many chunks,
        // keyed by index -- assemble them into complete strings as they
        // come in, only surfaced once the stream ends.
        const toolCallsByIndex = new Map<number, { id: string; name: string; arguments: string }>();
        let contentBuffer = "";
        let announcedToolCall = false;

        for await (const chunk of apiStream) {
          const delta = chunk.choices?.[0]?.delta;

          if (delta?.content) {
            contentBuffer += delta.content;
            send({ type: "content", text: delta.content });
          }

          if (!announcedToolCall && delta?.tool_calls && delta.tool_calls.length > 0) {
            announcedToolCall = true;
            send({ type: "tool_call_start" });
          }

          for (const tc of delta?.tool_calls ?? []) {
            const existing = toolCallsByIndex.get(tc.index) ?? { id: "", name: "", arguments: "" };
            if (tc.id) existing.id = tc.id;
            if (tc.function?.name) existing.name += tc.function.name;
            if (tc.function?.arguments) existing.arguments += tc.function.arguments;
            toolCallsByIndex.set(tc.index, existing);
          }
        }

        const toolCalls = Array.from(toolCallsByIndex.values())
          .filter((tc) => tc.id && tc.name)
          .map((tc) => ({ id: tc.id, type: "function" as const, function: { name: tc.name, arguments: tc.arguments } }));

        send({ type: "done", toolCalls, content: contentBuffer || null });
      } catch (err) {
        console.error("Agent turn error:", err);
        const errMessage = err instanceof Error ? err.message : "Something went wrong.";
        send({ type: "error", error: errMessage });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson" } });
}
