import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";

type DeletedIds = Record<string, number>;

function keyFor(userId: string) {
  return `chatgiza:history:${userId}`;
}

function deletedIdsKeyFor(userId: string) {
  return `chatgiza:history-deleted:${userId}`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const [conversations, deletedIds] = await Promise.all([
      kv.get(keyFor(userId)),
      kv.get<DeletedIds>(deletedIdsKeyFor(userId)),
    ]);
    return NextResponse.json({ conversations: conversations ?? [], deletedIds: deletedIds ?? {} });
  } catch (err) {
    console.error("History KV get error", err);
    const message = err instanceof Error ? err.message : "Failed to load history";
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
  if (!Array.isArray(body?.conversations)) {
    return NextResponse.json({ error: "Invalid conversations payload" }, { status: 400 });
  }
  const deletedIds: DeletedIds =
    body.deletedIds && typeof body.deletedIds === "object" && !Array.isArray(body.deletedIds) ? body.deletedIds : {};

  try {
    await Promise.all([
      kv.set(keyFor(userId), body.conversations),
      kv.set(deletedIdsKeyFor(userId), deletedIds),
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("History KV set error", err);
    const message = err instanceof Error ? err.message : "Failed to save history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
