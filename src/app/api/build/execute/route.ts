import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { checkRateLimit } from "@/lib/rateLimit";
import { runInSandbox, e2bConfigured } from "@/lib/e2b";

// Real commands cost real sandbox time -- tighter than the 40/min turn
// limits, since a normal build only needs a handful of these per session
// (install, test, build), not one per model turn.
const EXECUTE_LIMIT_PER_MINUTE = 20;

// A real sandboxed command can legitimately take a while (npm install,
// a build). Vercel would otherwise kill this before E2B even finishes.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!e2bConfigured()) {
    return NextResponse.json({ error: "Real terminal execution isn't configured yet." }, { status: 503 });
  }

  const rate = await checkRateLimit(`build-execute:${user.id}`, EXECUTE_LIMIT_PER_MINUTE, 60);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests -- please slow down." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const command = typeof body?.command === "string" ? body.command : "";
  if (!command.trim()) {
    return NextResponse.json({ error: "command is required" }, { status: 400 });
  }
  const files: Record<string, string> = body?.files && typeof body.files === "object" ? body.files : {};
  const sandboxId = typeof body?.sandboxId === "string" ? body.sandboxId : undefined;

  try {
    const result = await runInSandbox(files, command, sandboxId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Build execute error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Something went wrong." }, { status: 500 });
  }
}
