import { kv } from "@vercel/kv";
import { encode, decode } from "next-auth/jwt";
import { randomBytes, createHash } from "crypto";

// Real OAuth connectors -- each entry here is a genuine third-party OAuth
// integration, not a mock. A connector only actually works once its
// clientIdEnv/clientSecretEnv are set in the deployment's environment
// variables; until then the UI shows it as "Setup needed" rather than a
// fake working "Connect" button.
export type ConnectorId =
  | "gmail"
  | "google_calendar"
  | "google_drive"
  | "github"
  | "notion"
  | "box"
  | "stripe"
  | "canva"
  | "wix"
  | "vercel"
  | "supabase";

export type ConnectorConfig = {
  id: ConnectorId;
  name: string;
  category: string;
  authUrl: string;
  tokenUrl: string;
  scope: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  // Extra fixed query params the provider's authorize URL needs beyond
  // the standard client_id/redirect_uri/response_type/scope/state.
  extraAuthParams?: Record<string, string>;
  // Some providers (Stripe Connect) send the token-exchange client secret
  // as a differently-named field than the OAuth2 standard "client_secret".
  tokenBodyExtra?: Record<string, string>;
  // "basic" = client_id/client_secret go in an HTTP Basic Authorization
  // header AND the body is JSON (Notion requires both together; rejects
  // a form-encoded body with a 401 otherwise). "basic-form" = client
  // credentials in the Basic header like "basic", but the body stays
  // standard form-encoded (Supabase: sending it as JSON instead gets a
  // "expected object, received undefined" 400, since their token
  // endpoint only parses application/x-www-form-urlencoded). Defaults to
  // "body" (credentials in the form body, no Basic header) when omitted.
  tokenAuthStyle?: "body" | "basic" | "basic-form";
  // Vercel requires PKCE (code_challenge/code_verifier) on top of the
  // standard authorization-code flow -- every other connector here omits
  // this entirely.
  requiresPkce?: boolean;
  // Vercel's Marketplace Integration product (the one with API Scopes
  // like Deployments) does NOT use a generic /oauth/authorize endpoint
  // with client_id/redirect_uri/response_type/scope query params like
  // every other connector here -- it uses its own "External installation
  // flow": authUrl is already the full start URL
  // (vercel.com/integrations/<slug>/new) and the only query param to add
  // is `state` (the provider echoes back code/teamId/configurationId/
  // state to whatever Redirect URL is configured on the integration
  // itself, not a per-request redirect_uri).
  installFlow?: boolean;
};

// The three Google connectors reuse the SAME OAuth client already used for
// "Sign in with Google" (AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET) -- no new app
// needed, just three additional redirect URIs added to that existing
// client in Google Cloud Console, one per connector's callback URL.
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_EXTRA = { access_type: "offline", prompt: "consent" };

