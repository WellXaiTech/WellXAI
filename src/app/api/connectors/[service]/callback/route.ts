import { NextRequest, NextResponse } from "next/server";
import { CONNECTOR_CONFIGS, type ConnectorId, getConnectorToken, saveConnectorToken, verifyConnectorState, requestToken } from "@/lib/connectors";

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
    const result = await requestToken(cfg, clientId, clientSecret, {
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      // Vercel-only: the PKCE verifier generated at /start time, carried
      // through in the signed state. Harmless no-op field for providers
      // that don't require PKCE.
      ...(decoded.codeVerifier ? { code_verifier: decoded.codeVerifier } : {}),
    });

    if (!result.ok) {
      console.error(`Connector ${id} token exchange failed:`, result.status, result.body);
      // Authorization codes are single-use -- some browsers fire the
      // redirect to this callback twice in quick succession (a retried
      // page load, a duplicate tab), and the second one always fails
      // this way since the first already redeemed the code. If a token
      // already exists for this user, that first request succeeded, so
      // this isn't really a failure from the user's point of view. This
      // also covers GitHub's quirk of returning HTTP 200 with the error
      // in the JSON body (bad_verification_code/incorrect_client_credentials)
      // -- requestToken() normalizes that into the same !ok shape.
      if (result.body.includes("invalid_grant") || result.body.includes("bad_verification_code") || result.body.includes("incorrect_client_credentials")) {
        const existing = await getConnectorToken(decoded.userId, id);
        if (existing) {
          return resultPage(`${cfg.name} connected`, "You can close this tab and return to ChatGiZa.");
        }
      }
      return resultPage("Connection failed", "The provider rejected the connection. Please try again.");
    }

    const accessToken = result.data.access_token as string | undefined;
    if (!accessToken) {
      console.error(`Connector ${id} token response missing access_token:`, result.data);
      return resultPage("Connection failed", "The provider didn't return an access token.");
    }

    await saveConnectorToken(decoded.userId, id, {
      accessToken,
      refreshToken: result.data.refresh_token as string | undefined,
      expiresAt: result.data.expires_in ? Date.now() + (result.data.expires_in as number) * 1000 : undefined,
      connectedAt: Date.now(),
    });

    return resultPage(`${cfg.name} connected`, "You can close this tab and return to ChatGiZa.");
  } catch (err) {
    console.error(`Connector ${id} callback error:`, err);
    return resultPage("Connection failed", "Something went wrong. Please try again.");
  }
}
