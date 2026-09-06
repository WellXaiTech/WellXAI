import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";

type ScheduledTask = {
  id: string;
  title: string;
  prompt: string;
  runAt: string;
  fired: boolean;
  paused: boolean;
  category: string;
  // Real lifecycle: tapping a "Get started" template creates a task marked
  // pending=true immediately (removes it from that list right away); only
  // fully finishing it (e.g. the preference wizard) clears pending and
  // marks fired=true. recurrenceDays > 0 means completing it resets runAt
  // to now + recurrenceDays and fired back to false, so it comes back
  // after that many days instead of staying done forever.
  pending: boolean;
  recurrenceDays: number;
  // Optional attachment captured when the task was created (a photo/PDF
  // page as a base64 data URL, or a plain-text file's contents) -- folded
  // into the prompt the app sends when the task actually fires, same as an
  // attached file works in live chat. At most one of the two is ever set.
  attachmentName: string;
  attachmentText: string;
  attachmentImageDataUrl: string;
};

type DeletedIds = Record<string, number>;

function scheduledKey(userId: string) {
  return `chatgiza:scheduled:${userId}`;
}

function deletedIdsKey(userId: string) {
  return `chatgiza:scheduled-deleted:${userId}`;
}

function mergeDeletedIds(a: DeletedIds, b: DeletedIds): DeletedIds {
  const merged: DeletedIds = { ...a };
  for (const [id, ts] of Object.entries(b)) {
    if (!merged[id] || ts > merged[id]) merged[id] = ts;
  }
  return merged;
}

// Same lost-update hazard as /api/projects and /api/history: two devices
// each PUT their own full task list back independently, so a plain kv.set
// let whichever save landed last silently drop a task the other device had
// just created or updated (e.g. a recurrence just rescheduled by the
// firing device). Unioning by id -- incoming wins a same-id conflict since
// it's the newer write -- keeps additions/edits from either side; deletedIds
// tombstones a removal so it isn't resurrected by a device that hasn't
// caught up yet.
function mergeTasks(current: ScheduledTask[], incoming: ScheduledTask[], deletedIds: DeletedIds): ScheduledTask[] {
  const byId = new Map<string, ScheduledTask>();
  for (const t of current) byId.set(t.id, t);
  for (const t of incoming) byId.set(t.id, t);
  for (const id of Object.keys(deletedIds)) byId.delete(id);
  return Array.from(byId.values());
}

// Syncs the task list itself; firing still happens client-side (whichever
// device has the app open checks runAt against now), matching the existing
// web behavior rather than adding a server-side cron scheduler.
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const [tasks, deletedIds] = await Promise.all([
      kv.get<ScheduledTask[]>(scheduledKey(userId)),
      kv.get<DeletedIds>(deletedIdsKey(userId)),
    ]);
    return NextResponse.json({ tasks: tasks ?? [], deletedIds: deletedIds ?? {} });
  } catch (err) {
    console.error("Scheduled KV get error", err);
    const message = err instanceof Error ? err.message : "Failed to load scheduled tasks";
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
  if (!body || !Array.isArray(body.tasks)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const tasks: ScheduledTask[] = body.tasks
    .filter((t: unknown): t is Record<string, unknown> => !!t && typeof t === "object")
    .map((t: Record<string, unknown>) => ({
      id: typeof t.id === "string" ? t.id : "",
      title: typeof t.title === "string" ? t.title : "",
      prompt: typeof t.prompt === "string" ? t.prompt : "",
      runAt: typeof t.runAt === "string" ? t.runAt : "",
      fired: typeof t.fired === "boolean" ? t.fired : false,
      paused: typeof t.paused === "boolean" ? t.paused : false,
      category: typeof t.category === "string" && t.category ? t.category : "Chat",
      pending: typeof t.pending === "boolean" ? t.pending : false,
      recurrenceDays: typeof t.recurrenceDays === "number" ? t.recurrenceDays : 0,
      attachmentName: typeof t.attachmentName === "string" ? t.attachmentName : "",
      attachmentText: typeof t.attachmentText === "string" ? t.attachmentText : "",
      attachmentImageDataUrl: typeof t.attachmentImageDataUrl === "string" ? t.attachmentImageDataUrl : "",
    }))
    .filter((t: ScheduledTask) => t.id);
  const incomingDeletedIds: DeletedIds =
    body.deletedIds && typeof body.deletedIds === "object" && !Array.isArray(body.deletedIds) ? body.deletedIds : {};

  try {
    const [currentTasks, currentDeletedIds] = await Promise.all([
      kv.get<ScheduledTask[]>(scheduledKey(userId)),
      kv.get<DeletedIds>(deletedIdsKey(userId)),
    ]);
    const mergedDeletedIds = mergeDeletedIds(currentDeletedIds ?? {}, incomingDeletedIds);
    const mergedTasks = mergeTasks(currentTasks ?? [], tasks, mergedDeletedIds);
    await Promise.all([
      kv.set(scheduledKey(userId), mergedTasks),
      kv.set(deletedIdsKey(userId), mergedDeletedIds),
    ]);
    return NextResponse.json({ ok: true, tasks: mergedTasks, deletedIds: mergedDeletedIds });
  } catch (err) {
    console.error("Scheduled KV set error", err);
    const message = err instanceof Error ? err.message : "Failed to save scheduled tasks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
