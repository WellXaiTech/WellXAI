export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ChatMessage = {
  role: "user" | "assistant";
  content: string | ChatContentPart[];
};

export type ChatTool = "web_search" | "deep_research" | null;

export type CompanyProfile = {
  name?: string;
  description?: string;
  employees?: { name: string; role: string }[];
};

export type Personalization = {
  nickname?: string;
  about?: string;
  memory?: string[];
  language?: string;
  company?: CompanyProfile;
};

type Provider = "openai" | "anthropic" | "mock";

function getProvider(): Provider {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "mock";
}

export function isRealAiConfigured() {
  return getProvider() !== "mock";
}

const CAPABILITIES_PROMPT =
  "You are ChatGiZa, the conversational assistant built by WellX AI. Reply in the language the user writes in (or their preferred " +
  "language if one is set below). You have real, working capabilities beyond plain text — know them and offer them proactively " +
  "when relevant, don't just say you can't help:\n" +
  "- You CAN generate images and logos directly. Just describe what to create; the app auto-detects image requests, or the user " +
  "can click the \"+\" button and choose \"Create image\".\n" +
  "- You CAN generate short videos directly (the app auto-detects requests like \"create a video of...\" or the user can pick " +
  "\"Create video\" from the \"+\" menu).\n" +
  "- If a user asks whether you can create an image/video, or asks you to create one WITHOUT describing what it should show " +
  "(no subject, style, or content), don't try to generate anything yet — reply conversationally and ask what they'd like it to " +
  "show first (e.g. \"Sure — what would you like the video to show?\"). Only image/video requests that already describe real " +
  "content get auto-generated; vague ones are routed to you as a normal chat turn specifically so you can ask for details.\n" +
  "- You CAN read PDFs, scanned/image-only PDFs, images, and text files the user attaches.\n" +
  "- Any of your text replies can be turned into a real downloadable PDF document with one click — the download icon under your " +
  "reply exports it as a PDF. Mention this when a user asks you to \"write a PDF\", \"make a document\", or similar.\n" +
  "- You CAN search the web for current information (\"Web search\" mode) and produce structured, cited research reports " +
  "(\"Deep research\" mode) — both selectable from the \"+\" menu.\n" +
  "If a user asks what you can do, describe these capabilities plainly and specifically instead of a generic disclaimer.\n\n" +
  "Identity questions: if the user just asks your name or who you are (e.g. \"who are you\", \"what's your name\", \"jina lako " +
  "nani\"), answer with just that — a short \"I'm ChatGiZa.\" (translated into their language if needed). Don't add \"built by " +
  "WellX AI\", don't list your capabilities, and don't ask a follow-up question in that reply — only mention WellX AI or describe " +
  "what you can do when the user actually asks about that separately.\n\n" +
  "Writing style: don't default to the same structure every time (e.g. always a numbered list). Vary your formatting to fit the " +
  "content and keep responses engaging — sometimes flowing prose, sometimes short paragraphs with a bold lead-in, sometimes a " +
  "table, sometimes a quote or a vivid example, sometimes a mix. Use numbered/bulleted lists only when the content is genuinely " +
  "sequential or enumerable, not as a default crutch. Write with personality and clarity, not like a form being filled out.";

const SYSTEM_PROMPT = CAPABILITIES_PROMPT;

const DEEP_RESEARCH_PROMPT =
  CAPABILITIES_PROMPT +
  "\n\nYou are currently in deep research mode. Use web search to gather multiple sources before answering. " +
  "Produce a thorough, well-structured report: start with a short summary, then organized sections with " +
  "headings, and cite sources inline as markdown links. Prefer depth and accuracy over brevity.";

const CANNED_REPLIES = [
  "Happy to help with that — could you tell me a bit more about what you're trying to achieve?",
  "Good question. Here's a starting point: break it down into smaller steps and tackle one at a time.",
  "Here's a quick way to think about it — focus on the outcome first, then work backwards to the details.",
  "Let's work through this together. What's the most important part you want to get right first?",
];

