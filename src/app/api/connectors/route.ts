import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { CONNECTOR_CONFIGS, isConnectorConfigured, listConnectedServices } from "@/lib/connectors";
import { isGithubAppConfigured, getUserInstallation } from "@/lib/githubApp";

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const [connected, githubAppReady, githubInstallation] = await Promise.all([
    listConnectedServices(user.id),
    isGithubAppConfigured(),
    getUserInstallation(user.id),
  ]);

  const connectors = Object.values(CONNECTOR_CONFIGS).map((cfg) => ({
    id: cfg.id,
    name: cfg.name,
    category: cfg.category,
    // GitHub is also "configured"/"connected" via the App path (see
    // githubApp.ts), on top of the classic OAuth connector below --
    // either one is enough.
    configured: isConnectorConfigured(cfg.id) || (cfg.id === "github" && githubAppReady),
    connected: connected.includes(cfg.id) || (cfg.id === "github" && !!githubInstallation),
  }));

  return NextResponse.json({ connectors });
}
