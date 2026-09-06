import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";

type DeletedIds = Record<string, number>;
// Structural subset of the client's Conversation type (see
// ChatGizaShell.tsx) -- the server only ever needs `id` and enough of
// `messages` to break a same-id conflict the same way the client's own
// merge does; every other field (title, pinned, shareId, ...) rides along
// untouched on whichever side wins.
type ConversationLike = { id: string; messages?: Array<{ createdAt?: number }>; [key: string]: unknown };

function lastActivity(c: ConversationLike): number {
  let max = 0;
  for (const m of c.messages ?? []) {
    if (typeof m.createdAt === "number" && m.createdAt > max) max = m.createdAt;
  }
  return max;
}

function mergeDeletedIds(a: DeletedIds, b: DeletedIds): DeletedIds {
  const merged: DeletedIds = { ...a };
  for (const [id, ts] of Object.entries(b)) {
    if (!merged[id] || ts > merged[id]) merged[id] = ts;
  }
  return merged;
}

// Mirrors ChatGizaShell.tsx's client-side mergeConversations exactly --
// union by id, newest-lastActivity wins a same-id conflict (more messages
// as the tiebreak), tombstoned ids dropped. Running the same merge
// server-side (not just client-side on the next GET) is what actually
// closes the race: two devices saving near-simultaneously used to blindly
// overwrite each other's whole list here (PUT was a plain kv.set of
// whatever that one device's payload was), so whichever save landed last
// silently erased anything the other device had just added.
function mergeConversations(a: ConversationLike[], b: ConversationLike[], deletedIds: DeletedIds): ConversationLike[] {
  const byId = new Map<string, ConversationLike>();
  for (const c of [...a, ...b]) {
    if (!c || typeof c.id !== "string" || deletedIds[c.id]) continue;
    const existing = byId.get(c.id);
    if (!existing) {
      byId.set(c.id, c);
      continue;
    }
    const cActivity = lastActivity(c);
    const existingActivity = lastActivity(existing);
    const cLen = c.messages?.length ?? 0;
    const existingLen = existing.messages?.length ?? 0;
    // >= , not > , on the length tiebreak -- see the client-side copy of
    // this function (ChatGizaShell.tsx) for why: `b` (the incoming PUT
    // body) is always the more-current side here, and an exact tie should
    // let it win instead of silently keeping whatever's already stored.
    if (cActivity > existingActivity || (cActivity === existingActivity && cLen >= existingLen)) {
      byId.set(c.id, c);
    }
  }
  return Array.from(byId.values());
}

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
    const [currentConversations, currentDeletedIds] = await Promise.all([
      kv.get<ConversationLike[]>(keyFor(userId, suffix)),
      kv.get<DeletedIds>(deletedIdsKeyFor(userId, suffix)),
    ]);
    const mergedDeletedIds = mergeDeletedIds(currentDeletedIds ?? {}, deletedIds);
    const mergedConversations = mergeConversations(currentConversations ?? [], body.conversations, mergedDeletedIds);
    await Promise.all([
      kv.set(keyFor(userId, suffix), mergedConversations),
      kv.set(deletedIdsKeyFor(userId, suffix), mergedDeletedIds),
    ]);
    return NextResponse.json({ ok: true, conversations: mergedConversations, deletedIds: mergedDeletedIds });
  } catch (err) {
    console.error("History KV set error", err);
    const message = err instanceof Error ? err.message : "Failed to save history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
