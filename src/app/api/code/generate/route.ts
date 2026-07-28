import { NextRequest, NextResponse } from "next/server";
import { generateCode } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const prompt = body?.prompt as string | undefined;

  if (!prompt || !prompt.trim()) {
    return NextResponse.json({ error: "Describe what code you want" }, { status: 400 });
  }

  try {
    const code = await generateCode(prompt.trim());
    return NextResponse.json({ code });
  } catch (err) {
    console.error("Code generation error", err);
    const message = err instanceof Error ? err.message : "Failed to generate code";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
