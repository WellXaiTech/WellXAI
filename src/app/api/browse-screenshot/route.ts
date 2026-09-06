import { NextRequest, NextResponse } from "next/server";

// Renders a real screenshot of any URL via Browserless's hosted headless
// Chrome, server-side. Unlike an <iframe src={url}>, this never asks the
// target site's own browser to embed it -- Browserless visits the page in
// its own Chrome instance and hands back a picture, so X-Frame-Options/CSP
// (which only block being framed, not being screenshotted) never apply.
// Not interactive -- a static snapshot, not a live embedded browser.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "Missing or invalid url" }, { status: 400 });
  }

  const token = process.env.BROWSERLESS_API_KEY;
  if (!token) {
    return NextResponse.json({ error: "Browserless not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(`https://production-sfo.browserless.io/screenshot?token=${token}&stealth=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        options: { type: "png", fullPage: false },
        viewport: { width: 1280, height: 800 },
        gotoOptions: { waitUntil: "networkidle2", timeout: 20000 },
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Browserless screenshot failed:", res.status, text.slice(0, 500));
      return NextResponse.json({ error: "Failed to render page" }, { status: 502 });
    }

    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("Browserless screenshot error:", err);
    return NextResponse.json({ error: "Failed to render page" }, { status: 502 });
  }
}
