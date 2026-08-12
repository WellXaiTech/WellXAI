import { streamChatReply, type ChatMessage, type ChatTool, type Personalization } from "@/lib/ai";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getWorkspaceInstructionsForUser } from "@/lib/workspace";

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
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages array is required" }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(request)) ?? undefined;

  if (userId) {
    try {
      personalization.workspaceInstructions = (await getWorkspaceInstructionsForUser(userId)) ?? undefined;
    } catch (err) {
      console.error("Workspace instructions lookup failed:", err);
    }
  }

  const stream = streamChatReply(messages, tool, personalization);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
