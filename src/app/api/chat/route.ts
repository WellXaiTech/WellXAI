import { streamChatReply, type ChatMessage, type ChatTool, type Personalization } from "@/lib/ai";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";
import { isPaidAccount, checkConversationQuota, recordConversationUsage } from "@/lib/usageLimit";
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
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages array is required" }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(request)) ?? undefined;
  const paid = await isPaidAccount(userId);

  if (userId) {
    try {
      personalization.workspaceInstructions = (await getWorkspaceInstructionsForUser(userId)) ?? undefined;
    } catch (err) {
      console.error("Workspace instructions lookup failed:", err);
    }
  }

  // The old per-network mobile-data free-message wall existed to stop
  // SIM-cycling abuse of anonymous guest access — now that every user must
  // sign in with a real Google account first (no more guest trial), that
  // threat model doesn't apply, so it's gone. What's left is per-account:
  // signed-in, unpaid: 10 free messages per conversation, renewing every 24h.
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : null;
  if (userId && conversationId) {
    const quotaMessage = await checkConversationQuota(userId, conversationId, paid);
    if (quotaMessage) {
      return Response.json({ error: quotaMessage }, { status: 403 });
    }
  }

  if (userId && conversationId) {
    await recordConversationUsage(userId, conversationId, paid);
  }

  const stream = streamChatReply(messages, tool, personalization);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
