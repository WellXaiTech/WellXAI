import { streamChatReply, type ChatMessage, type ChatTool, type Personalization } from "@/lib/ai";

export async function POST(request: Request) {
  const body = await request.json();
  const messages = body.messages as ChatMessage[];
  const tool = (body.tool ?? null) as ChatTool;
  const personalization: Personalization = {
    nickname: typeof body.profile?.nickname === "string" ? body.profile.nickname : "",
    about: typeof body.profile?.about === "string" ? body.profile.about : "",
    memory: Array.isArray(body.memory) ? body.memory.filter((m: unknown) => typeof m === "string") : [],
    language: typeof body.language === "string" ? body.language : "",
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
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages array is required" }, { status: 400 });
  }

  const stream = streamChatReply(messages, tool, personalization);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
