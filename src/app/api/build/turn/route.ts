import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { hasBuildAccess } from "@/lib/usageLimit";
import { BUILD_SYSTEM_PROMPT, BUILD_TOOLS } from "@/lib/buildAgentTools";
import { openAiLikelyDown, markOpenAiDown, markOpenAiUp } from "@/lib/ai";
import { sanitizeAgentMessages, hasImageContent } from "@/lib/agentMessages";
import { checkRateLimit } from "@/lib/rateLimit";
import { MODELS } from "@/lib/promptShared";
import { toAnthropicTools, toAnthropicMessages, fromAnthropicResponse } from "@/lib/anthropicToolBridge";
import { addUserTokens } from "@/lib/tokenUsage";

// A single "send" from the UI can legitimately trigger several turns in
// a row (the agent loop calls this endpoint again after every tool
// call, up to MAX_STEPS in useBuildAgent.ts) -- this needs to be
// generous enough not to break a normal multi-step build, while still
// bounding a signed-in account's worst case to something finite. There
// was previously no limit here at all.
const BUILD_TURN_LIMIT_PER_MINUTE = 40;

// Without this, Vercel kills the function at its platform default (10s
// on Hobby) -- generating a real multi-file website in one completion
// routinely takes longer than that, especially through the DeepSeek
// fallback, and the client just sees the request die mid-flight
// ("terminated") with no useful error. 60s covers a normal turn; deploys/
// pushes happen client-side afterward and aren't affected by this.
export const maxDuration = 60;

type StreamEvent =
  | { type: "content"; text: string }
  | {
      type: "done";
      toolCalls: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
      content: string | null;
      usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
    }
  | { type: "error"; error: string };

