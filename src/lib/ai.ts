import { kv } from "@vercel/kv";
import { LANGUAGE_MATCH_PROMPT, NO_PLACEHOLDER_CODE_PROMPT, CHATGIZA_VOICE_PROMPT, COMPANY_IDENTITY_PROMPT, MODELS } from "./promptShared";

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
  | "digital_twin"
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
  // Idea #9: a "Digital Twin" -- a short, evolving narrative profile of
  // the user's communication style/voice, interests, values/decision
  // patterns, and current goals, synthesized from their own chats (see
  // synthesizeDigitalTwin below). Passed through so it can both quietly
  // improve personalization in every mode, and be used literally in
  // "digital_twin" mode to answer AS the user.
  digitalTwin?: string;
  // The device's own current wall-clock time, "YYYY-MM-DDTHH:mm", in the
  // user's own local timezone (no timezone offset attached -- matches the
  // same naive-local-time format the scheduled-reminder runAt field uses).
  // Lets the model resolve relative/spoken time references ("today at 6pm",
  // "saa kumi na mbili jioni") into an absolute timestamp correctly.
  localDateTime?: string;
};

type Provider = "openai" | "deepseek" | "anthropic" | "mock";

function getProvider(): Provider {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.DEEPSEEK_API_KEY) return "deepseek";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "mock";
}

// Circuit breaker for OpenAI, shared across every serverless instance via
// KV. Without this, every single request pays for a slow, guaranteed-to-
// fail OpenAI round trip before falling back to DeepSeek whenever OpenAI
// is out of quota/credits or down -- noticeably heavier/slower than just
// answering with DeepSeek directly. Once OpenAI fails with a billing/auth
// error, skip trying it again for a cooldown window and go straight to
// DeepSeek; self-heals automatically once the cooldown lapses and OpenAI
// works again (e.g. credits topped up), no restart needed.
//
// This used to be a plain in-memory variable, which barely worked on
// Vercel: each concurrent lambda instance has its own copy, it resets on
// every cold start, and a healthy instance's markOpenAiUp() could never
// reach a different instance still holding a stale "down" flag -- so one
// instance could keep silently serving DeepSeek for the full cooldown
// after OpenAI had already recovered. KV makes the state actually shared.
// Fails open (treats OpenAI as up) on a KV error, same reasoning as
// rateLimit.ts/usageLimit.ts -- a broken breaker shouldn't be worse than
// no breaker at all.
const OPENAI_COOLDOWN_MS = 5 * 60 * 1000;
const OPENAI_DOWN_KV_KEY = "chatgiza:openai-down-until";

export async function openAiLikelyDown(): Promise<boolean> {
  try {
    const until = await kv.get<number>(OPENAI_DOWN_KV_KEY);
    return typeof until === "number" && Date.now() < until;
  } catch (err) {
    console.error("OpenAI breaker read failed, assuming OpenAI is up:", err);
    return false;
  }
}

export async function markOpenAiDown(error: unknown): Promise<void> {
  const status = (error as { status?: number })?.status;
  const code = (error as { code?: string })?.code;
  // Only trip the breaker for errors that mean OpenAI itself is actually
  // unusable (no credit, revoked/invalid key) -- a bare 429 is often just
  // "you're sending too fast, retry shortly" rate limiting, not an
  // outage, and shouldn't take OpenAI out of rotation for minutes for
  // every other request in flight.
  if (status === 401 || status === 403 || code === "insufficient_quota") {
    try {
      await kv.set(OPENAI_DOWN_KV_KEY, Date.now() + OPENAI_COOLDOWN_MS, { px: OPENAI_COOLDOWN_MS });
    } catch (err) {
      console.error("OpenAI breaker write failed:", err);
    }
  }
}

export async function markOpenAiUp(): Promise<void> {
  try {
    await kv.del(OPENAI_DOWN_KV_KEY);
  } catch (err) {
    console.error("OpenAI breaker clear failed:", err);
  }
}

export function isRealAiConfigured() {
  return getProvider() !== "mock";
}