function buildSystemPrompt(base: string, personalization?: Personalization): string {
  const parts: string[] = [base];
  if (personalization?.nickname?.trim()) {
    parts.push(`The user's preferred name is "${personalization.nickname.trim()}" — address them that way when it feels natural.`);
  }
  if (personalization?.about?.trim()) {
    parts.push(`What the user has told you about themselves: ${personalization.about.trim()}`);
  }
  if (personalization?.memory?.length) {
    parts.push(`Remembered facts about the user from past conversations: ${personalization.memory.join("; ")}.`);
  }
  if (personalization?.language?.trim() && personalization.language !== "Auto-detect") {
    parts.push(
      `The user's preferred reply language is ${personalization.language.trim()}. Reply in that language by default, unless their message is clearly written in a different language, in which case match theirs instead.`
    );
  }
  const company = personalization?.company;
  if (company?.name?.trim() || company?.description?.trim() || company?.employees?.length) {
    const lines: string[] = [];
    if (company.name?.trim()) lines.push(`Company name: ${company.name.trim()}`);
    if (company.description?.trim()) lines.push(`What the company does: ${company.description.trim()}`);
    if (company.employees?.length) {
      lines.push(
        `Team directory: ${company.employees.map((e) => `${e.name}${e.role ? ` (${e.role})` : ""}`).join(", ")}`
      );
    }
    parts.push(
      "You are also representing this company, and know it well like a real staff member would — answer questions about " +
        "what it does, its services, or who works there confidently and naturally, in your own words, never as a copied data dump:\n" +
        lines.join("\n")
    );
  }
  return parts.join("\n\n");
}

function contentToText(content: ChatMessage["content"]): string {
  if (typeof content === "string") return content;
  return content
    .map((part) => (part.type === "text" ? part.text : "[Image attached]"))
    .join("\n");
}

function mockReplyFor(messages: ChatMessage[]): string {
  const last = contentToText(messages[messages.length - 1]?.content ?? "").trim();

  if (!last) {
    return "Hi, I'm ChatGiZa — how can I help you today?";
  }

  const reply = CANNED_REPLIES[messages.length % CANNED_REPLIES.length];
  return `${reply}\n\nYou said: "${last}"`;
}

async function streamOpenAi(
  messages: ChatMessage[],
  tool: ChatTool,
  controller: ReadableStreamDefaultController<Uint8Array>,
  personalization?: Personalization
) {
  const encoder = new TextEncoder();
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const usesSearch = tool === "web_search" || tool === "deep_research";
  const system = buildSystemPrompt(tool === "deep_research" ? DEEP_RESEARCH_PROMPT : SYSTEM_PROMPT, personalization);

  const completion = await client.chat.completions.create({
    model: usesSearch ? "gpt-4o-mini-search-preview" : "gpt-4o-mini",
    stream: true,
    ...(usesSearch ? { web_search_options: {} } : {}),
    messages: [
      { role: "system", content: system },
      ...messages.map((m) =>
        m.role === "user"
          ? { role: "user" as const, content: m.content }
          : { role: "assistant" as const, content: contentToText(m.content) }
      ),
    ],
  });

  for await (const chunk of completion) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) controller.enqueue(encoder.encode(delta));
  }
}

async function streamAnthropic(
  messages: ChatMessage[],
  controller: ReadableStreamDefaultController<Uint8Array>,
  personalization?: Personalization
) {
  const encoder = new TextEncoder();
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = client.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: buildSystemPrompt(SYSTEM_PROMPT, personalization),
    messages: messages.map((m) => ({ role: m.role, content: contentToText(m.content) })),
  });

  stream.on("text", (text) => controller.enqueue(encoder.encode(text)));
  await stream.finalMessage();
}

async function streamMock(messages: ChatMessage[], controller: ReadableStreamDefaultController<Uint8Array>) {
  const encoder = new TextEncoder();
  const reply = mockReplyFor(messages);
  const chunks = reply.split(/(\s+)/);

  for (const chunk of chunks) {
    controller.enqueue(encoder.encode(chunk));
    await new Promise((r) => setTimeout(r, 30));
  }
}

function describeStreamError(error: unknown): string {
  const status = (error as { status?: number })?.status;
  const code = (error as { code?: string })?.code;
  if (status === 429 || code === "insufficient_quota") {
    return "ChatGiZa can't reply right now — the AI provider account has run out of quota/credits. Please check the API billing and try again.";
  }
  if (status === 401 || status === 403) {
    return "ChatGiZa can't reply right now — the AI provider API key looks invalid or unauthorized.";
  }
  return "Sorry, something went wrong generating a reply. Please try again.";
}

