import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { CONNECTOR_CONFIGS, type ConnectorId, disconnectConnector } from "@/lib/connectors";
import { disconnectUserInstallation } from "@/lib/githubApp";

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