const CAPABILITIES_PROMPT =
  "You are ChatGiZa, a conversational assistant. Reply in the language the user writes in (or their preferred " +
  "language if one is set below). You have real, working capabilities beyond plain text — know them and offer them proactively " +
  "when relevant, don't just say you can't help:\n\n" +
  LANGUAGE_MATCH_PROMPT + "\n\n" +
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
  "- When you use Web search, Deep research, or AI Agent mode and actually perform a live search, the app automatically shows the " +
  "user a real \"Verified source trail\" card beneath your reply, built from the real pages the search engine returned — not from " +
  "any link you type yourself. Still cite sources inline in your prose as normal for readability, but never claim a source is " +
  "\"verified\" or \"confirmed\" yourself — that badge only means something when it's the app's own trail, and you don't control " +
  "which pages end up in it.\n" +
  "- You CAN speak AS the user in their own voice (\"Digital Twin\" mode, selectable from the \"+\" menu) — it drafts " +
  "replies/decisions the way THEY would write them, based on a profile the app synthesizes from their own past chats " +
  "(Settings > Digital Twin, where they can regenerate or edit it). Outside that specific mode, don't roleplay as the " +
  "user yourself.\n" +
  "- Every question you answer and its reply share a short ID (shown in the app, e.g. \"Q-4F2A19\"). The user can bring that " +
  "exact exchange back up later, no matter how old, just by mentioning its ID — if you're given a specific past Q/A pair below " +
  "because the user referenced one, treat it as exact ground truth and engage with its real content, not a vague summary.\n" +
  "- You CAN set real reminders. When the user asks to be reminded, alerted, or woken up about something at a specific or " +
  "clearly-implied time (in any language — e.g. \"remind me at 6pm about the meeting\", \"nikumbushe kesho asubuhi nichukue dawa\", " +
  "\"niambie saa kumi na mbili jioni nina kazi\"), do two things in the same reply: (1) answer naturally and warmly, confirming in " +
  "plain words what you'll remind them of and when (in their own language/time format, e.g. \"Sawa, nitakukumbusha saa 12 jioni " +
  "kuhusu kazi.\"), and (2) append, at the very end of the reply, on its own line, one exact marker: " +
  "`[[REMINDER_START]]{\"runAt\":\"YYYY-MM-DDTHH:mm\",\"prompt\":\"<short reminder text, in the user's own language>\"}[[REMINDER_END]]`. " +
  "You are given the user's current local date and time below — use it to resolve relative or spoken time references (\"today\", " +
  "\"tomorrow morning\", \"leo\", \"kesho\", Swahili clock hours, etc.) into an exact absolute local timestamp in that same " +
  "\"YYYY-MM-DDTHH:mm\" 24-hour format; never guess a date/time if you weren't given the current one. If the user's message is " +
  "ambiguous about WHEN (no time given or implied at all), don't emit the marker — ask a short clarifying question instead. Never " +
  "show the raw marker text to the user as something to read; it's invisible plumbing the app extracts automatically. Only ever " +
  "emit one marker per reply, and only when the user is genuinely asking to be reminded of something later, not for general " +
  "scheduling questions or when just discussing time.\n" +
  "- This also applies when the user uploads a photo or PDF instead of typing: if what they attached is clearly a calendar, " +
  "event ticket, schedule, invitation, or appointment reminder with a real date/time on it, read it and offer to schedule a " +
  "reminder from it the same way — if the date/time on the attachment is clear and unambiguous, go ahead and emit the marker " +
  "in the same reply (say plainly what you read and what you scheduled, e.g. \"Naona hii ni tiketi ya tamasha tarehe 14 " +
  "Septemba, nitakukumbusha siku hiyo asubuhi.\"); if it's clear there IS an event but the date/time isn't fully legible or " +
  "certain, describe what you can read and ask the user to confirm the date/time rather than guessing or emitting the marker. " +
  "Don't force every upload into a reminder — most attachments (a document to summarize, a photo to describe, a random " +
  "screenshot) are not calendar-related at all, and should just get a normal, helpful reply with no marker.\n" +
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
  "about that separately. " + COMPANY_IDENTITY_PROMPT + "\n\n" +
  CHATGIZA_VOICE_PROMPT + "\n\n" +
  "Writing style: the voice above stays constant — what varies is STRUCTURE, chosen to fit the content, not chosen " +
  "at random for variety's own sake. Don't default to the same shape every time (e.g. always a numbered list): " +
  "sometimes flowing prose, sometimes short paragraphs with a bold lead-in, sometimes a table, sometimes a quote " +
  "or a vivid example, sometimes a mix — whichever actually fits what's being said. Use numbered/bulleted lists " +
  "only when the content is genuinely sequential or enumerable, not as a default crutch. Write with personality " +
  "and clarity, not like a form being filled out.\n\n" +
  "Keep every unit short, whichever shape you chose: a paragraph is 1-3 sentences, a bullet is one line, never " +
  "several unrelated facts crammed into one dense block. When the content genuinely has several categories, " +
  "options, or steps (e.g. \"what are the visa types and their requirements\", \"compare X vs Y\"), give each its " +
  "own bold lead-in line followed by a short line or two under it — not one paragraph that mentions all of them " +
  "run together, and not a single bullet stuffed with every fact about that category at once. Break to a new " +
  "paragraph or bullet the moment the topic shifts, even slightly, rather than continuing the same block. A wall " +
  "of dense, unbroken text is a failure of structure even if the content itself is accurate — a reader should be " +
  "able to scan the reply in a few seconds and see its shape before reading a word of it.\n\n" +
  "Concrete shape to match for multi-category factual content (structure only -- write in the user's actual " +
  "language and topic, this is only to show how SHORT and separated each part should be):\n" +
  "**Category A** -- what it is, in one short line.\n" +
  "- key requirement or fact, one line\n" +
  "- another key requirement or fact, one line\n\n" +
  "**Category B** -- what it is, in one short line.\n" +
  "- key requirement or fact, one line\n" +
  "- another key requirement or fact, one line\n\n" +
  "That is the target density -- roughly one short line per fact, a blank line between categories. NOT this " +
  "(too dense, this is the failure mode to avoid): \"Category A is defined by several requirements including " +
  "requirement one and requirement two and also depends on requirement three, while Category B on the other " +
  "hand requires...\" -- one long paragraph running every category and every fact together is wrong even if " +
  "every fact in it is correct.\n\n" +
  "Understanding before answering: read past the literal wording to what the person actually means — their real goal, the " +
  "situation behind the question, what they'd be disappointed not to get. The same words can call for very different replies " +
  "depending on tone (frustrated vs. curious vs. joking), what was said earlier in the conversation, and what's left unsaid but " +
  "implied. When it's genuinely unclear, briefly consider more than one reading before choosing the most likely one — don't just " +
  "grab the surface-level interpretation and run with it.\n\n" +
  "Never echo the user back at them: don't open a reply by restating or rephrasing their question (\"So you're asking about " +
  "X...\"), don't reuse their exact sentence structure or phrasing as your own, and don't pad a reply with filler that just " +
  "repeats what they already said. Every reply should read like it came from actually thinking about the specific message in " +
  "front of you, not from slotting it into a template. Two similar-sounding questions asked at different times should not read " +
  "like they got the same answer copy-pasted with the nouns swapped.\n\n" +
  "How the above fit together, when they seem to pull in different directions: they apply in order, not all at once. First " +
  "understand what's actually being asked (Understanding before answering). Then, if it's genuinely complex, reason it through " +
  "(the step-by-step guidance above). That gives you the substance of the answer — its depth, specificity, and correctness " +
  "(Depth and quality) are decided at this point and are never sacrificed for the sake of a punchier shape. Only once the " +
  "substance is settled do you choose how to present it (ChatGiZa's voice, Writing style) — structure is chosen to fit the " +
  "content you already have, never the reverse, and never as a way to pad a thin answer into something that merely looks " +
  "complete. Voice stays constant throughout; only structure and depth genuinely vary, and only in response to the content and " +
  "the question, not at random.\n\n" +
  "One more priority rule, since this same base prompt is shared across every mode: anything below this point that describes a " +
  "specific mode (SQL Helper, Document Writer, Python Helper, and so on) always wins over the general guidance above when the " +
  "two genuinely conflict — e.g. SQL Helper's code-block-plus-explanation shape overrides 'don't default to the same " +
  "structure', Document Writer's formal document structure overrides it the same way. The general guidance above is the " +
  "default for ordinary conversation; a mode's own explicit format is a deliberate, narrower choice for that mode's actual " +
  "purpose, not an oversight to be second-guessed against the general rule.";

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

