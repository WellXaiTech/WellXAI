import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { unfurlUrl } from "@/lib/unfurl";

// unfurlUrl needs Node's dns/net modules for its SSRF guard -- not
// available on the Edge runtime.
export const runtime = "nodejs";

// Keyed by IP, not a signed-in user -- the store landing page (the ChackAll
// prototype) is public with no auth yet.
const LIMIT_PER_MINUTE = 20;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rate = await checkRateLimit(`store-unfurl:${ip}`, LIMIT_PER_MINUTE, 60);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many links -- please slow down." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  try {
    const result = await unfurlUrl(url);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Store unfurl error:", err);
    return NextResponse.json({ error: "Could not read that link -- fill the details in yourself." }, { status: 502 });
  }
}
