import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { checkRateLimit } from "@/lib/rateLimit";
import { startDevServer, e2bConfigured } from "@/lib/e2b";

// Starting a real dev server is heavier than a one-shot terminal command
// (a fresh sandbox, an npm install's worth of setup already having
// happened, a persistent process) -- a lower per-minute ceiling than
// run_terminal_command's is enough, since a real build only starts its dev
// server once or twice per session, not once per turn.
const DEV_SERVER_LIMIT_PER_MINUTE = 6;

// background: true returns as soon as the process is spawned, so this only
// ever blocks on syncing files + the short crash-check delay in
// startDevServer -- not the dev server's own lifetime, which continues
// independently inside the sandbox after this request returns.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!e2bConfigured()) {
    return NextResponse.json({ error: "Real dev server hosting isn't configured yet." }, { status: 503 });
  }

  const rate = await checkRateLimit(`build-dev-server:${user.id}`, DEV_SERVER_LIMIT_PER_MINUTE, 60);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests -- please slow down." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const command = typeof body?.command === "string" ? body.command : "";
  if (!command.trim()) {
    return NextResponse.json({ error: "command is required" }, { status: 400 });
  }
  const port = typeof body?.port === "number" && Number.isFinite(body.port) ? body.port : 5173;
  const files: Record<string, string> = body?.files && typeof body.files === "object" ? body.files : {};
  const sandboxId = typeof body?.sandboxId === "string" ? body.sandboxId : undefined;

  try {
    const result = await startDevServer(files, command, port, sandboxId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Build dev-server error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Something went wrong." }, { status: 500 });
  }
}
