import { NextRequest, NextResponse } from "next/server";
import { tavilySearch } from "@/lib/ai";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const results = await tavilySearch(query);
  return NextResponse.json({ results });
}
