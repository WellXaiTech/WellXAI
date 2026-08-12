import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";
import { extractMemoryCandidates, type ChatMessage } from "@/lib/ai";

// Called by the app in the background after a conversation has enough
// back-and-forth -- not on every message, the whole point is this only
// fires occasionally. Returns suggested new memory entries for the user
// to accept/dismiss; nothing is saved here, that's a separate PUT to
// /api/profile once the user approves a suggestion.
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const messages = body?.messages as ChatMessage[] | undefined;
  const existingMemory = Array.isArray(body?.existingMemory)
    ? body.existingMemory.filter((m: unknown): m is string => typeof m === "string")
    : [];

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  const suggestions = await extractMemoryCandidates(messages, existingMemory);
  return NextResponse.json({ suggestions });
}
