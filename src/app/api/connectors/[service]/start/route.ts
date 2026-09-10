import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { CONNECTOR_CONFIGS, type ConnectorId, isConnectorConfigured, mintConnectorState, generatePkcePair } from "@/lib/connectors";
import { isGithubAppConfigured, getGithubAppConfig } from "@/lib/githubApp";

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

  // Once the GitHub App is set up (see api/admin/github-app), it's the
  // preferred way to connect GitHub -- no popup ever needed again after
  // this one install, unlike the classic OAuth connector below which
  // this app still keeps around as-is, only for the one thing a GitHub
  // App genuinely can't do (create a brand-new repo under a PERSONAL
  // account -- see api/build/github/push/route.ts).
  if (id === "github" && (await isGithubAppConfigured())) {
    const cfg = await getGithubAppConfig();
    const state = await mintConnectorState(user.id, id);
    const installParams = new URLSearchParams({ state });
    return NextResponse.json({ url: `https://github.com/apps/${cfg!.slug}/installations/new?${installParams.toString()}` });
  }

  if (!isConnectorConfigured(id)) {
    return NextResponse.json({ error: "This connector isn't set up yet" }, { status: 400 });
  }

  const cfg = CONNECTOR_CONFIGS[id];
  const clientId = process.env[cfg.clientIdEnv]!;
  const redirectUri = `${new URL(req.url).origin}/api/connectors/${id}/callback`;

  // Vercel requires PKCE -- generate a fresh verifier/challenge pair per
  // authorization attempt and carry the verifier through in the signed
  // state (so the callback can recover it without a KV round trip).
  const pkce = cfg.requiresPkce ? generatePkcePair() : null;
  const state = await mintConnectorState(user.id, id, pkce?.codeVerifier);

  if (cfg.installFlow) {
    // Vercel's Marketplace Integration "External installation flow" --
    // authUrl is already the full start URL; the provider redirects back
    // to whatever Redirect URL is configured on the integration itself
    // (not a per-request redirect_uri), echoing `state` back untouched.
    const installParams = new URLSearchParams({ state });
    return NextResponse.json({ url: `${cfg.authUrl}?${installParams.toString()}` });
  }

  const params_ = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
    ...(cfg.scope ? { scope: cfg.scope } : {}),
    ...(cfg.extraAuthParams ?? {}),
    ...(pkce ? { code_challenge: pkce.codeChallenge, code_challenge_method: "S256" } : {}),
  });

  return NextResponse.json({ url: `${cfg.authUrl}?${params_.toString()}` });
}
