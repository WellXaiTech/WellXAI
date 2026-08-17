import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { CONNECTOR_CONFIGS, isConnectorConfigured, listConnectedServices } from "@/lib/connectors";

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const connected = await listConnectedServices(user.id);
  const connectors = Object.values(CONNECTOR_CONFIGS).map((cfg) => ({
    id: cfg.id,
    name: cfg.name,
    category: cfg.category,
    configured: isConnectorConfigured(cfg.id),
    connected: connected.includes(cfg.id),
  }));

  return NextResponse.json({ connectors });
}
