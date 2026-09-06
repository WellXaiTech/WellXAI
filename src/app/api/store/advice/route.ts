import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { generateBusinessAdvice } from "@/lib/ai";

// Public, keyed by IP -- same as /api/store/unfurl, no auth yet on the
// store landing page. Lower than the unfurl limit since this is an AI
// call, not a plain fetch.
const LIMIT_PER_MINUTE = 8;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rate = await checkRateLimit(`store-advice:${ip}`, LIMIT_PER_MINUTE, 60);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests -- please slow down." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  try {
    const advice = await generateBusinessAdvice({
      title: typeof body?.title === "string" ? body.title : null,
      description: typeof body?.description === "string" ? body.description : null,
      siteName: typeof body?.siteName === "string" ? body.siteName : null,
      url,
    });
    return NextResponse.json({ advice });
  } catch (err) {
    console.error("Store advice error:", err);
    return NextResponse.json({ error: "Could not generate advice right now." }, { status: 502 });
  }
}
