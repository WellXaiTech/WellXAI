import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";

type TwinData = {
  summary: string;
  updatedAt: number;
};

function twinKey(userId: string) {
  return `chatgiza:twin:${userId}`;
}

// Idea #9: the user's Digital Twin -- a single synthesized narrative
// profile (see synthesizeDigitalTwin in src/lib/ai.ts), stored and edited
// like the rest of profile/memory. This route is just plain load/save;
// generating a fresh draft from chat history is /api/twin/synthesize,
// kept separate the same way /api/memory/extract is separate from saving
// to /api/profile -- a draft only becomes real once the user confirms it.
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const data = await kv.get<TwinData>(twinKey(userId));
    return NextResponse.json(data ?? { summary: "", updatedAt: 0 });
  } catch (err) {
    console.error("Twin KV get error", err);
    const message = err instanceof Error ? err.message : "Failed to load digital twin";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const summary = typeof body?.summary === "string" ? body.summary.trim().slice(0, 2000) : "";

  const data: TwinData = { summary, updatedAt: Date.now() };

  try {
    await kv.set(twinKey(userId), data);
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    console.error("Twin KV set error", err);
    const message = err instanceof Error ? err.message : "Failed to save digital twin";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
