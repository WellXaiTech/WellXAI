import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { checkRateLimit } from "@/lib/rateLimit";
import { performWebSearch } from "@/lib/ai";

// Powers the Build preview's own address bar: a real search whose results
// render inside the preview panel (title + link) instead of leaving
// chatgiza.com, since the destination page itself (Google, or any real
// site) can't be embedded in the preview's iframe -- see performWebSearch's
// own comment in src/lib/ai.ts for why.
const SEARCH_LIMIT_PER_10_MIN = 30;

export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const rate = await checkRateLimit(`build-websearch:${user.id}`, SEARCH_LIMIT_PER_10_MIN, 600);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many searches -- please slow down." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  try {
    const result = await performWebSearch(query);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Build web search error:", err);
    return NextResponse.json({ error: "Search failed -- try again." }, { status: 500 });
  }
}
