import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { revokeAllSessions } from "@/lib/sessions";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Includes the caller's own current session — "Log out of all sessions"
  // means all, matching the description shown next to the button.
  await revokeAllSessions(session.user.id);
  return NextResponse.json({ ok: true });
}
