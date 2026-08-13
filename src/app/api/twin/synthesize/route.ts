import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";
import { synthesizeDigitalTwin, type ChatMessage } from "@/lib/ai";

// Produces a draft digital twin paragraph from the messages the client
// sends (recent turns from the current chat, or a broader sample the app
// pulls across saved History) -- nothing is saved here, that's a separate
// PUT to /api/twin once the user reviews and confirms the draft.
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const messages = body?.messages as ChatMessage[] | undefined;
  const existingTwin = typeof body?.existingTwin === "string" ? body.existingTwin : undefined;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ summary: existingTwin ?? "" });
  }

  const summary = await synthesizeDigitalTwin(messages, existingTwin);
  return NextResponse.json({ summary });
}