// One turn of the Build page's agent loop, driven by the browser (not
// this server) -- structurally identical to /api/agent/turn (the VS Code
// coding agent), just with the browser's virtual file-map tools instead
// of real filesystem/terminal tools. Streamed as newline-delimited JSON:
// "content" events carry narration/summary text as it's actually
// generated (so the reply visibly types itself in, the way a coding
// agent's own output does, not a wall of text that appears all at once),
// and a final "done" event carries the assembled tool call(s) -- those
// arrive fragmented across many chunks and aren't meaningful until
// complete, so they're buffered server-side rather than streamed raw.
// hasBuildAccess currently just checks the user is signed in -- Build's
// tier/pricing gate is intentionally not enforced yet while that's still
// being decided (see the comment on hasBuildAccess itself), so this is
// NOT currently a Growth/Enterprise enforcement point despite the error
// message below still describing one; it will become the real
// enforcement point again the moment hasBuildAccess's tier check is
// turned back on, with no other change needed here.
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!(await hasBuildAccess(user.id))) {
    return NextResponse.json({ error: "The Build page requires a Growth or Enterprise plan." }, { status: 403 });
  }

  const rate = await checkRateLimit(`build-turn:${user.id}`, BUILD_TURN_LIMIT_PER_MINUTE, 60);
  if (!rate.allowed) {
    return NextResponse.json({ error: "You're sending requests too quickly -- please slow down." }, { status: 429 });
  }

  if (!process.env.OPENAI_API_KEY && !process.env.DEEPSEEK_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ChatGiZa's website builder isn't configured yet." }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  if (!Array.isArray(body?.messages)) {
    return NextResponse.json({ error: "messages array is required" }, { status: 400 });
  }
  // Whitelists roles to user/assistant/tool -- a client-supplied
  // {role: "system", ...} message here would otherwise sit right next to
  // BUILD_SYSTEM_PROMPT below and could override or contradict it.
  const clientMessages = sanitizeAgentMessages(body.messages);
  const clientFiles: Record<string, string> =
    body?.files && typeof body.files === "object" ? body.files : {};

  // Paths and sizes only, never content -- this is what stops the model
  // from being unaware a file exists at all (the root cause of it
  // "forgetting" prior work), without paying full-file-content tokens on
  // every single turn just to remind it of files it may not even touch.
  // Regenerated fresh from the client's actual current file map on every
  // request, so it can never drift stale the way conversation history can.
  const fileEntries = Object.entries(clientFiles);
  const fileManifest =
    fileEntries.length > 0
      ? `Current project files (call read_file before editing any of these -- their contents are not repeated here):\n${fileEntries
          .map(([path, content]) => `- ${path} (${content.length} chars)`)
          .join("\n")}`
      : "The project has no files yet -- this is a fresh start.";

  // The prompt's own instruction not to repeat the same narration opener
  // ("Now...", "First...") turned out not to reliably hold on its own --
  // confirmed live, not assumed. This is a real, code-driven backstop:
  // the client extracts the actual opening word of its last few
  // narration lines and sends them here, so the instruction becomes
  // concrete ("you just used these exact words, don't reuse them") --
  // regenerated fresh every turn, so it always reflects what really
  // happened, not a static rule the model has already shown it doesn't
  // self-enforce.
  const recentOpeners: string[] = Array.isArray(body?.recentOpeners)
    ? body.recentOpeners.filter((o: unknown): o is string => typeof o === "string" && o.trim().length > 0)
    : [];
  const openerHint =
    recentOpeners.length > 0
      ? `Your last ${recentOpeners.length} narration line(s) opened with: ${recentOpeners.map((o) => `"${o}"`).join(", ")}. Do not open your next narration line with any of these words (or with "Now"/"First"/"Next"/"Then" generally) -- start it differently.`
      : null;

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(event: StreamEvent) {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      }

      try {
        const { default: OpenAI } = await import("openai");
        const messages = [
          { role: "system", content: BUILD_SYSTEM_PROMPT },
          { role: "system", content: fileManifest },
          ...(openerHint ? [{ role: "system" as const, content: openerHint }] : []),
          ...clientMessages,
        ];

        // OpenAI stays primary; DeepSeek (same OpenAI-compatible
        // tool-calling shape, just a different baseURL/model) steps in if
        // OpenAI itself fails, so the Build agent keeps working either
        // way instead of the user just seeing an error -- same pattern as
        // the main chat provider fallback in src/lib/ai.ts.
        // Minimal structural type for the streaming chunks -- avoids
        // fighting the SDK's overloaded create() return type (which
        // resolves to a union of streaming/non-streaming shapes that
        // TypeScript can't narrow just from `stream: true` in an object
        // literal typed via a Parameters<> cast).
        type ChatStreamChunk = {
          choices?: Array<{
            delta?: { content?: string | null; tool_calls?: Array<{ index: number; id?: string; function?: { name?: string; arguments?: string } }> };
          }>;
          usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
        };
        let apiStream: AsyncIterable<ChatStreamChunk> | undefined;
        if (process.env.OPENAI_API_KEY && !((await openAiLikelyDown()) && process.env.DEEPSEEK_API_KEY)) {
          try {
            const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            apiStream = (await client.chat.completions.create({
              model: MODELS.primary,
              messages: messages as Parameters<typeof client.chat.completions.create>[0]["messages"],
              tools: BUILD_TOOLS,
              tool_choice: "auto",
              stream: true,
              stream_options: { include_usage: true },
            })) as unknown as AsyncIterable<ChatStreamChunk>;
            await markOpenAiUp();
          } catch (err) {
            if (!process.env.DEEPSEEK_API_KEY && !process.env.ANTHROPIC_API_KEY) throw err;
            console.error("Build agent: OpenAI turn failed, falling back:", err);
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
              tools: BUILD_TOOLS,
              tool_choice: "auto",
              stream: true,
              stream_options: { include_usage: true },
            })) as unknown as AsyncIterable<ChatStreamChunk>;
          } catch (err) {
            if (!process.env.ANTHROPIC_API_KEY) throw err;
            console.error("Build agent: DeepSeek turn failed, falling back to Anthropic:", err);
            apiStream = undefined;
          }
        }
        // Last-resort third tier: Claude (Opus 5), only reached if both
        // OpenAI and DeepSeek were unavailable or failed. Not streamed --
        // this is a rare path, so one buffered call is simpler and more
        // reliable than a third streaming-chunk assembler -- the client
        // still sees it as a normal "content" + "done" pair either way.
        if (!apiStream) {
          if (!process.env.ANTHROPIC_API_KEY) throw new Error("No AI provider is currently available.");
          const { default: Anthropic } = await import("@anthropic-ai/sdk");
          const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
          const response = await client.messages.create({
            model: MODELS.anthropicFallback,
            max_tokens: 4096,
            system: [BUILD_SYSTEM_PROMPT, fileManifest, openerHint].filter((s): s is string => !!s).join("\n\n"),
            messages: toAnthropicMessages(clientMessages),
            tools: toAnthropicTools(BUILD_TOOLS),
          });
          const parsed = fromAnthropicResponse(response.content);
          if (parsed.content) send({ type: "content", text: parsed.content });
          send({
            type: "done",
            toolCalls: parsed.tool_calls ?? [],
            content: parsed.content,
            usage: response.usage
              ? {
                  promptTokens: response.usage.input_tokens,
                  completionTokens: response.usage.output_tokens,
                  totalTokens: response.usage.input_tokens + response.usage.output_tokens,
                }
              : null,
          });
          if (response.usage) void addUserTokens(user.id, response.usage.input_tokens + response.usage.output_tokens);
          return;
        }

        // Tool call argument fragments arrive spread across many chunks,
        // keyed by index -- assemble them into complete strings as they
        // come in, only surfaced once the stream ends.
        const toolCallsByIndex = new Map<number, { id: string; name: string; arguments: string }>();
        let contentBuffer = "";
        let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null = null;

        for await (const chunk of apiStream) {
          const delta = chunk.choices?.[0]?.delta;

          if (delta?.content) {
            contentBuffer += delta.content;
            send({ type: "content", text: delta.content });
          }

          for (const tc of delta?.tool_calls ?? []) {
            const existing = toolCallsByIndex.get(tc.index) ?? { id: "", name: "", arguments: "" };
            if (tc.id) existing.id = tc.id;
            if (tc.function?.name) existing.name += tc.function.name;
            if (tc.function?.arguments) existing.arguments += tc.function.arguments;
            toolCallsByIndex.set(tc.index, existing);
          }

          if (chunk.usage) {
            usage = {
              promptTokens: chunk.usage.prompt_tokens,
              completionTokens: chunk.usage.completion_tokens,
              totalTokens: chunk.usage.total_tokens,
            };
          }
        }

        const toolCalls = Array.from(toolCallsByIndex.values())
          .filter((tc) => tc.id && tc.name)
          .map((tc) => ({ id: tc.id, type: "function" as const, function: { name: tc.name, arguments: tc.arguments } }));

        send({ type: "done", toolCalls, content: contentBuffer || null, usage });
        if (usage) void addUserTokens(user.id, usage.totalTokens);
      } catch (err) {
        console.error("Build agent turn error:", err);
        const errMessage = err instanceof Error ? err.message : "Something went wrong.";
        send({ type: "error", error: errMessage });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson" } });
}
