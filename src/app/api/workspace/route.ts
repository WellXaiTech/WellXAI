import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getWorkspaceForUser, createWorkspace, leaveWorkspace } from "@/lib/workspace";

async function getCaller(req: NextRequest) {
  const session = await auth();
  if (session?.user?.id) {
    return { userId: session.user.id, email: session.user.email ?? "", name: session.user.name ?? "" };
  }
  const userId = await getMobileUserId(req);
  if (!userId) return null;
  return { userId, email: "", name: "" };
}

export async function GET(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const workspace = await getWorkspaceForUser(caller.userId);
    return NextResponse.json({ workspace });
  } catch (err) {
    console.error("Workspace GET error:", err);
    return NextResponse.json({ error: "Failed to load workspace" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });

  try {
    const workspace = await createWorkspace(caller, name);
    return NextResponse.json({ workspace });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to create workspace" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    await leaveWorkspace(caller.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to leave workspace" }, { status: 400 });
  }
}
