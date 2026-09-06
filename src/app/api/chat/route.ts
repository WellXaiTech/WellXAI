import { streamChatReply, type ChatMessage, type ChatTool, type Personalization } from "@/lib/ai";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getWorkspaceInstructionsForUser } from "@/lib/workspace";
import { checkRateLimit } from "@/lib/rateLimit";
import { clientIpFromHeaders } from "@/lib/sessions";

// Guests get one free message client-side (see GUEST_FREE_MESSAGES in
// chatgiza/page.tsx) before being prompted to sign in, but that check lives
// entirely in localStorage -- anyone calling this endpoint directly (curl,
// a script, a cleared-storage browser) skipped it completely and could run
// unlimited AI usage at our cost. This is the server-side backstop: a
// generous per-IP daily ceiling for guests (looser than the 1-message UI
// nudge, since IPs can be shared behind NAT/office wifi and this is a hard
// wall, not a UX prompt) and a per-account per-minute ceiling for signed-in
// users so a compromised session or runaway script can't do the same.
const GUEST_DAILY_LIMIT = 5;
const USER_PER_MINUTE_LIMIT = 30;

// Without this, Vercel kills the function at its platform default before
// the reply even starts streaming -- agent_team mode especially can chain
// several sequential model calls (a planner, worker agents, a
// coordinator) before the final streamed answer begins, which can
// genuinely take longer than a short default allows.
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json();
  const messages = body.messages as ChatMessage[];
  const tool = (body.tool ?? null) as ChatTool;
  const personalization: Personalization = {
    nickname: typeof body.profile?.nickname === "string" ? body.profile.nickname : "",
    about: typeof body.profile?.about === "string" ? body.profile.about : "",
    role: typeof body.profile?.role === "string" ? body.profile.role : "",
    memory: Array.isArray(body.memory) ? body.memory.filter((m: unknown) => typeof m === "string") : [],
    language: typeof body.language === "string" ? body.language : "",
    historyIndex: Array.isArray(body.historyIndex)
      ? body.historyIndex
          .filter(
            (e: unknown): e is { title: unknown; snippet: unknown } =>
              !!e && typeof e === "object"
          )
          .map((e: { title: unknown; snippet: unknown }) => ({
            title: typeof e.title === "string" ? e.title : "",
            snippet: typeof e.snippet === "string" ? e.snippet : "",
          }))
          .filter((e: { title: string; snippet: string }) => e.title.length > 0)
      : undefined,
    location: typeof body.location === "string" ? body.location : "",
    company: {
      name: typeof body.company?.name === "string" ? body.company.name : "",
      description: typeof body.company?.description === "string" ? body.company.description : "",
      employees: Array.isArray(body.company?.employees)
        ? body.company.employees.filter(
            (e: unknown): e is { name: string; role: string } =>
              !!e && typeof e === "object" && typeof (e as { name?: unknown }).name === "string"
          )
        : [],
    },
    referencedPair:
      body.referencedPair &&
      typeof body.referencedPair === "object" &&
      typeof body.referencedPair.question === "string" &&
      typeof body.referencedPair.answer === "string"
        ? { question: body.referencedPair.question, answer: body.referencedPair.answer }
        : undefined,
    localDateTime: typeof body.localDateTime === "string" ? body.localDateTime : undefined,
    digitalTwin: typeof body.digitalTwin === "string" ? body.digitalTwin : undefined,
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages array is required" }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(request)) ?? undefined;

  // These two don't depend on each other's result -- run them concurrently
  // instead of back-to-back, so a short "hello" isn't stuck waiting on two
  // sequential KV/DB round-trips before the model call even starts.
  const [rate, workspaceInstructions] = await Promise.all([
    userId
      ? checkRateLimit(`chat:user:${userId}`, USER_PER_MINUTE_LIMIT, 60)
      : checkRateLimit(`chat:guest:${clientIpFromHeaders(request.headers)}`, GUEST_DAILY_LIMIT, 86400),
    userId
      ? getWorkspaceInstructionsForUser(userId).catch((err) => {
          console.error("Workspace instructions lookup failed:", err);
          return undefined;
        })
      : Promise.resolve(undefined),
  ]);

  if (!rate.allowed) {
    return Response.json(
      {
        error: userId
          ? "You're sending messages too quickly -- please slow down."
          : "You've used your free messages -- sign in to keep chatting.",
      },
      { status: 429 }
    );
  }

  personalization.workspaceInstructions = workspaceInstructions ?? undefined;

  const stream = streamChatReply(messages, tool, personalization);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