// Idea #9: Digital Twin mode. Unlike every other mode (which is ChatGiZa
// helping the user), this one is ChatGiZa BEING the user -- answering
// entirely in first person, in their synthesized voice, for drafting
// messages in their style or predicting how they'd likely respond/decide.
// It leans entirely on personalization.digitalTwin (injected by
// buildSystemPrompt below); with no twin profile yet it must say so
// rather than inventing a fake personality.
const DIGITAL_TWIN_PROMPT =
  CAPABILITIES_PROMPT +
  "\n\nYou are currently in Digital Twin mode. You are not ChatGiZa helping the user right now -- you ARE the user, " +
  "speaking as them, in first person, using their own voice, phrasing habits, interests, values, and typical way of " +
  "making decisions, exactly as captured in the digital twin profile provided below (in the personalization context). " +
  "Use it to draft messages the way they'd actually write them, answer 'what would I say/decide here' questions as " +
  "them, or let them see their own likely reaction to something. Stay fully in character as the user for the whole " +
  "reply -- never slip into 'as your assistant, I think...' commentary, never break character to explain what you're " +
  "doing, and never invent specific facts (names, events, opinions) the profile doesn't support -- if something is " +
  "genuinely unknown, answer the way the real person would if asked something they hadn't thought about yet, in " +
  "their voice, rather than fabricating certainty. If no digital twin profile was provided at all, don't pretend to " +
  "be the user -- say plainly (as ChatGiZa, breaking the one exception to the rule above) that no profile exists yet " +
  "and it needs to be generated first from Settings > Digital Twin.";

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
  digital_twin: DIGITAL_TWIN_PROMPT,
};

const CANNED_REPLIES = [
  "Happy to help with that — could you tell me a bit more about what you're trying to achieve?",
  "Good question. Here's a starting point: break it down into smaller steps and tackle one at a time.",
  "Here's a quick way to think about it — focus on the outcome first, then work backwards to the details.",
  "Let's work through this together. What's the most important part you want to get right first?",
];

