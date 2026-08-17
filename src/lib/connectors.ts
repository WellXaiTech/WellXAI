import { kv } from "@vercel/kv";
import { encode, decode } from "next-auth/jwt";

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
  | "wix";

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
  // header instead of the request body (Notion requires this; rejects
  // the standard body-based form with a 401 otherwise). Defaults to
  // "body" when omitted.
  tokenAuthStyle?: "body" | "basic";
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

// Short-lived, single-use OAuth "state" -- carries which user and which
// service this authorization is for through the redirect to the
// provider and back, without ever putting the user's real bearer token
// in a URL. Signed with next-auth/jwt's own encode/decode (same
// mechanism as the mobile bearer token in mobileAuth.ts) so it can't be
// forged, with its own salt so it never collides with either of those.
const STATE_SALT = "chatgiza-connector-state";
const STATE_MAX_AGE_SECONDS = 10 * 60;

export type ConnectorState = { userId: string; service: ConnectorId };

export async function mintConnectorState(userId: string, service: ConnectorId): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return encode({ token: { userId, service }, secret, salt: STATE_SALT, maxAge: STATE_MAX_AGE_SECONDS });
}

export async function verifyConnectorState(state: string): Promise<ConnectorState | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  try {
    const payload = await decode<ConnectorState>({ token: state, secret, salt: STATE_SALT });
    if (!payload?.userId || !payload?.service) return null;
    return { userId: payload.userId, service: payload.service };
  } catch {
    return null;
  }
}
