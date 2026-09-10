import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { CONNECTOR_CONFIGS, type ConnectorId, disconnectConnector } from "@/lib/connectors";
import { disconnectUserInstallation, fetchInstallationInfo, saveUserInstallation } from "@/lib/githubApp";

// Manual reconciliation for GitHub App installs that never came back
// through the normal setup_url callback -- the one GitHub-specific case
// this can happen: an account that already has ChatGiZa installed shows
// "Configure" (not "Install") in the app's own account picker, which
// takes the user straight to GitHub's own management page for that
// installation instead of back through any redirect/state ChatGiZa
// controls. If this user's own record of that installation was lost
// (e.g. a disconnect that cleared it, GitHub's callback never firing,
// etc.) there is otherwise no way back in short of literally
// uninstalling and reinstalling the app. The installation id is right
// there in that GitHub settings page's own URL
// (.../settings/installations/{id}), so this just re-associates it.
export async function POST(req: NextRequest, { params }: { params: Promise<{ service: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { service } = await params;
  if (service !== "github") {
    return NextResponse.json({ error: "Reconnecting by installation id is only supported for GitHub" }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  const installationId = body?.installationId ? String(body.installationId) : undefined;
  if (!installationId) {
    return NextResponse.json({ error: "installationId is required" }, { status: 400 });
  }
  const info = await fetchInstallationInfo(installationId);
  if (!info) {
    return NextResponse.json(
      { error: "Could not look up that installation. Check the id (from the GitHub settings page's own URL) and that the GitHub App is configured." },
      { status: 400 }
    );
  }
  await saveUserInstallation(user.id, info);
  return NextResponse.json({ ok: true, info });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ service: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { service } = await params;
  if (!(service in CONNECTOR_CONFIGS)) {
    return NextResponse.json({ error: "Unknown connector" }, { status: 404 });
  }

  const id = service as ConnectorId;
  await disconnectConnector(user.id, id);
  // This clears ChatGiZa's own record of the installation, not the
  // install on GitHub's side -- GitHub only lets the installation owner
  // remove it from github.com/settings/installations. Uninstalling it
  // there before disconnecting here still works fine, just means
  // mintInstallationToken would start failing on a now-nonexistent
  // installation id rather than this ever surfacing that distinction.
  if (id === "github") await disconnectUserInstallation(user.id);
  return NextResponse.json({ ok: true });
}