export const CONNECTOR_CONFIGS: Record<ConnectorId, ConnectorConfig> = {
  gmail: {
    id: "gmail",
    name: "Gmail",
    category: "Featured",
    authUrl: GOOGLE_AUTH_URL,
    tokenUrl: GOOGLE_TOKEN_URL,
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    clientIdEnv: "AUTH_GOOGLE_ID",
    clientSecretEnv: "AUTH_GOOGLE_SECRET",
    extraAuthParams: GOOGLE_EXTRA,
  },
  google_calendar: {
    id: "google_calendar",
    name: "Google Calendar",
    category: "Featured",
    authUrl: GOOGLE_AUTH_URL,
    tokenUrl: GOOGLE_TOKEN_URL,
    scope: "https://www.googleapis.com/auth/calendar.readonly",
    clientIdEnv: "AUTH_GOOGLE_ID",
    clientSecretEnv: "AUTH_GOOGLE_SECRET",
    extraAuthParams: GOOGLE_EXTRA,
  },
  google_drive: {
    id: "google_drive",
    name: "Google Drive",
    category: "Featured",
    authUrl: GOOGLE_AUTH_URL,
    tokenUrl: GOOGLE_TOKEN_URL,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    clientIdEnv: "AUTH_GOOGLE_ID",
    clientSecretEnv: "AUTH_GOOGLE_SECRET",
    extraAuthParams: GOOGLE_EXTRA,
  },
  github: {
    id: "github",
    name: "GitHub",
    category: "Featured",
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scope: "repo read:user",
    clientIdEnv: "GITHUB_CONNECTOR_CLIENT_ID",
    clientSecretEnv: "GITHUB_CONNECTOR_CLIENT_SECRET",
  },
  notion: {
    id: "notion",
    name: "Notion",
    category: "Featured",
    authUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    scope: "",
    clientIdEnv: "NOTION_CLIENT_ID",
    clientSecretEnv: "NOTION_CLIENT_SECRET",
    extraAuthParams: { owner: "user" },
    tokenAuthStyle: "basic",
  },
  box: {
    id: "box",
    name: "Box",
    category: "Featured",
    authUrl: "https://account.box.com/api/oauth2/authorize",
    tokenUrl: "https://api.box.com/oauth2/token",
    scope: "",
    clientIdEnv: "BOX_CLIENT_ID",
    clientSecretEnv: "BOX_CLIENT_SECRET",
  },
  stripe: {
    id: "stripe",
    name: "Stripe",
    category: "Featured",
    authUrl: "https://connect.stripe.com/oauth/authorize",
    tokenUrl: "https://connect.stripe.com/oauth/token",
    scope: "read_only",
    clientIdEnv: "STRIPE_CONNECT_CLIENT_ID",
    clientSecretEnv: "STRIPE_SECRET_KEY",
  },
  canva: {
    id: "canva",
    name: "Canva",
    category: "Featured",
    authUrl: "https://www.canva.com/api/oauth/authorize",
    tokenUrl: "https://api.canva.com/rest/v1/oauth/token",
    scope: "design:read design:write",
    clientIdEnv: "CANVA_CLIENT_ID",
    clientSecretEnv: "CANVA_CLIENT_SECRET",
  },
  wix: {
    id: "wix",
    name: "Wix",
    category: "Featured",
    authUrl: "https://www.wix.com/installer/install",
    tokenUrl: "https://www.wixapis.com/oauth/access",
    scope: "",
    clientIdEnv: "WIX_CLIENT_ID",
    clientSecretEnv: "WIX_CLIENT_SECRET",
  },
  vercel: {
    id: "vercel",
    name: "Vercel",
    category: "Build",
    // "chatgiza" is this integration's URL Slug from the Integrations
    // Console -- the External installation flow's start URL.
    authUrl: "https://vercel.com/integrations/chatgiza/new",
    tokenUrl: "https://api.vercel.com/v2/oauth/access_token",
    scope: "",
    clientIdEnv: "VERCEL_CONNECTOR_CLIENT_ID",
    clientSecretEnv: "VERCEL_CONNECTOR_CLIENT_SECRET",
    installFlow: true,
  },
  supabase: {
    id: "supabase",
    name: "Supabase",
    category: "Build",
    authUrl: "https://api.supabase.com/v1/oauth/authorize",
    tokenUrl: "https://api.supabase.com/v1/oauth/token",
    scope: "all",
    clientIdEnv: "SUPABASE_CONNECTOR_CLIENT_ID",
    clientSecretEnv: "SUPABASE_CONNECTOR_CLIENT_SECRET",
    tokenAuthStyle: "basic-form",
  },
};

export function isConnectorConfigured(id: ConnectorId): boolean {
  const cfg = CONNECTOR_CONFIGS[id];
  return !!process.env[cfg.clientIdEnv] && !!process.env[cfg.clientSecretEnv];
}

export type StoredConnectorToken = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  connectedAt: number;
};

function tokenKey(userId: string, service: ConnectorId) {
  return `chatgiza:connector-token:${userId}:${service}`;
}

export async function saveConnectorToken(userId: string, service: ConnectorId, token: StoredConnectorToken): Promise<void> {
  await kv.set(tokenKey(userId, service), token);
}

export async function getConnectorToken(userId: string, service: ConnectorId): Promise<StoredConnectorToken | null> {
  return (await kv.get<StoredConnectorToken>(tokenKey(userId, service))) ?? null;
}

export async function disconnectConnector(userId: string, service: ConnectorId): Promise<void> {
  await kv.del(tokenKey(userId, service));
}

export async function listConnectedServices(userId: string): Promise<ConnectorId[]> {
  const ids = Object.keys(CONNECTOR_CONFIGS) as ConnectorId[];
  const results = await Promise.all(ids.map(async (id) => ((await getConnectorToken(userId, id)) ? id : null)));
  return results.filter((v): v is ConnectorId => v !== null);
}

