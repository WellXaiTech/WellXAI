import { NextRequest, NextResponse } from "next/server";
import { generateCode, type CodeGenTurn } from "@/lib/ai";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";

function parseHistory(value: unknown): CodeGenTurn[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const turns = value
    .filter((t): t is { prompt: unknown; code: unknown } => !!t && typeof t === "object")
    .map((t) => ({ prompt: String((t as { prompt: unknown }).prompt ?? ""), code: String((t as { code: unknown }).code ?? "") }))
    .filter((t) => t.prompt && t.code);
  // Caps how much of the conversation gets resent on every follow-up --
  // each turn repeats a full code blob, so this is the main cost lever,
  // same discipline as the slice(-16)/(-60) caps elsewhere in ai.ts.
  return turns.slice(-6);
}

// Same reasoning as /api/build/turn's maxDuration -- a non-streaming
// completion generating real, complete code can exceed Vercel's default
// function timeout, especially through the DeepSeek fallback.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const prompt = body?.prompt as string | undefined;

  if (!prompt || !prompt.trim()) {
    return NextResponse.json({ error: "Describe what code you want" }, { status: 400 });
  }

  const currentCode = typeof body?.currentCode === "string" ? body.currentCode : undefined;
  const history = parseHistory(body?.history);

  try {
    const code = await generateCode(prompt.trim(), currentCode, history);
    return NextResponse.json({ code });
  } catch (err) {
    console.error("Code generation error", err);
    const message = err instanceof Error ? err.message : "Failed to generate code";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
