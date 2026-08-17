import { NextRequest, NextResponse } from "next/server";
import { CONNECTOR_CONFIGS, type ConnectorId, saveConnectorToken, verifyConnectorState } from "@/lib/connectors";

function resultPage(title: string, message: string) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>body{background:#000;color:#fff;font-family:-apple-system,Roboto,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:24px}
    div{max-width:360px}h1{font-size:20px}p{color:#aaa;font-size:14px}</style>
    </head><body><div><h1>${title}</h1><p>${message}</p></div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

// Hit directly by the provider's OAuth redirect (a browser navigation, no
// bearer token available) -- the signed `state` param from
// mintConnectorState is what identifies which ChatGiZa user this
// authorization belongs to.
export async function GET(req: NextRequest, { params }: { params: Promise<{ service: string }> }) {
  const { service } = await params;
  if (!(service in CONNECTOR_CONFIGS)) {
    return resultPage("Unknown connector", "This connector doesn't exist.");
  }
  const id = service as ConnectorId;
  const cfg = CONNECTOR_CONFIGS[id];

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");
  if (providerError) {
    return resultPage("Connection cancelled", "You can close this tab and return to ChatGiZa.");
  }
  if (!code || !state) {
    return resultPage("Connection failed", "Missing authorization code. Please try again from the app.");
  }

  const decoded = await verifyConnectorState(state);
  if (!decoded || decoded.service !== id) {
    return resultPage("Connection failed", "This link expired or is invalid. Please try again from the app.");
  }

  const clientId = process.env[cfg.clientIdEnv];
  const clientSecret = process.env[cfg.clientSecretEnv];
  if (!clientId || !clientSecret) {
    return resultPage("Connection failed", "This connector isn't fully set up yet.");
  }

  const redirectUri = `${url.origin}/api/connectors/${id}/callback`;
  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      ...(cfg.tokenBodyExtra ?? {}),
    });
    const tokenRes = await fetch(cfg.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });
    if (!tokenRes.ok) {
      console.error(`Connector ${id} token exchange failed:`, tokenRes.status, await tokenRes.text());
      return resultPage("Connection failed", "The provider rejected the connection. Please try again.");
    }
    const data = await tokenRes.json();
    const accessToken = data.access_token as string | undefined;
    if (!accessToken) {
      console.error(`Connector ${id} token response missing access_token:`, data);
      return resultPage("Connection failed", "The provider didn't return an access token.");
    }

    await saveConnectorToken(decoded.userId, id, {
      accessToken,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
      connectedAt: Date.now(),
    });

    return resultPage(`${cfg.name} connected`, "You can close this tab and return to ChatGiZa.");
  } catch (err) {
    console.error(`Connector ${id} callback error:`, err);
    return resultPage("Connection failed", "Something went wrong. Please try again.");
  }
}