function buildSystemPrompt(base: string, personalization?: Personalization): string {
  const parts: string[] = [base];
  if (personalization?.localDateTime?.trim()) {
    parts.push(
      `The user's current local date and time is ${personalization.localDateTime.trim()} (format YYYY-MM-DDTHH:mm, 24-hour, ` +
        `already in their own timezone). Use this as "now" for anything time-relative, including resolving reminder requests.`
    );
  }
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
  if (personalization?.digitalTwin?.trim()) {
    parts.push(`The user's digital twin profile (a synthesized picture of their voice, interests, values, and goals from their own past chats): ${personalization.digitalTwin.trim()}`);
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

type SourceCitation = { url: string; title: string };

async function performAgentWebSearch(
  client: InstanceType<typeof import("openai").default>,
  query: string
): Promise<{ text: string; citations: SourceCitation[] }> {
  try {
    // gpt-4o-search-preview (Chat Completions' web_search_options) is
    // deprecated by OpenAI -- the Responses API's web_search tool on a
    // regular model is the current replacement.
    const response = await client.responses.create({
      model: MODELS.primary,
      tools: [{ type: "web_search" }],
      input: [
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
    const citations: SourceCitation[] = [];
    for (const item of response.output ?? []) {
      if (item.type !== "message") continue;
      for (const part of item.content ?? []) {
        if (part.type !== "output_text") continue;
        for (const ann of part.annotations ?? []) {
          if (ann.type === "url_citation") citations.push({ url: ann.url, title: ann.title || ann.url });
        }
      }
    }
    return { text: response.output_text?.trim() || "No results found.", citations };
  } catch (err) {
    console.error("Agent web_search tool error:", err);
    return { text: "Search failed -- try a different query or answer from what you already know.", citations: [] };
  }
}

// Standalone entry point for the Build preview's address-bar search --
// same underlying search call as AI Agent's web_search tool, just exposed
// directly instead of only reachable from inside a tool-calling loop. Lets
// that address bar show real search results inline (title + link, like a
// results page) instead of either faking it or leaving chatgiza.com
// entirely just to run a search.
export async function performWebSearch(query: string): Promise<{ text: string; citations: SourceCitation[] }> {
  const client = await getOpenAiClient();
  return performAgentWebSearch(client, query);
}

function encodeSourcesBlock(citations: Map<string, string>): string | null {
  if (citations.size === 0) return null;
  const sources = Array.from(citations.entries()).map(([url, title]) => ({ url, title }));
  return `\n[[SOURCES_START]]${JSON.stringify(sources)}[[SOURCES_END]]`;
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

  const citations = new Map<string, string>();

  for (let step = 0; step < MAX_AGENT_STEPS; step++) {
    const completion = await client.chat.completions.create({
      model: MODELS.primary,
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
      const sourcesBlock = encodeSourcesBlock(citations);
      if (sourcesBlock) controller.enqueue(encoder.encode(sourcesBlock));
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
      const result = query ? await performAgentWebSearch(client, query) : { text: "No query provided.", citations: [] };
      for (const c of result.citations) citations.set(c.url, c.title);
      conversation.push({ role: "tool", tool_call_id: call.id, content: result.text });
    }
  }

  // Hit the step cap without a final answer -- ask once more, without
  // tools, so the user still gets something instead of silence.
  const wrapUp = await client.chat.completions.create({
    model: MODELS.primary,
    messages: [
      ...(conversation as Parameters<typeof client.chat.completions.create>[0]["messages"]),
      { role: "user", content: "Give your best final answer now based on the research so far." },
    ],
  });
  const text = wrapUp.choices[0]?.message?.content ?? "";
  controller.enqueue(encoder.encode(text));
  const sourcesBlock = encodeSourcesBlock(citations);
  if (sourcesBlock) controller.enqueue(encoder.encode(sourcesBlock));
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
      model: MODELS.primary,
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
  const teamCitations = new Map<string, string>();
  for (const step of plan) {
    const looksLikeResearch = /research|search|find|look ?up|investigat/i.test(step.role + step.task);
    try {
      if (looksLikeResearch) {
        const first = await client.chat.completions.create({
          model: MODELS.primary,
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
              return query ? await performAgentWebSearch(client, query) : { text: "No query provided.", citations: [] };
            })
          );
          for (const r of toolResults) for (const c of r.citations) teamCitations.set(c.url, c.title);
          const second = await client.chat.completions.create({
            model: MODELS.primary,
            messages: [
              { role: "system", content: `You are the ${step.role}. Sub-task: ${step.task}` },
              { role: "assistant", content: msg.content, tool_calls: msg.tool_calls },
              ...msg.tool_calls.map((call, i) => ({
                role: "tool" as const,
                tool_call_id: call.id,
                content: toolResults[i]?.text ?? "",
              })),
            ] as Parameters<typeof client.chat.completions.create>[0]["messages"],
          });
          results.push({ role: step.role, task: step.task, output: second.choices[0]?.message?.content ?? "" });
        } else {
          results.push({ role: step.role, task: step.task, output: msg?.content ?? "" });
        }
      } else {
        const completion = await client.chat.completions.create({
          model: MODELS.primary,
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
    model: MODELS.primary,
    stream: true,
    messages: [
      {
        role: "system",
        content: `${system}\n\nYou are the team coordinator. The team output below is raw material -- dense working notes each teammate wrote for you specifically, not draft prose, and likely inconsistent with each other in tone and shape since each was written in isolation. Your job is not to lightly edit or stitch that material together; it's to actually write the final answer yourself, from scratch, in ChatGiZa's voice (as defined in the base instructions above) as if no team existed -- the user should never be able to tell this answer came from synthesizing several separate outputs rather than one person answering directly. Use the material for its substance -- facts, findings, analysis -- not for its phrasing. Don't mention "the team" or any teammate/role by name, and don't preserve any one teammate's individual style over another's; every part of the final answer must read as the same single voice, using proper markdown formatting.`,
      },
      { role: "user", content: `Original request: ${userRequest}\n\nTeam output:\n${teamOutput}` },
    ],
  });

  for await (const chunk of finalStream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) controller.enqueue(encoder.encode(delta));
  }
  const teamSourcesBlock = encodeSourcesBlock(teamCitations);
  if (teamSourcesBlock) controller.enqueue(encoder.encode(teamSourcesBlock));
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

  const chatMessages = messages.map((m) =>
    m.role === "user"
      ? { role: "user" as const, content: m.content }
      : { role: "assistant" as const, content: contentToText(m.content) }
  );

  if (usesSearch) {
    // gpt-4o-search-preview (Chat Completions' web_search_options) is
    // deprecated by OpenAI -- the Responses API's web_search tool on a
    // regular model is the current replacement. Its content-part shape for
    // multi-modal input differs from Chat Completions', so this flattens
    // each message down to plain text (contentToText already does this
    // for assistant turns above; images just become a placeholder here,
    // same as web_search/deep_research's own gpt-4o-search-preview path
    // never supported image input either).
    const searchInput = messages.map((m) => ({
      role: m.role,
      content: contentToText(m.content),
    }));
    const stream = await client.responses.create({
      model: MODELS.primary,
      stream: true,
      tools: [{ type: "web_search" }],
      // Without this, the model treats web_search as available rather than
      // mandatory -- for a question it's confident answering from its own
      // training data (e.g. "list some well-known X sites"), it can and
      // does skip the tool entirely and just type links into its own
      // prose, which is exactly the un-verified case this whole citation
      // system exists to distinguish from. The user picked "Web search"
      // deliberately; every turn in that mode should be a real search.
      tool_choice: "required",
      input: [{ role: "system", content: system }, ...searchInput],
    });

    // Idea #8: real, verifiable sources -- not the model typing links into
    // its own prose (which it can get wrong or invent), but the actual
    // url_citation annotations the web_search tool attaches to its own
    // output, each carrying the exact character range (end_index) of the
    // claim it backs. Rather than only listing everything in one block at
    // the end, an inline [[CITE:i]] (or [[CITE:i,j]] when several sources
    // land at the same point) marker is spliced into the text right after
    // that span, so the client can render a small tappable source badge
    // exactly where the model placed the citation -- opening straight to
    // the article for one source, or a picker when several apply -- with
    // the flat [[SOURCES_START]]...[[SOURCES_END]] block (same convention
    // as PDF export's [[PDF_START]]/[[PDF_END]]) still appended at the end
    // for clients that only want the plain list.
    // Splicing requires the exact offsets, which only exist once an
    // annotation event has fired -- and it can fire after its span's text
    // delta was already flushed downstream, too late to edit. Buffering
    // the full response here (instead of forwarding deltas live) trades a
    // small latency hit, only on this search path, for correct marker
    // placement instead of guessed/misaligned ones.
    let fullText = "";
    const rawAnnotations: { url: string; title: string; endIndex: number }[] = [];
    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        fullText += event.delta;
      } else if (event.type === "response.output_text.annotation.added") {
        const ann = event.annotation as
          | { type?: string; url?: string; title?: string; end_index?: number }
          | undefined;
        if (ann?.type === "url_citation" && ann.url && typeof ann.end_index === "number") {
          rawAnnotations.push({ url: ann.url, title: ann.title || ann.url, endIndex: ann.end_index });
        }
      }
    }

    const orderedUrls: string[] = [];
    const titleByUrl = new Map<string, string>();
    for (const a of rawAnnotations) {
      if (!titleByUrl.has(a.url)) {
        titleByUrl.set(a.url, a.title);
        orderedUrls.push(a.url);
      }
    }
    const indexByUrl = new Map(orderedUrls.map((u, i) => [u, i]));

    // Group citations that land at the same offset into one combined
    // marker (e.g. [[CITE:0,2]]) so the client shows one badge -- with a
    // picker on tap -- instead of several badges stacked back-to-back.
    const groupsByEndIndex = new Map<number, number[]>();
    for (const a of rawAnnotations) {
      const idx = indexByUrl.get(a.url);
      if (idx === undefined) continue;
      const group = groupsByEndIndex.get(a.endIndex) ?? [];
      if (!group.includes(idx)) group.push(idx);
      groupsByEndIndex.set(a.endIndex, group);
    }
    // Insert from the highest offset down so earlier offsets stay valid as
    // the string grows.
    const insertionsDesc = Array.from(groupsByEndIndex.entries()).sort((a, b) => b[0] - a[0]);
    for (const [endIndex, indices] of insertionsDesc) {
      const pos = Math.min(endIndex, fullText.length);
      fullText = `${fullText.slice(0, pos)}[[CITE:${indices.join(",")}]]${fullText.slice(pos)}`;
    }

    controller.enqueue(encoder.encode(fullText));
    if (orderedUrls.length > 0) {
      const sources = orderedUrls.map((url) => ({ url, title: titleByUrl.get(url) || url }));
      controller.enqueue(encoder.encode(`\n[[SOURCES_START]]${JSON.stringify(sources)}[[SOURCES_END]]`));
    }
    return;
  }

  // The plain conversational path (default, deep_think, document_writer,
  // sql_helper, python_helper, business_assistant, digital_twin): real
  // token-by-token streaming, straight through to the client.
  const completion = await client.chat.completions.create({
    model: MODELS.primary,
    stream: true,
    ...(deepThink ? { reasoning_effort: "high" as const } : { reasoning_effort: "medium" as const }),
    messages: [{ role: "system", content: system }, ...chatMessages],
  });

  for await (const chunk of completion) {
    const delta = chunk.choices[0]?.delta;
    if (delta?.content) controller.enqueue(encoder.encode(delta.content));
  }
}

// DeepSeek's API is OpenAI-SDK-compatible (same client, just a different
// baseURL/model), so this reuses the "openai" package rather than a
// separate SDK. Kept intentionally simpler than streamOpenAi -- no
// web_search/ai_agent/agent_team tool-calling loops here, since those lean
// on OpenAI-only endpoints (gpt-4o-search-preview, etc.) that don't have a
// DeepSeek equivalent; plain conversational replies (the vast majority of
// traffic) are what actually needs a second working provider. Image
// content parts are flattened to text first since DeepSeek's chat models
// aren't vision-capable.
export type SearchHit = { title: string; url: string; content: string };

// DeepSeek's developer API (unlike OpenAI's Responses API) has no built-in
// hosted web_search tool -- the search feature visible in DeepSeek's own
// consumer app is internal to that product and isn't exposed over the
// public Chat Completions endpoint this app calls. Their own docs point to
// "caller-executed" search instead: the caller fetches real results itself
// and hands them to the model as context. Tavily fills that role here.
export async function tavilySearch(query: string): Promise<SearchHit[]> {
  if (!process.env.TAVILY_API_KEY || !query.trim()) return [];
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.TAVILY_API_KEY}` },
      body: JSON.stringify({ query, max_results: 6 }),
    });
    if (!res.ok) {
      console.error("Tavily search failed:", res.status, await res.text().catch(() => ""));
      return [];
    }
    const data: unknown = await res.json();
    const results: unknown[] = Array.isArray((data as { results?: unknown })?.results)
      ? (data as { results: unknown[] }).results
      : [];
    return results
      .map((r) => (r && typeof r === "object" ? (r as Record<string, unknown>) : null))
      .filter((r): r is Record<string, unknown> => !!r && typeof r.url === "string" && typeof r.title === "string")
      .map((r) => ({ title: r.title as string, url: r.url as string, content: typeof r.content === "string" ? r.content : "" }));
  } catch (err) {
    console.error("Tavily search error:", err);
    return [];
  }
}

async function streamDeepSeek(
  messages: ChatMessage[],
  tool: ChatTool,
  controller: ReadableStreamDefaultController<Uint8Array>,
  personalization?: Personalization
) {
  const encoder = new TextEncoder();
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: MODELS.fallbackBaseUrl,
  });

  const deepThink = tool === "deep_think";
  let system = buildSystemPrompt(TOOL_PROMPTS[tool ?? "default"] ?? SYSTEM_PROMPT, personalization);

  // Real search results, fetched directly rather than left to the model --
  // same reasoning as OpenAI's verified url_citation data (Idea #8): the
  // model should ground its answer in actual pages it's shown, not links
  // typed from memory. Without this block, a search-mode request that
  // lands on this fallback path (OpenAI down/out of quota) would answer
  // from training data alone while still talking as if it can search --
  // this grounds it in real results instead, or is silently skipped if
  // nothing relevant was found (no TAVILY_API_KEY, or an empty result set).
  const usesSearch = tool === "web_search" || tool === "deep_research";
  let searchResults: SearchHit[] = [];
  if (usesSearch) {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    const query = lastUserMessage ? contentToText(lastUserMessage.content) : "";
    searchResults = await tavilySearch(query);
    if (searchResults.length > 0) {
      const context = searchResults.map((r, i) => `[${i + 1}] ${r.title} -- ${r.url}\n${r.content}`).join("\n\n");
      system +=
        "\n\nReal, live web search results for the user's latest message, fetched just now -- ground your answer in " +
        "these (cite/reference the ones you actually use in your own words, don't just relist them) rather than " +
        "typing your own guessed links, and don't claim you're unable to search -- you already have real results " +
        `below:\n\n${context}`;
    }
  }

  const completion = await client.chat.completions.create({
    model: deepThink ? "deepseek-reasoner" : MODELS.fallback,
    stream: true,
    messages: [
      { role: "system", content: system },
      ...messages.map((m) => ({ role: m.role, content: contentToText(m.content) })),
    ],
  });

  for await (const chunk of completion) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) controller.enqueue(encoder.encode(delta));
  }

  // Flat list only (no inline [[CITE:i]] splicing like the OpenAI path) --
  // DeepSeek's plain completion doesn't hand back per-claim offsets the
  // way OpenAI's url_citation annotations do, so there's no reliable way
  // to know which sentence used which source. SourceTrail still renders
  // this as a real, verified source list either way.
  if (searchResults.length > 0) {
    const sources = searchResults.map((r) => ({ url: r.url, title: r.title }));
    controller.enqueue(encoder.encode(`\n[[SOURCES_START]]${JSON.stringify(sources)}[[SOURCES_END]]`));
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
        if (provider === "openai") {
          if ((await openAiLikelyDown()) && process.env.DEEPSEEK_API_KEY) {
            await streamDeepSeek(messages, tool, controller, personalization);
          } else {
            try {
              await streamOpenAi(messages, tool, controller, personalization);
              await markOpenAiUp();
            } catch (error) {
              // Both providers configured and both should work (not one
              // replacing the other) -- if OpenAI itself fails (quota,
              // outage, bad key), DeepSeek keeps replies flowing instead of
              // the user just seeing an error.
              if (process.env.DEEPSEEK_API_KEY) {
                console.error("OpenAI stream failed, falling back to DeepSeek:", error);
                await markOpenAiDown(error);
                await streamDeepSeek(messages, tool, controller, personalization);
              } else {
                throw error;
              }
            }
          }
        } else if (provider === "deepseek") await streamDeepSeek(messages, tool, controller, personalization);
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
  "before or after. Use console.log/console.warn/console.error for any output, since that is the only way results are visible.\n\n" +
  NO_PLACEHOLDER_CODE_PROMPT + "\n\n" +
  "Some requests are a follow-up on code that already exists (you'll see the editor's current, real content right before " +
  "the request, and possibly earlier prompts before that). When that's the case, treat the current code as the source of " +
  "truth — it may include manual edits made after anything you wrote earlier, which you were never told about — and make " +
  "only the change the new request actually asks for, keeping everything else in it exactly as it is. Do not regenerate " +
  "the file from scratch, from memory, or from what an earlier prompt asked for; that silently discards working code and " +
  "any hand edits, which is the one failure mode to avoid above all others here. Return the complete file either way " +
  "(this is a full-file output, not a diff) — just make sure that full file is the current one with the requested change " +
  "applied, not a fresh reconstruction. A full rewrite is only appropriate when the request itself clearly asks to start over.";

// Not fully anchored to the string's start/end -- a model reply with any
// leading/trailing whitespace, or a fence with no language tag at all,
// used to fail this match and get returned as literal, unrunnable
// ```-wrapped text straight into the sandbox.
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```[a-zA-Z]*\n?([\s\S]*?)\n?```$/);
  return fenced ? fenced[1] : trimmed;
}

export type CodeGenTurn = { prompt: string; code: string };

export async function generateCode(prompt: string, currentCode?: string, history?: CodeGenTurn[]): Promise<string> {
  if (!process.env.OPENAI_API_KEY && !process.env.DEEPSEEK_API_KEY) {
    throw new Error("Code generation needs an OpenAI or DeepSeek API key configured.");
  }

  const { default: OpenAI } = await import("openai");
  // Earlier turns give the model real conversational context (what was
  // already asked for), but the code inside them can be stale the moment
  // the user edits the textarea by hand -- so the *current* editor
  // content is always injected fresh in the final turn below, the same
  // "don't trust history for live state" fix already applied to the
  // Build agent's file map.
  const historyMessages = (history ?? []).flatMap((turn) => [
    { role: "user" as const, content: turn.prompt },
    { role: "assistant" as const, content: turn.code },
  ]);
  const finalUserContent = currentCode?.trim()
    ? `Current code in the editor:\n\n${currentCode}\n\n---\n\nRequest: ${prompt}`
    : prompt;
  const genMessages = [
    { role: "system" as const, content: CODE_GEN_SYSTEM_PROMPT },
    ...historyMessages,
    { role: "user" as const, content: finalUserContent },
  ];

  // OpenAI stays primary; DeepSeek steps in if OpenAI itself fails (quota,
  // outage, bad key) so the Code panel keeps working either way -- same
  // fallback pattern as the main chat provider and the Build agent.
  let text = "";
  if (process.env.OPENAI_API_KEY && !((await openAiLikelyDown()) && process.env.DEEPSEEK_API_KEY)) {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await client.chat.completions.create({ model: MODELS.primary, messages: genMessages });
      text = completion.choices[0]?.message?.content?.trim() ?? "";
      await markOpenAiUp();
    } catch (err) {
      if (!process.env.DEEPSEEK_API_KEY) throw err;
      console.error("Code generation: OpenAI failed, falling back to DeepSeek:", err);
      await markOpenAiDown(err);
    }
  }
  if (!text && process.env.DEEPSEEK_API_KEY) {
    const client = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: MODELS.fallbackBaseUrl });
    const completion = await client.chat.completions.create({ model: MODELS.fallback, messages: genMessages });
    text = completion.choices[0]?.message?.content?.trim() ?? "";
  }

  if (!text) throw new Error("No code was returned.");
  return stripCodeFences(text);
}

