import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

function keyFor(code: string) {
  return `chatgiza:referral-count:${code}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!code || code.length > 20) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await kv.incr(keyFor(code));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Referral redeem error", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
