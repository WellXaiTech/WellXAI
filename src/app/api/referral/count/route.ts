import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.trim();
  if (!code) return NextResponse.json({ count: 0 });

  try {
    const count = (await kv.get<number>(`chatgiza:referral-count:${code}`)) ?? 0;
    return NextResponse.json({ count });
  } catch (err) {
    console.error("Referral count error", err);
    return NextResponse.json({ count: 0 });
  }
}
