import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { CONNECTOR_CONFIGS, type ConnectorId, disconnectConnector } from "@/lib/connectors";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ service: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { service } = await params;
  if (!(service in CONNECTOR_CONFIGS)) {
    return NextResponse.json({ error: "Unknown connector" }, { status: 404 });
  }

  await disconnectConnector(user.id, service as ConnectorId);
  return NextResponse.json({ ok: true });
}
