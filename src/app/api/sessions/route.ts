import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listSessions } from "@/lib/sessions";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const sessions = await listSessions(session.user.id);
  return NextResponse.json({ sessions, currentSessionId: session.user.sessionId ?? null });
}