// Shared token-endpoint request builder -- used by both the OAuth callback
// (authorization_code exchange) and refreshConnectorToken (refresh_token
// exchange) below, so the per-provider quirks (Notion/Supabase's Basic-auth
// + JSON body vs everyone else's form-encoded body) only live in one place.
export async function requestToken(
  cfg: ConnectorConfig,
  clientId: string,
  clientSecret: string,
  bodyFields: Record<string, string>
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; status: number; body: string }> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let requestBody: string;
  if (cfg.tokenAuthStyle === "basic") {
    headers["Content-Type"] = "application/json";
    headers["Authorization"] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
    requestBody = JSON.stringify({ ...bodyFields, ...(cfg.tokenBodyExtra ?? {}) });
  } else if (cfg.tokenAuthStyle === "basic-form") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    headers["Authorization"] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
    requestBody = new URLSearchParams({ ...bodyFields, ...(cfg.tokenBodyExtra ?? {}) }).toString();
  } else {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    requestBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      ...bodyFields,
      ...(cfg.tokenBodyExtra ?? {}),
    }).toString();
  }
  const res = await fetch(cfg.tokenUrl, { method: "POST", headers, body: requestBody });
  if (!res.ok) {
    return { ok: false, status: res.status, body: await res.text() };
  }
  const data = await res.json();
  if (data.error) {
    return { ok: false, status: 200, body: JSON.stringify(data) };
  }
  return { ok: true, data };
}

// Exchanges a stored refresh token for a fresh access token and re-saves
// it. Not every connector's OAuth app issues refresh tokens (most of the
// ones set up so far don't request offline access), so this quietly
// no-ops when there's nothing to refresh with -- callers should fall back
// to treating the existing token as-is (it'll just fail downstream with a
// clear provider error if it really has expired).
export async function refreshConnectorToken(userId: string, service: ConnectorId): Promise<StoredConnectorToken | null> {
  const cfg = CONNECTOR_CONFIGS[service];
  const existing = await getConnectorToken(userId, service);
  if (!existing?.refreshToken) return existing;

  const clientId = process.env[cfg.clientIdEnv];
  const clientSecret = process.env[cfg.clientSecretEnv];
  if (!clientId || !clientSecret) return existing;

  const result = await requestToken(cfg, clientId, clientSecret, {
    grant_type: "refresh_token",
    refresh_token: existing.refreshToken,
  });
  if (!result.ok) {
    console.error(`Connector ${service} token refresh failed:`, result.status, result.body);
    return existing;
  }

  const accessToken = result.data.access_token as string | undefined;
  if (!accessToken) return existing;

  const refreshed: StoredConnectorToken = {
    accessToken,
    refreshToken: (result.data.refresh_token as string | undefined) ?? existing.refreshToken,
    expiresAt: result.data.expires_in ? Date.now() + (result.data.expires_in as number) * 1000 : undefined,
    connectedAt: existing.connectedAt,
  };
  await saveConnectorToken(userId, service, refreshed);
  return refreshed;
}

// Returns a token guaranteed not to be past its known expiry, refreshing
// first if it's expired (or about to, within a 1-minute buffer) and a
// refresh token is available. This is the function every API route that
// actually calls a provider's API on the user's behalf should use --
// getConnectorToken alone is only safe for "is this connected?" checks.
const EXPIRY_BUFFER_MS = 60 * 1000;

export async function getFreshConnectorToken(userId: string, service: ConnectorId): Promise<StoredConnectorToken | null> {
  const token = await getConnectorToken(userId, service);
  if (!token) return null;
  if (!token.expiresAt || token.expiresAt - EXPIRY_BUFFER_MS > Date.now()) return token;
  return refreshConnectorToken(userId, service);
}

// PKCE (RFC 7636) helper for connectors that require it (Vercel). The
// code_verifier is embedded in the signed connector-state JWT below so no
// extra KV round trip is needed to recover it in the callback.
export function generatePkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge };
}

// Short-lived, single-use OAuth "state" -- carries which user and which
// service this authorization is for through the redirect to the
// provider and back, without ever putting the user's real bearer token
// in a URL. Signed with next-auth/jwt's own encode/decode (same
// mechanism as the mobile bearer token in mobileAuth.ts) so it can't be
// forged, with its own salt so it never collides with either of those.
const STATE_SALT = "chatgiza-connector-state";
const STATE_MAX_AGE_SECONDS = 10 * 60;

export type ConnectorState = { userId: string; service: ConnectorId; codeVerifier?: string };

export async function mintConnectorState(userId: string, service: ConnectorId, codeVerifier?: string): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return encode({ token: { userId, service, codeVerifier }, secret, salt: STATE_SALT, maxAge: STATE_MAX_AGE_SECONDS });
}

export async function verifyConnectorState(state: string): Promise<ConnectorState | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  try {
    const payload = await decode<ConnectorState>({ token: state, secret, salt: STATE_SALT });
    if (!payload?.userId || !payload?.service) return null;
    return { userId: payload.userId, service: payload.service, codeVerifier: payload.codeVerifier };
  } catch {
    return null;
  }
}
