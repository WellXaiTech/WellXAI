import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getWorkspaceForUser, removeMember } from "@/lib/workspace";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  const requesterId = session?.user?.id ?? (await getMobileUserId(req));
  if (!requesterId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { userId: targetUserId } = await params;

  try {
    const workspace = await getWorkspaceForUser(requesterId);
    if (!workspace) return NextResponse.json({ error: "You're not in a workspace" }, { status: 400 });

    const updated = await removeMember(workspace.id, requesterId, targetUserId);
    return NextResponse.json({ workspace: updated });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to remove member" }, { status: 400 });
  }
}
