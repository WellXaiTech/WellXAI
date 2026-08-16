import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMobilePayload } from "@/lib/mobileAuth";
import { listSessions } from "@/lib/sessions";

export async function GET(req: NextRequest) {
  const session = await auth();
  let userId = session?.user?.id ?? null;
  let currentSessionId: string | null = session?.user?.sessionId ?? null;

  if (!userId) {
    const mobilePayload = await getMobilePayload(req);
    userId = mobilePayload?.sub ?? null;
    currentSessionId = mobilePayload?.sessionId ?? null;
  }

  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const sessions = await listSessions(userId);
  return NextResponse.json({ sessions, currentSessionId });
}
