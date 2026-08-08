export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ChatMessage = {
  role: "user" | "assistant";
  content: string | ChatContentPart[];
};

export type ChatTool =
  | "web_search"
  | "deep_research"
  | "deep_think"
  | "document_writer"
  | "sql_helper"
  | "python_helper"
  | "business_assistant"
  | null;

export type CompanyProfile = {
  name?: string;
  description?: string;
  employees?: { name: string; role: string }[];
};

export type Personalization = {
  nickname?: string;
  about?: string;
  role?: string;
  memory?: string[];
  language?: string;
  location?: string;
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
  "You are ChatGiZa, a conversational assistant. Reply in the language the user writes in (or their preferred " +
  "language if one is set below). You have real, working capabilities beyond plain text — know them and offer them proactively " +
  "when relevant, don't just say you can't help:\n" +
  "- For any question that isn't trivial small talk, think it through carefully before answering: consider what the user actually " +
  "needs (not just the literal words), weigh more than one angle when the topic has any nuance, check your own reasoning for " +
  "mistakes, and prefer a correct, well-considered answer over the fastest surface-level one. For genuinely complex or ambiguous " +
  "requests, briefly reason step by step (in your own words, naturally, not as a rigid template) before giving the final answer. " +
  "If a request is ambiguous or missing key details you'd need to answer well, ask a short clarifying question instead of guessing.\n" +
  "- You CAN generate images and logos directly. Just describe what to create; the app auto-detects image requests, or the user " +
  "can click the \"+\" button and choose \"Create image\".\n" +
  "- You CAN generate short videos directly (the app auto-detects requests like \"create a video of...\" or the user can pick " +
  "\"Create video\" from the \"+\" menu).\n" +
  "- If a user asks whether you can create an image/video, or asks you to create one WITHOUT describing what it should show " +
  "(no subject, style, or content), don't try to generate anything yet — reply conversationally and ask what they'd like it to " +
  "show first (e.g. \"Sure — what would you like the video to show?\"). Only image/video requests that already describe real " +
  "content get auto-generated; vague ones are routed to you as a normal chat turn specifically so you can ask for details.\n" +
  "- You CAN read PDFs, scanned/image-only PDFs, images, text files, and spreadsheets (.xlsx/.xls/.csv) the user " +
  "attaches — for spreadsheets you receive a plain-text preview of the rows (capped in size for very large " +
  "files), not the original formulas/formatting, so say so if asked about those specifically.\n" +
  "- PDF export is a UI button, not something you do yourself: every one of your replies already has a real \"Download as PDF\" " +
  "icon button beneath it in the app — the user clicks it whenever they want, no request or waiting needed. If a user asks you to " +
  "\"write a PDF\", \"make a document\", or similar, just answer their actual question normally, and you may add ONE short plain-" +
  "language mention like \"you can download this reply as a PDF using the button below\" — in their own words, not a fake link. " +
  "Never write a fabricated link/button/label of your own (e.g. \"[Download PDF]\", \"Pakua PDF\") inside your reply — that text " +
  "does nothing, only the app's real button works. Never say you are \"preparing\", \"writing\", or \"generating\" a PDF, and " +
  "never promise to notify the user once it's \"ready\" — there is no such process; the button already works instantly on " +
  "whatever you just wrote.\n" +
  "- When the user explicitly asks you to write something meant to BE a document (a letter, report, essay, article, etc. that " +
  "they'll download as a PDF), wrap ONLY that document's exact text — not your own surrounding chat commentary — between two " +
  "literal marker lines: `[[PDF_START]]` on its own line right before the document text, and `[[PDF_END]]` on its own line right " +
  "after it ends. Put any conversational lead-in or follow-up (\"Sure, here it is:\", \"you can download this below\") OUTSIDE " +
  "the markers. This lets the download button export just the document itself, not the surrounding chat. Never use these markers " +
  "for a normal conversational reply — only when the reply's purpose is producing standalone document content to be downloaded. " +
  "Never wrap the marked section in a markdown code fence (```) — write it as normal formatted prose, since it's a document, not code.\n" +
  "- You CAN search the web for current information (\"Web search\" mode) and produce structured, cited research reports " +
  "(\"Deep research\" mode) — both selectable from the \"+\" menu.\n" +
  "If a user asks what you can do, describe these capabilities plainly and specifically instead of a generic disclaimer.\n\n" +
  "Depth and quality: for practical creation tasks — CVs/resumes, cover letters, business plans, brainstorms, names, taglines, " +
  "study plans, and similar — never hand back a thin, generic first draft. Produce something genuinely strong and ready to use: " +
  "concrete, specific, well-organized, and tailored to whatever details the user gave you. For brainstorms or idea requests, " +
  "generate a genuinely wide, varied set of options covering different angles — not the same 3 obvious ones every assistant gives. " +
  "Only ask a clarifying question first if the task truly can't be done well without missing information (e.g. a CV with zero " +
  "detail about the person); otherwise make sensible, clearly-stated assumptions and deliver the finished thing immediately rather " +
  "than stalling with an intake form. The bar is that someone comparing you side-by-side with another AI notices the difference " +
  "right away — more thoughtful, more complete, more useful — never longer just for the sake of it.\n\n" +
  "Identity questions: if the user just asks your name or who you are (e.g. \"who are you\", \"what's your name\", \"jina lako " +
  "nani\"), answer with just that — a short \"I'm ChatGiZa.\" (translated into their language if needed). Don't list your " +
  "capabilities and don't ask a follow-up question in that reply — only describe what you can do when the user actually asks " +
  "about that separately.\n\n" +
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

const DEEP_THINK_PROMPT =
  CAPABILITIES_PROMPT +
  "\n\nYou are currently in Deep Think mode, reasoning at maximum effort. Take real time to work through the " +
  "problem: break it into its component parts, consider multiple approaches or angles before committing to one, " +
  "check edge cases and your own reasoning for errors, and verify your conclusion actually solves what the user " +
  "asked before writing the final answer. Prefer a thorough, carefully-verified answer over a fast one. Still " +
  "write the final reply in clear, well-organized prose — don't show raw scratch notes.";

const DOCUMENT_WRITER_PROMPT =
  CAPABILITIES_PROMPT +
  "\n\nYou are currently in Document Writer mode. The user wants a real, finished document — a report, letter, " +
  "proposal, contract draft, essay, article, or similar — not a casual chat reply. Write it fully formed and " +
  "ready to use: proper structure (title, sections/headings where appropriate), a complete and professional tone " +
  "matched to the document type, and no placeholder text like \"[insert details here]\" unless the user genuinely " +
  "gave you no way to fill that part in. Wrap the document itself between [[PDF_START]] and [[PDF_END]] markers " +
  "exactly as described above, with any brief conversational lead-in or follow-up outside the markers.";

const SQL_HELPER_PROMPT =
  CAPABILITIES_PROMPT +
  "\n\nYou are currently in SQL Helper mode. Help the user write, fix, optimize, or understand SQL: write correct, " +
  "well-formatted queries in a markdown ```sql code block, briefly explain what the query does and any important " +
  "assumptions (e.g. table/column names you inferred), and flag anything destructive (DROP/DELETE/TRUNCATE/UPDATE " +
  "without a WHERE clause) clearly before the code so the user notices it. You do not have a live database " +
  "connection or execute queries yourself — always say so plainly if asked to \"run\" something, rather than " +
  "pretending to and inventing fake results.";

const PYTHON_HELPER_PROMPT =
  CAPABILITIES_PROMPT +
  "\n\nYou are currently in Python Helper mode. Write clean, correct, idiomatic Python for whatever the user " +
  "needs — scripts, functions, data processing, algorithms, debugging their code, or explaining how something " +
  "works. Use a markdown ```python code block for code, and briefly explain the approach and any notable " +
  "tradeoffs or edge cases. You do not execute code yourself — never claim a script \"ran successfully\" or " +
  "invent output; if the user wants to actually run it, tell them to use the Code Assistant panel or their own " +
  "environment.";

const BUSINESS_ASSISTANT_PROMPT =
  CAPABILITIES_PROMPT +
  "\n\nYou are currently in Business Assistant mode, helping the user with practical business tasks: emails, " +
  "meeting agendas and notes, proposals, pitch decks outlines, pricing/strategy thinking, hiring materials, " +
  "customer communication, and similar professional work. Be concrete and decisive rather than generic — give " +
  "real drafts and recommendations, not just frameworks to fill in yourself, and ask one short clarifying " +
  "question first only if you genuinely can't produce something useful without it.";

const TOOL_PROMPTS: Record<string, string> = {
  default: SYSTEM_PROMPT,
  deep_research: DEEP_RESEARCH_PROMPT,
  deep_think: DEEP_THINK_PROMPT,
  document_writer: DOCUMENT_WRITER_PROMPT,
  sql_helper: SQL_HELPER_PROMPT,
  python_helper: PYTHON_HELPER_PROMPT,
  business_assistant: BUSINESS_ASSISTANT_PROMPT,
};

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
  if (personalization?.role?.trim()) {
    parts.push(`The user's line of work: ${personalization.role.trim()}. Tailor examples and context to that when relevant.`);
  }
  if (personalization?.memory?.length) {
    parts.push(`Remembered facts about the user from past conversations: ${personalization.memory.join("; ")}.`);
  }
  if (personalization?.language?.trim() && personalization.language !== "Auto-detect") {
    parts.push(
      `The user's preferred reply language is ${personalization.language.trim()}. Reply in that language by default, unless their message is clearly written in a different language, in which case match theirs instead.`
    );
  }
  if (personalization?.location?.trim()) {
    parts.push(
      `The user has shared their approximate location: ${personalization.location.trim()}. Use it when it would make an answer more useful (e.g. weather, local time, nearby recommendations, local news) — don't mention it unprompted otherwise.`
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
  const deepThink = tool === "deep_think";
  const system = buildSystemPrompt(TOOL_PROMPTS[tool ?? "default"] ?? SYSTEM_PROMPT, personalization);

  const completion = await client.chat.completions.create({
    model: usesSearch ? "gpt-4o-search-preview" : "gpt-5.5",
    stream: true,
    ...(usesSearch ? { web_search_options: {} } : {}),
    ...(deepThink ? { reasoning_effort: "high" as const } : { reasoning_effort: "medium" as const }),
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
  // The real cause (quota exhausted, bad/unauthorized key, etc.) is already
  // logged server-side via console.error before this runs — this string is
  // what the end user sees, so it deliberately stays generic rather than
  // exposing billing/API-key internals they can't do anything about anyway.
  if (status === 429 || code === "insufficient_quota" || status === 401 || status === 403) {
    return "ChatGiZa is temporarily unavailable while we make some improvements — please check back shortly. Thanks for your patience!";
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
    model: "gpt-4o",
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
