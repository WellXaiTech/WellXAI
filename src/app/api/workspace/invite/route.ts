import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getWorkspaceForUser, createInvite } from "@/lib/workspace";
import { sendMailBestEffort } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  try {
    const workspace = await getWorkspaceForUser(userId);
    if (!workspace) return NextResponse.json({ error: "You're not in a workspace" }, { status: 400 });
    if (workspace.ownerId !== userId) {
      return NextResponse.json({ error: "Only the workspace owner can invite members" }, { status: 403 });
    }

    const invite = await createInvite(workspace.id, userId, email);
    const joinUrl = `${process.env.NEXTAUTH_URL || "https://www.chatgiza.com"}/workspace/join?token=${invite.token}`;

    await sendMailBestEffort(
      email,
      `You've been invited to join "${workspace.name}" on ChatGiZa`,
      `<p>You've been invited to join <strong>${workspace.name}</strong> on ChatGiZa.</p><p><a href="${joinUrl}">Click here to join</a></p>`
    );

    return NextResponse.json({ joinUrl });
  } catch (err) {
    console.error("Workspace invite error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to send invite" }, { status: 400 });
  }
}
