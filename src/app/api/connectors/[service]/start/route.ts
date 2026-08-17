import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { CONNECTOR_CONFIGS, type ConnectorId, isConnectorConfigured, mintConnectorState } from "@/lib/connectors";

// Mints a one-time, 10-minute "state" token (see connectors.ts) and hands
// back the provider's authorize URL for the app to open in an external
// browser tab -- this is how the native app kicks off a real OAuth flow
// without ever putting its bearer token in a URL.
export async function POST(req: NextRequest, { params }: { params: Promise<{ service: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { service } = await params;
  if (!(service in CONNECTOR_CONFIGS)) {
    return NextResponse.json({ error: "Unknown connector" }, { status: 404 });
  }
  const id = service as ConnectorId;
  if (!isConnectorConfigured(id)) {
    return NextResponse.json({ error: "This connector isn't set up yet" }, { status: 400 });
  }

  const cfg = CONNECTOR_CONFIGS[id];
  const clientId = process.env[cfg.clientIdEnv]!;
  const state = await mintConnectorState(user.id, id);
  const redirectUri = `${new URL(req.url).origin}/api/connectors/${id}/callback`;

  const params_ = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
    ...(cfg.scope ? { scope: cfg.scope } : {}),
    ...(cfg.extraAuthParams ?? {}),
  });

  return NextResponse.json({ url: `${cfg.authUrl}?${params_.toString()}` });
}
