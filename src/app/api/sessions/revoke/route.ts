import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { revokeSession } from "@/lib/sessions";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const sessionId = body?.sessionId;
  if (typeof sessionId !== "string" || !sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  await revokeSession(session.user.id, sessionId);
  return NextResponse.json({ ok: true });
}
