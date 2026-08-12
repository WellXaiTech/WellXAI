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
  | "ai_agent"
  | "agent_team"
  | null;

export type CompanyProfile = {
  name?: string;
  description?: string;
  employees?: { name: string; role: string }[];
};

export type HistoryIndexEntry = { title: string; snippet: string };

export type Personalization = {
  nickname?: string;
  about?: string;
  role?: string;
  memory?: string[];
  language?: string;
  location?: string;
  company?: CompanyProfile;
  workspaceInstructions?: string;
  // A lightweight index (title + a short snippet of the opening
  // message, not full content) of the user's other saved
  // conversations -- lets the model answer "how many chats do I have"
  // or "what have we talked about before" and reference past topics by
  // name, without shipping every past conversation's full text on
  // every single request.
  historyIndex?: HistoryIndexEntry[];
  // Idea #6: every question/answer pair has a short shared ID (e.g.
  // "Q-4F2A19"). When the user's new message references one, the app
  // looks it up locally (across all saved history, no matter how old)
  // and sends the exact pair here -- real content, not a guess.
  referencedPair?: { question: string; answer: string };
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
  "- You CAN read PDFs, scanned/image-only PDFs, images, text files, spreadsheets (.xlsx/.xls/.csv), and videos " +
  "the user attaches — for spreadsheets you receive a plain-text preview of the rows (capped in size for very " +
  "large files), not the original formulas/formatting; for videos you receive a handful of frames sampled evenly " +
  "across the clip as still images, not the actual motion or any audio, so say so if asked about those " +
  "specifically (e.g. can't transcribe spoken audio from an attached video).\n" +
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
  "- Every question you answer and its reply share a short ID (shown in the app, e.g. \"Q-4F2A19\"). The user can bring that " +
  "exact exchange back up later, no matter how old, just by mentioning its ID — if you're given a specific past Q/A pair below " +
  "because the user referenced one, treat it as exact ground truth and engage with its real content, not a vague summary.\n" +
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
  "sequential or enumerable, not as a default crutch. Write with personality and clarity, not like a form being filled out.\n\n" +
  "Understanding before answering: read past the literal wording to what the person actually means — their real goal, the " +
  "situation behind the question, what they'd be disappointed not to get. The same words can call for very different replies " +
  "depending on tone (frustrated vs. curious vs. joking), what was said earlier in the conversation, and what's left unsaid but " +
  "implied. When it's genuinely unclear, briefly consider more than one reading before choosing the most likely one — don't just " +
  "grab the surface-level interpretation and run with it.\n\n" +
  "Never echo the user back at them: don't open a reply by restating or rephrasing their question (\"So you're asking about " +
  "X...\"), don't reuse their exact sentence structure or phrasing as your own, and don't pad a reply with filler that just " +
  "repeats what they already said. Every reply should read like it came from actually thinking about the specific message in " +
  "front of you, not from slotting it into a template. Draw on the full range of ways a thoughtful, well-read person might " +
  "respond — direct and to the point, a short story or analogy, a comparison, a question back, a worked example, playful, warm, " +
  "blunt, a table, a mix — and pick whichever genuinely fits this message and this moment, not whichever you used last time. " +
  "Two similar-sounding questions asked at different times should not read like they got the same answer copy-pasted with the " +
  "nouns swapped.";

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

const AI_AGENT_PROMPT =
  CAPABILITIES_PROMPT +
  "\n\nYou are currently in AI Agent mode. You have a web_search tool available and can call it multiple times, " +
  "back to back, to research a question thoroughly before answering — look things up, follow up on what you " +
  "find with more specific searches, cross-check anything that seems uncertain, and only stop searching once " +
  "you actually have enough to give a complete, well-grounded answer. Work autonomously: don't ask the user for " +
  "permission before searching, and don't narrate each search step ('let me look that up...') — just do the " +
  "research and then give one clear, complete final answer, citing sources inline as markdown links where it " +
  "matters.";

const AGENT_TEAM_PROMPT =
  CAPABILITIES_PROMPT +
  "\n\nYou are currently in Agent Team mode: a small team of specialist agents (a planner, 2-3 role-specific " +
  "workers, and a coordinator who writes the final reply) breaks the request apart and works it collaboratively " +
  "instead of one model answering alone. The user sees which roles were involved and gets one cohesive final " +
  "answer, not each agent's raw output pasted together.";

const TOOL_PROMPTS: Record<string, string> = {
  default: SYSTEM_PROMPT,
  deep_research: DEEP_RESEARCH_PROMPT,
  deep_think: DEEP_THINK_PROMPT,
  document_writer: DOCUMENT_WRITER_PROMPT,
  sql_helper: SQL_HELPER_PROMPT,
  python_helper: PYTHON_HELPER_PROMPT,
  business_assistant: BUSINESS_ASSISTANT_PROMPT,
  ai_agent: AI_AGENT_PROMPT,
  agent_team: AGENT_TEAM_PROMPT,
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
  if (personalization?.historyIndex?.length) {
    const idx = personalization.historyIndex;
    const lines = idx.slice(0, 40).map((e) => `- "${e.title}" — ${e.snippet}`).join("\n");
    parts.push(
      `The user has ${idx.length} other saved conversation${idx.length === 1 ? "" : "s"} in their History besides ` +
        `this one. Here's a quick index (title — what it opened with) so you can answer questions like "how many ` +
        `chats do I have" or "what have we talked about before" and reference past topics by name when relevant. ` +
        `You only have this short index, not the full text of those conversations -- if the user wants the actual ` +
        `content, tell them to reopen that chat from History rather than guessing at details you don't have:\n${lines}`
    );
  }
  if (personalization?.referencedPair) {
    const { question, answer } = personalization.referencedPair;
    parts.push(
      `The user's new message references a specific past question by its ID. Here is that exact exchange -- use ` +
        `it as real, precise context (don't just summarize vaguely, engage with the actual content):\n` +
        `Q: ${question}\nA: ${answer}`
    );
  }
  if (personalization?.workspaceInstructions?.trim()) {
    parts.push(
      `This user's ChatGiZa Workspace (a team/enterprise account) has custom instructions that apply to every ` +
        `member's chats — follow them alongside everything else above:\n${personalization.workspaceInstructions.trim()}`
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

// AI Agent: a bounded tool-calling loop, not just a different system prompt
// like the other modes. The model can call web_search as many times as it
// wants (up to MAX_AGENT_STEPS) to research before committing to a final
// answer -- genuinely autonomous multi-step behavior, not one built-in
// search pass like the plain "Web search" tool.
const MAX_AGENT_STEPS = 5;

async function performAgentWebSearch(client: InstanceType<typeof import("openai").default>, query: string): Promise<string> {
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-search-preview",
      web_search_options: {},
      messages: [
        {
          role: "system",
          content:
            "Search the web for the user's query and report back a concise, factual summary of what you find, " +
            "with source names/links inline. This is an internal research step for another AI agent, not a " +
            "user-facing reply -- be dense with facts, skip pleasantries.",
        },
        { role: "user", content: query },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() || "No results found.";
  } catch (err) {
    console.error("Agent web_search tool error:", err);
    return "Search failed -- try a different query or answer from what you already know.";
  }
}

async function runAiAgent(
  client: InstanceType<typeof import("openai").default>,
  system: string,
  messages: ChatMessage[],
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder
) {
  const WEB_SEARCH_TOOL = {
    type: "function" as const,
    function: {
      name: "web_search",
      description: "Search the web for current information. Call this as many times as needed, refining your query each time, before giving a final answer.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "The search query" } },
        required: ["query"],
      },
    },
  };

  // Loosely typed on purpose -- this array holds a mix of plain messages,
  // an assistant message carrying tool_calls, and tool-result messages, and
  // the OpenAI SDK's own message union already enforces the real shape at
  // the call site below via the Parameters<> cast.
  const conversation: Array<{ role: string; content: string | null; tool_calls?: unknown[]; tool_call_id?: string }> = [
    { role: "system", content: system },
    ...messages.map((m) => ({
      role: m.role,
      content: m.role === "user" ? (typeof m.content === "string" ? m.content : contentToText(m.content)) : contentToText(m.content),
    })),
  ];

  for (let step = 0; step < MAX_AGENT_STEPS; step++) {
    const completion = await client.chat.completions.create({
      model: "gpt-5.5",
      messages: conversation as Parameters<typeof client.chat.completions.create>[0]["messages"],
      tools: [WEB_SEARCH_TOOL],
      tool_choice: "auto",
    });
    const message = completion.choices[0]?.message;
    if (!message) break;

    const toolCalls = message.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      // Done researching -- stream the final answer out in small chunks so
      // it still feels like a live reply rather than one big paste.
      const finalText = message.content ?? "";
      const chunkSize = 24;
      for (let i = 0; i < finalText.length; i += chunkSize) {
        controller.enqueue(encoder.encode(finalText.slice(i, i + chunkSize)));
      }
      return;
    }

    conversation.push({ role: "assistant", content: message.content, tool_calls: toolCalls });
    for (const call of toolCalls) {
      let query = "";
      if (call.type === "function") {
        try {
          query = JSON.parse(call.function.arguments)?.query ?? "";
        } catch {
          // Malformed arguments -- fall through with an empty query below.
        }
      }
      const result = query ? await performAgentWebSearch(client, query) : "No query provided.";
      conversation.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }

  // Hit the step cap without a final answer -- ask once more, without
  // tools, so the user still gets something instead of silence.
  const wrapUp = await client.chat.completions.create({
    model: "gpt-5.5",
    messages: [
      ...(conversation as Parameters<typeof client.chat.completions.create>[0]["messages"]),
      { role: "user", content: "Give your best final answer now based on the research so far." },
    ],
  });
  const text = wrapUp.choices[0]?.message?.content ?? "";
  controller.enqueue(encoder.encode(text));
}

type AgentPlanStep = { role: string; task: string };

// A genuine team, not just a different persona: a planner breaks the
// request into 2-4 role-specific sub-tasks, each runs as its own
// focused model call (researchers get the web_search tool, same as AI
// Agent mode), and a coordinator writes one final answer from all of
// it. The user sees which roles were involved before the answer, then
// gets one cohesive reply -- not each agent's raw output pasted
// together.
const MAX_TEAM_SIZE = 4;

async function runAgentTeam(
  client: InstanceType<typeof import("openai").default>,
  system: string,
  messages: ChatMessage[],
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder
) {
  const userRequest = contentToText(messages[messages.length - 1]?.content ?? "");
  const conversationContext = messages
    .slice(0, -1)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${contentToText(m.content).slice(0, 400)}`)
    .join("\n");

  // 1. Plan -- ask for a small JSON list of roles + sub-tasks.
  let plan: AgentPlanStep[] = [];
  try {
    const planCompletion = await client.chat.completions.create({
      model: "gpt-5.5",
      messages: [
        {
          role: "system",
          content:
            "Break the user's request into 2-4 sub-tasks for a small team of specialist agents to work in " +
            "parallel, each with a short role name (e.g. Researcher, Writer, Analyst, Reviewer, Coder -- pick " +
            "whatever fits the actual request) and a one-sentence task description. If the request is simple " +
            "enough for one person, return just 1 step with role \"Assistant\". Respond with ONLY a JSON array " +
            'like [{"role": "Researcher", "task": "..."}, ...], no other text, no markdown fences.',
        },
        { role: "user", content: userRequest },
      ],
    });
    const raw = (planCompletion.choices[0]?.message?.content ?? "[]").trim();
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      plan = parsed
        .filter((s): s is AgentPlanStep => !!s && typeof s.role === "string" && typeof s.task === "string")
        .slice(0, MAX_TEAM_SIZE);
    }
  } catch (err) {
    console.error("Agent team planning failed:", err);
  }
  if (plan.length === 0) plan = [{ role: "Assistant", task: userRequest }];

  // Let the user see the team before the work happens -- this is the
  // whole point of the mode being visibly different from one model
  // answering alone.
  const teamLine = `**Team:** ${plan.map((s) => s.role).join(" → ")}\n\n`;
  controller.enqueue(encoder.encode(teamLine));

  // 2. Each role works its sub-task. Researcher-ish roles get a
  // web_search tool, same one AI Agent mode uses, so "the researcher"
  // can actually look things up instead of guessing.
  const WEB_SEARCH_TOOL = {
    type: "function" as const,
    function: {
      name: "web_search",
      description: "Search the web for current information relevant to your sub-task.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "The search query" } },
        required: ["query"],
      },
    },
  };

  const results: { role: string; task: string; output: string }[] = [];
  for (const step of plan) {
    const looksLikeResearch = /research|search|find|look ?up|investigat/i.test(step.role + step.task);
    try {
      if (looksLikeResearch) {
        const first = await client.chat.completions.create({
          model: "gpt-5.5",
          messages: [
            {
              role: "system",
              content: `You are the ${step.role} on a small AI team. Your specific sub-task: ${step.task}\n\nOriginal user request: ${userRequest}\n\nUse the web_search tool if it would help. Report back your findings/output concisely -- this feeds into a coordinator who writes the final user-facing answer, so be dense with substance, not pleasantries.`,
            },
          ],
          tools: [WEB_SEARCH_TOOL],
          tool_choice: "auto",
        });
        const msg = first.choices[0]?.message;
        if (msg?.tool_calls?.length) {
          const toolResults = await Promise.all(
            msg.tool_calls.map(async (call) => {
              let query = "";
              if (call.type === "function") {
                try {
                  query = JSON.parse(call.function.arguments)?.query ?? "";
                } catch {
                  // Malformed arguments -- proceed with an empty query.
                }
              }
              return query ? await performAgentWebSearch(client, query) : "No query provided.";
            })
          );
          const second = await client.chat.completions.create({
            model: "gpt-5.5",
            messages: [
              { role: "system", content: `You are the ${step.role}. Sub-task: ${step.task}` },
              { role: "assistant", content: msg.content, tool_calls: msg.tool_calls },
              ...msg.tool_calls.map((call, i) => ({
                role: "tool" as const,
                tool_call_id: call.id,
                content: toolResults[i] ?? "",
              })),
            ] as Parameters<typeof client.chat.completions.create>[0]["messages"],
          });
          results.push({ role: step.role, task: step.task, output: second.choices[0]?.message?.content ?? "" });
        } else {
          results.push({ role: step.role, task: step.task, output: msg?.content ?? "" });
        }
      } else {
        const completion = await client.chat.completions.create({
          model: "gpt-5.5",
          messages: [
            {
              role: "system",
              content: `You are the ${step.role} on a small AI team. Your specific sub-task: ${step.task}\n\nOriginal user request: ${userRequest}\n${conversationContext ? `\nEarlier in this conversation:\n${conversationContext}\n` : ""}\nProduce your part of the work. This feeds into a coordinator who writes the final user-facing answer, so be dense with substance, not pleasantries.`,
            },
          ],
        });
        results.push({ role: step.role, task: step.task, output: completion.choices[0]?.message?.content ?? "" });
      }
    } catch (err) {
      console.error(`Agent team step failed (${step.role}):`, err);
      results.push({ role: step.role, task: step.task, output: "(this step failed, work around the gap)" });
    }
  }

  // 3. Coordinator synthesizes one final, cohesive reply -- streamed to
  // the user like a normal answer.
  const teamOutput = results.map((r) => `[${r.role} -- ${r.task}]\n${r.output}`).join("\n\n");
  const finalStream = await client.chat.completions.create({
    model: "gpt-5.5",
    stream: true,
    messages: [
      {
        role: "system",
        content: `${system}\n\nYou are the team coordinator. Your teammates did the work below -- write ONE cohesive final answer to the user's original request from it. Don't mention "the team" or paste their raw output; just give the polished answer as if you produced it yourself, using proper markdown formatting.`,
      },
      { role: "user", content: `Original request: ${userRequest}\n\nTeam output:\n${teamOutput}` },
    ],
  });

  for await (const chunk of finalStream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) controller.enqueue(encoder.encode(delta));
  }
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

  if (tool === "ai_agent") {
    await runAiAgent(client, system, messages, controller, encoder);
    return;
  }

  if (tool === "agent_team") {
    await runAgentTeam(client, system, messages, controller, encoder);
    return;
  }

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

const MEMORY_EXTRACT_SYSTEM_PROMPT = `You extract durable, useful facts about the USER from a conversation, for a personal AI assistant's long-term memory.

Only extract a fact if it is:
- About the user specifically, not general knowledge or something about the assistant.
- Likely to stay true for months, not a one-off detail (e.g. "prefers direct answers" is durable, "is annoyed today" is not).
- Genuinely new -- not already covered, even loosely, by the existing memory list you're given.

Never extract: health conditions, sexuality, religion, immigration status, criminal history, or financial account numbers, even if the user mentions them.

Respond with ONLY a JSON array of short strings (each under 12 words), 0 to 3 items. If there is nothing new and durable worth remembering, respond with []. No other text, no markdown fences.`;

function flattenMessageText(content: string | ChatContentPart[]): string {
  if (typeof content === "string") return content;
  return content
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join(" ");
}

// Powers the app's automatic memory suggestions -- called after a
// conversation has enough back-and-forth, not on every single message
// (the cost/latency of an extra model call isn't worth it per-turn).
// Best-effort: any failure just means no suggestions this round, never
// surfaced as an error to the user.
export async function extractMemoryCandidates(
  messages: ChatMessage[],
  existingMemory: string[]
): Promise<string[]> {
  if (getProvider() !== "openai") return [];

  const recent = messages.slice(-16);
  const transcript = recent
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${flattenMessageText(m.content).slice(0, 500)}`)
    .join("\n");

  const existingList = existingMemory.length > 0 ? existingMemory.map((m) => `- ${m}`).join("\n") : "(none yet)";

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: MEMORY_EXTRACT_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Existing memory:\n${existingList}\n\nConversation:\n${transcript}`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "[]";
    const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 3);
  } catch (err) {
    console.error("Memory extraction failed:", err);
    return [];
  }
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
