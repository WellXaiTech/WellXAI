import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { checkRateLimit } from "@/lib/rateLimit";
import { syncFilesToSandbox, e2bConfigured } from "@/lib/e2b";

// Keeps a live dev server's own filesystem in sync with the project's real
// files after an edit -- write_file/replace_in_file/delete_file only ever
// touch the in-memory file map (and GitHub/Vercel) on their own, so without
// this the dev-server iframe would silently go stale after the first edit
// made once a server is already running. Fire-and-forget from the client,
// same spirit as the existing GitHub/Vercel auto-sync routes -- nothing
// here waits on or reports a build result back into the conversation.
const SYNC_LIMIT_PER_MINUTE = 30;

export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!e2bConfigured()) {
    return NextResponse.json({ error: "Real dev server hosting isn't configured yet." }, { status: 503 });
  }

  const rate = await checkRateLimit(`build-dev-server-sync:${user.id}`, SYNC_LIMIT_PER_MINUTE, 60);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests -- please slow down." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const sandboxId = typeof body?.sandboxId === "string" ? body.sandboxId : "";
  if (!sandboxId) {
    return NextResponse.json({ error: "sandboxId is required" }, { status: 400 });
  }
  const files: Record<string, string> = body?.files && typeof body.files === "object" ? body.files : {};

  await syncFilesToSandbox(sandboxId, files);
  return NextResponse.json({ ok: true });
}