const EBOOK_PAGE_SYSTEM_PROMPT = `You are a professional author, writing one page at a time inside a page-by-page book editor. You're given the book's title, an optional brief, the content of every earlier page (for continuity), and what THIS page should cover.

Rules:
- Write only THIS page's content in Markdown -- not the whole book, not a recap of earlier pages.
- Use "##" for a page/section heading if one fits naturally, **bold** for key terms, "-" bullet lists where they help.
- Write real, substantive content -- explanations, examples, practical detail -- not filler or placeholder text.
- Stay consistent with earlier pages (tone, terminology, where the narrative/argument left off) without repeating them.
- Output ONLY the Markdown for this page -- no commentary, no code fences, no "Here is page N" preamble.`;

// Powers the /ebook/[id] editor's "Write with AI" action on a single page --
// unlike a one-shot whole-book generator, this only ever writes the page
// currently open, using every earlier page as context, so a book can be
// built one page at a time and hand-edited in between (see ebook_pages).
// Same OpenAI-primary/DeepSeek-fallback pattern as generateCode above.
export async function generateEbookPage(
  title: string,
  brief: string,
  previousPages: string[],
  instruction: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY && !process.env.DEEPSEEK_API_KEY) {
    throw new Error("E-book generation needs an OpenAI or DeepSeek API key configured.");
  }

  const { default: OpenAI } = await import("openai");
  // Only the most recent few pages are sent as context (each capped in
  // length) -- enough for continuity without letting a long book blow past
  // the model's context window on every single page write.
  const recentPages = previousPages.slice(-6);
  const startIndex = previousPages.length - recentPages.length;
  const context = [
    `Book title: ${title}`,
    brief.trim() && `Brief: ${brief.trim()}`,
    recentPages.length > 0
      ? `Earlier pages so far:\n\n${recentPages.map((p, i) => `--- Page ${startIndex + i + 1} ---\n${p.slice(0, 2000)}`).join("\n\n")}`
      : "This is the first page of the book.",
    `What this next page should cover: ${instruction.trim() || "Continue the book naturally from where it left off."}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  const genMessages = [
    { role: "system" as const, content: EBOOK_PAGE_SYSTEM_PROMPT },
    { role: "user" as const, content: context },
  ];

  let text = "";
  if (process.env.OPENAI_API_KEY && !((await openAiLikelyDown()) && process.env.DEEPSEEK_API_KEY)) {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await client.chat.completions.create({ model: MODELS.primary, messages: genMessages, max_tokens: 1600 });
      text = completion.choices[0]?.message?.content?.trim() ?? "";
      await markOpenAiUp();
    } catch (err) {
      if (!process.env.DEEPSEEK_API_KEY) throw err;
      console.error("E-book page generation: OpenAI failed, falling back to DeepSeek:", err);
      await markOpenAiDown(err);
    }
  }
  if (!text && process.env.DEEPSEEK_API_KEY) {
    const client = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: MODELS.fallbackBaseUrl });
    const completion = await client.chat.completions.create({ model: MODELS.fallback, messages: genMessages, max_tokens: 1600 });
    text = completion.choices[0]?.message?.content?.trim() ?? "";
  }

  if (!text) throw new Error("No page content was returned.");
  return stripCodeFences(text);
}

const WRITING_REVIEW_SYSTEM_PROMPT = `You are a writing reviewer -- similar in spirit to Grammarly, but you have no separate grammar engine, only your own judgment of the text. Given a piece of plain text, find real, concrete issues and return a JSON review.

Respond with ONLY valid JSON, no markdown code fences, no text before or after, matching exactly this shape:
{"score": number, "suggestions": [{"category": "correctness" | "clarity" | "engagement" | "delivery", "title": string, "original": string, "replacement": string, "explanation": string}]}

- score: an honest overall writing-quality score from 0 to 100.
- suggestions: up to 8 real issues. Each "original" must be an EXACT short substring copied verbatim from the input text (a word or short phrase, never a whole paragraph) -- the caller finds and replaces this exact text, so it must match character-for-character. "replacement" is the corrected/improved version of just that substring.
- category: "correctness" for grammar/spelling/punctuation errors, "clarity" for wordy or confusing phrasing, "engagement" for dull or weak word choices, "delivery" for tone/formality issues.
- title: a short label, e.g. "Correct the punctuation", "Verb problem", "Correct word choice".
- If the text genuinely has no issues, return an empty suggestions array and a high score. Never invent a problem just to have something to say.`;

export type WritingSuggestion = {
  id: string;
  category: "correctness" | "clarity" | "engagement" | "delivery";
  title: string;
  original: string;
  replacement: string;
  explanation: string;
};
export type WritingReview = { score: number; suggestions: WritingSuggestion[] };

function parseWritingReview(raw: string): WritingReview {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```[a-zA-Z]*\n?([\s\S]*?)\n?```$/);
  const parsed = JSON.parse(fenced ? fenced[1] : trimmed);
  const categories = new Set(["correctness", "clarity", "engagement", "delivery"]);
  const score = typeof parsed.score === "number" ? Math.max(0, Math.min(100, Math.round(parsed.score))) : 0;
  const rawSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
  const suggestions: WritingSuggestion[] = rawSuggestions
    .filter((s: unknown): s is Record<string, unknown> => typeof s === "object" && s !== null)
    .map((s: Record<string, unknown>, i: number) => ({
      id: `s${i}`,
      category: categories.has(s.category as string) ? (s.category as WritingSuggestion["category"]) : "correctness",
      title: typeof s.title === "string" ? s.title : "Suggestion",
      original: typeof s.original === "string" ? s.original : "",
      replacement: typeof s.replacement === "string" ? s.replacement : "",
      explanation: typeof s.explanation === "string" ? s.explanation : "",
    }))
    .filter((s: WritingSuggestion) => s.original)
    .slice(0, 8);
  return { score, suggestions };
}

// Powers the /ebook editor's "Review suggestions" panel -- a real AI read of
// the page's plain text (not a dedicated grammar engine, which we don't
// have), returning a score plus concrete find-and-replace suggestions the
// client applies by locating each "original" substring in the live Tiptap
// document. Same JSON-mode / OpenAI-primary-DeepSeek-fallback pattern as
// generateBusinessAdvice.
export async function reviewWriting(text: string): Promise<WritingReview> {
  if (!process.env.OPENAI_API_KEY && !process.env.DEEPSEEK_API_KEY) {
    throw new Error("Writing review needs an OpenAI or DeepSeek API key configured.");
  }

  const { default: OpenAI } = await import("openai");
  const genMessages = [
    { role: "system" as const, content: WRITING_REVIEW_SYSTEM_PROMPT },
    { role: "user" as const, content: text.slice(0, 8000) },
  ];

  let raw = "";
  if (process.env.OPENAI_API_KEY && !((await openAiLikelyDown()) && process.env.DEEPSEEK_API_KEY)) {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await client.chat.completions.create({
        model: MODELS.primary,
        messages: genMessages,
        response_format: { type: "json_object" },
      });
      raw = completion.choices[0]?.message?.content?.trim() ?? "";
      await markOpenAiUp();
    } catch (err) {
      if (!process.env.DEEPSEEK_API_KEY) throw err;
      console.error("Writing review: OpenAI failed, falling back to DeepSeek:", err);
      await markOpenAiDown(err);
    }
  }
  if (!raw && process.env.DEEPSEEK_API_KEY) {
    const client = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: MODELS.fallbackBaseUrl });
    const completion = await client.chat.completions.create({ model: MODELS.fallback, messages: genMessages });
    raw = completion.choices[0]?.message?.content?.trim() ?? "";
  }

  if (!raw) throw new Error("No review was returned.");
  return parseWritingReview(raw);
}

const BUSINESS_ADVICE_SYSTEM_PROMPT = `You are a business consultant helping a small business owner (in Tanzania/East Africa) who just added a product to their ChackAll storefront. Given the product's title, description, and source site, give brief, practical, actionable advice.

Respond with ONLY valid JSON, no markdown code fences, no text before or after, matching exactly this shape:
{"price": string, "audience": string, "caption": string, "angle": string, "complementaryProduct": string}

- price: a pricing/margin idea
- audience: the likely target customer
- caption: one ready-to-post marketing caption
- angle: one marketing angle/hook idea, different from the caption
- complementaryProduct: one specific complementary product they could also sell alongside this one

Every value must be in Swahili, a short practical sentence (under 20 words each). If the product details are too thin to say anything specific, give general advice for that product category instead of refusing.`;

export type BusinessAdvice = {
  price: string;
  audience: string;
  caption: string;
  angle: string;
  complementaryProduct: string;
};

function parseBusinessAdvice(raw: string): BusinessAdvice {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```[a-zA-Z]*\n?([\s\S]*?)\n?```$/);
  const parsed = JSON.parse(fenced ? fenced[1] : trimmed);
  const fields: (keyof BusinessAdvice)[] = ["price", "audience", "caption", "angle", "complementaryProduct"];
  for (const field of fields) {
    if (typeof parsed[field] !== "string") throw new Error(`missing field: ${field}`);
  }
  return parsed;
}

// Powers the ChackAll storefront's "business advice" panel -- a one-shot,
// non-streaming call (this is a short burst of categorized advice shown
// right after a link is unfurled, not a back-and-forth chat), reusing the
// same OpenAI-primary/DeepSeek-fallback pattern as generateCode above.
export async function generateBusinessAdvice(product: {
  title: string | null;
  description: string | null;
  siteName: string | null;
  url: string;
}): Promise<BusinessAdvice> {
  if (!process.env.OPENAI_API_KEY && !process.env.DEEPSEEK_API_KEY) {
    throw new Error("Business advice needs an OpenAI or DeepSeek API key configured.");
  }

  const { default: OpenAI } = await import("openai");
  const productSummary = [
    product.title && `Title: ${product.title}`,
    product.siteName && `Source: ${product.siteName}`,
    product.description && `Description: ${product.description}`,
    `URL: ${product.url}`,
  ]
    .filter(Boolean)
    .join("\n");
  const genMessages = [
    { role: "system" as const, content: BUSINESS_ADVICE_SYSTEM_PROMPT },
    { role: "user" as const, content: productSummary },
  ];

  let text = "";
  if (process.env.OPENAI_API_KEY && !((await openAiLikelyDown()) && process.env.DEEPSEEK_API_KEY)) {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await client.chat.completions.create({
        model: MODELS.primary,
        messages: genMessages,
        response_format: { type: "json_object" },
      });
      text = completion.choices[0]?.message?.content?.trim() ?? "";
      await markOpenAiUp();
    } catch (err) {
      if (!process.env.DEEPSEEK_API_KEY) throw err;
      console.error("Business advice: OpenAI failed, falling back to DeepSeek:", err);
      await markOpenAiDown(err);
    }
  }
  if (!text && process.env.DEEPSEEK_API_KEY) {
    const client = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: MODELS.fallbackBaseUrl });
    const completion = await client.chat.completions.create({ model: MODELS.fallback, messages: genMessages });
    text = completion.choices[0]?.message?.content?.trim() ?? "";
  }

  if (!text) throw new Error("No advice was returned.");
  return parseBusinessAdvice(text);
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

const DIGITAL_TWIN_SYNTHESIS_PROMPT = `You build a short "digital twin" profile of the USER from their own chat history, for a personal AI assistant feature that lets the user get replies written in their own voice.

Write ONE cohesive paragraph (120-220 words), in third person, covering whichever of these the conversation actually gives evidence for -- skip any you have no real basis for, don't pad with generic filler:
- Voice and communication style: how direct/formal/casual they are, typical phrasing habits, tone.
- Interests and areas of expertise or knowledge.
- Values and decision-making patterns: what they seem to prioritize, how they weigh tradeoffs.
- Current goals or ongoing projects/priorities, if apparent.

Base this ONLY on real patterns actually visible across the conversation -- never invent specifics (names, opinions, facts) with no support. If an existing profile is provided, refine and update it with anything new rather than starting over, keeping what's still accurate.

Never include: health conditions, sexuality, religion, immigration status, criminal history, or financial account numbers, even if mentioned.

Respond with ONLY the paragraph itself -- no heading, no markdown, no preamble like "Here is the profile".`;

// Idea #9: unlike extractMemoryCandidates (discrete, literal facts with an
// accept/dismiss flow), this produces one holistic narrative -- closer to
// a mirror of the user than a fact list -- meant to be reviewed/edited by
// the user before saving, then reused both for general personalization
// (buildSystemPrompt above) and literally in Digital Twin mode.
export async function synthesizeDigitalTwin(messages: ChatMessage[], existingTwin?: string): Promise<string> {
  if (getProvider() !== "openai") return existingTwin ?? "";

  const recent = messages.slice(-60);
  const transcript = recent
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${flattenMessageText(m.content).slice(0, 400)}`)
    .join("\n");

  if (!transcript.trim()) return existingTwin ?? "";

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: MODELS.primary,
      messages: [
        { role: "system", content: DIGITAL_TWIN_SYNTHESIS_PROMPT },
        {
          role: "user",
          content: `${existingTwin?.trim() ? `Existing profile:\n${existingTwin.trim()}\n\n` : ""}Conversation:\n${transcript}`,
        },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() || existingTwin || "";
  } catch (err) {
    console.error("Digital twin synthesis failed:", err);
    return existingTwin ?? "";
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
