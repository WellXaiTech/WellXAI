import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";

type DeletedIds = Record<string, number>;

// An optional X-Subaccount-Id header namespaces history under a lightweight
// sub-identity (see /api/subaccounts) instead of the signed-in account's own
// history. It's just a suffix on a key already prefixed by the
// server-verified userId, so an arbitrary/unowned value here can only ever
// affect that same user's own data -- no separate ownership check needed.
function subaccountSuffix(req: NextRequest): string {
  const raw = req.headers.get("x-subaccount-id")?.trim();
  return raw ? `:${raw}` : "";
}

function keyFor(userId: string, suffix: string) {
  return `chatgiza:history:${userId}${suffix}`;
}

function deletedIdsKeyFor(userId: string, suffix: string) {
  return `chatgiza:history-deleted:${userId}${suffix}`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const suffix = subaccountSuffix(req);

  try {
    const [conversations, deletedIds] = await Promise.all([
      kv.get(keyFor(userId, suffix)),
      kv.get<DeletedIds>(deletedIdsKeyFor(userId, suffix)),
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
  const suffix = subaccountSuffix(req);

  const body = await req.json().catch(() => null);
  if (!Array.isArray(body?.conversations)) {
    return NextResponse.json({ error: "Invalid conversations payload" }, { status: 400 });
  }
  const deletedIds: DeletedIds =
    body.deletedIds && typeof body.deletedIds === "object" && !Array.isArray(body.deletedIds) ? body.deletedIds : {};

  try {
    await Promise.all([
      kv.set(keyFor(userId, suffix), body.conversations),
      kv.set(deletedIdsKeyFor(userId, suffix), deletedIds),
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("History KV set error", err);
    const message = err instanceof Error ? err.message : "Failed to save history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