export function streamChatReply(
  messages: ChatMessage[],
  tool: ChatTool = null,
  personalization?: Personalization
): ReadableStream<Uint8Array> {
  const provider = getProvider();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (provider === "openai") await streamOpenAi(messages, tool, controller, personalization);
        else if (provider === "anthropic") await streamAnthropic(messages, controller, personalization);
        else await streamMock(messages, controller);
      } catch (error) {
        console.error("ChatGiza stream error:", error);
        controller.enqueue(new TextEncoder().encode(describeStreamError(error)));
      } finally {
        controller.close();
      }
    },
  });
}

const IMAGE_CREATIVITY_SUFFIX =
  " Render this as a highly creative, original, professionally composed image with rich detail, striking lighting, and a polished, high-quality finish.";

export async function generateImage(prompt: string): Promise<string> {
  if (getProvider() !== "openai") {
    throw new Error("Image generation needs an OpenAI API key configured.");
  }

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.images.generate({
    model: "gpt-image-1",
    prompt: `${prompt}.${IMAGE_CREATIVITY_SUFFIX}`,
    size: "1536x1024",
    quality: "high",
    n: 1,
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image was returned.");
  return `data:image/png;base64,${b64}`;
}

export async function editImage(sourceDataUrl: string, instruction: string): Promise<string> {
  if (getProvider() !== "openai") {
    throw new Error("Image editing needs an OpenAI API key configured.");
  }

  const { default: OpenAI, toFile } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const base64 = sourceDataUrl.split(",")[1] ?? sourceDataUrl;
  const buffer = Buffer.from(base64, "base64");
  const file = await toFile(buffer, "image.png", { type: "image/png" });

  const response = await client.images.edit({
    model: "gpt-image-1",
    image: file,
    prompt: instruction,
    size: "1536x1024",
    quality: "high",
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image was returned.");
  return `data:image/png;base64,${b64}`;
}

const CODE_GEN_SYSTEM_PROMPT =
  "You write JavaScript for a sandboxed browser environment (a plain <script> tag — no imports/require, no DOM, no Node.js APIs, " +
  "no fetch/network access). Output ONLY runnable JavaScript code, nothing else — no markdown code fences, no explanation text " +
  "before or after. Use console.log/console.warn/console.error for any output, since that is the only way results are visible.";

function stripCodeFences(text: string): string {
  const fenced = text.match(/^```(?:javascript|js)?\n([\s\S]*?)\n```$/);
  return fenced ? fenced[1] : text;
}

export async function generateCode(prompt: string): Promise<string> {
  if (getProvider() !== "openai") {
    throw new Error("Code generation needs an OpenAI API key configured.");
  }

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: CODE_GEN_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("No code was returned.");
  return stripCodeFences(text);
}

async function getOpenAiClient() {
  if (getProvider() !== "openai") {
    throw new Error("Video generation needs an OpenAI API key configured.");
  }
  const { default: OpenAI } = await import("openai");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export type VideoStatus = {
  id: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  progress: number;
  error: string | null;
};

export async function createVideo(prompt: string): Promise<VideoStatus> {
  const client = await getOpenAiClient();
  const video = await client.videos.create({ prompt, model: "sora-2", seconds: "4" });
  return {
    id: video.id,
    status: video.status,
    progress: video.progress,
    error: video.error?.message ?? null,
  };
}

export async function getVideoStatus(id: string): Promise<VideoStatus> {
  const client = await getOpenAiClient();
  const video = await client.videos.retrieve(id);
  return {
    id: video.id,
    status: video.status,
    progress: video.progress,
    error: video.error?.message ?? null,
  };
}

export type VideoSegmentSeconds = "4" | "8" | "12";

export async function extendVideo(
  id: string,
  seconds: VideoSegmentSeconds,
  prompt = "Continue the scene naturally."
): Promise<VideoStatus> {
  const client = await getOpenAiClient();
  const video = await client.videos.extend({ video: { id }, prompt, seconds });
  return {
    id: video.id,
    status: video.status,
    progress: video.progress,
    error: video.error?.message ?? null,
  };
}

export async function getVideoContent(id: string): Promise<Response> {
  const client = await getOpenAiClient();
  return client.videos.downloadContent(id);
}
