import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { reviewWriting } from "@/lib/ai";

const MAX_TEXT_LENGTH = 20_000;

// Not tied to a specific ebook/page -- the client sends the current page's
// plain text (editor.getText()) straight from the live document, so this
// stays a stateless AI call rather than another DB read.
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.slice(0, MAX_TEXT_LENGTH) : "";
  if (!text.trim()) {
    return NextResponse.json({ error: "Nothing to review yet" }, { status: 400 });
  }

  try {
    const review = await reviewWriting(text);
    return NextResponse.json(review);
  } catch (err) {
    console.error("Ebook review error:", err);
    const message = err instanceof Error ? err.message : "Failed to review this page";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
