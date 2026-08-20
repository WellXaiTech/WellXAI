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

function scheduledKey(userId: string) {
  return `chatgiza:scheduled:${userId}`;
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
    const tasks = await kv.get<ScheduledTask[]>(scheduledKey(userId));
    return NextResponse.json({ tasks: tasks ?? [] });
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

  try {
    await kv.set(scheduledKey(userId), tasks);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Scheduled KV set error", err);
    const message = err instanceof Error ? err.message : "Failed to save scheduled tasks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
