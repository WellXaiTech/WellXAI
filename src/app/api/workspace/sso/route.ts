import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getWorkspaceForUser } from "@/lib/workspace";
import { getSsoConfigForWorkspace, setSsoConfig, removeSsoConfig } from "@/lib/sso";

async function getCallerId(req: NextRequest): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? (await getMobileUserId(req));
}

export async function GET(req: NextRequest) {
  const callerId = await getCallerId(req);
  if (!callerId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const workspace = await getWorkspaceForUser(callerId);
  if (!workspace) return NextResponse.json({ error: "You're not in a workspace" }, { status: 400 });

  const config = await getSsoConfigForWorkspace(workspace.id);
  return NextResponse.json({ config });
}

export async function POST(req: NextRequest) {
  const callerId = await getCallerId(req);
  if (!callerId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const workspace = await getWorkspaceForUser(callerId);
  if (!workspace) return NextResponse.json({ error: "You're not in a workspace" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const domain = typeof body?.domain === "string" ? body.domain : "";
  const issuer = typeof body?.issuer === "string" ? body.issuer : "";
  const clientId = typeof body?.clientId === "string" ? body.clientId : "";
  const clientSecret = typeof body?.clientSecret === "string" ? body.clientSecret : "";

  try {
    const config = await setSsoConfig(workspace.id, callerId, { domain, issuer, clientId, clientSecret });
    return NextResponse.json({ config });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to save SSO configuration" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const callerId = await getCallerId(req);
  if (!callerId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const workspace = await getWorkspaceForUser(callerId);
  if (!workspace) return NextResponse.json({ error: "You're not in a workspace" }, { status: 400 });

  try {
    await removeSsoConfig(workspace.id, callerId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to remove SSO configuration" }, { status: 400 });
  }
}
