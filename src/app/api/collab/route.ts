import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";
import { type CollabSession, collabKey, generateCollabCode } from "@/lib/collab";

// Idea #7: a shared AI chat session multiple people can join with a short
// code and all talk to at once -- like a shared document, but for chat.
// No push/WebSocket infra exists in this project, so this is polling-
// based (the app re-fetches every few seconds while the screen is open)
// rather than instant, but it's a real, working, multi-person session,
// not a mockup.
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const displayName = typeof body.displayName === "string" && body.displayName.trim() ? body.displayName.trim().slice(0, 40) : "Someone";

  let code = generateCollabCode();
  for (let attempt = 0; attempt < 3; attempt++) {
    const existing = await kv.get(collabKey(code));
    if (!existing) break;
    code = generateCollabCode();
  }

  const data: CollabSession = {
    code,
    createdBy: userId,
    createdAt: Date.now(),
    participants: [{ id: userId, name: displayName }],
    messages: [],
  };

  try {
    await kv.set(collabKey(code), data);
    return NextResponse.json({ session: data });
  } catch (err) {
    console.error("Collab create error", err);
    const message = err instanceof Error ? err.message : "Failed to create session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
