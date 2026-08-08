import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getWorkspaceForUser } from "@/lib/workspace";
import { listWorkspaceSecurityEvents } from "@/lib/securityLog";

export async function GET(req: NextRequest) {
  const session = await auth();
  const callerId = session?.user?.id ?? (await getMobileUserId(req));
  if (!callerId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const workspace = await getWorkspaceForUser(callerId);
  if (!workspace) return NextResponse.json({ error: "You're not in a workspace" }, { status: 400 });
  if (workspace.ownerId !== callerId) {
    return NextResponse.json({ error: "Only the workspace owner can view the security log" }, { status: 403 });
  }

  try {
    const events = await listWorkspaceSecurityEvents(workspace.id);
    return NextResponse.json({ events });
  } catch (err) {
    console.error("Security log GET error:", err);
    return NextResponse.json({ error: "Failed to load security log" }, { status: 500 });
  }
}
