import { randomBytes } from "crypto";
import { encode, decode } from "next-auth/jwt";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { supabaseAdmin } from "@/lib/supabase";

export type SsoConfig = {
  workspaceId: string;
  domain: string;
  issuer: string;
  clientId: string;
  createdAt: number;
};

type SsoConfigRow = {
  workspace_id: string;
  domain: string;
  issuer: string;
  client_id: string;
  client_secret: string;
  created_at: string;
};

const STATE_SALT = "chatgiza-sso-state";
const STATE_MAX_AGE_SECONDS = 10 * 60;
const LOGIN_TOKEN_SALT = "chatgiza-sso-login-token";
const LOGIN_TOKEN_MAX_AGE_SECONDS = 5 * 60;

function baseUrl(): string {
  return process.env.NEXTAUTH_URL || "https://www.chatgiza.com";
}

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

function toPublicConfig(row: SsoConfigRow): SsoConfig {
  return {
    workspaceId: row.workspace_id,
    domain: row.domain,
    issuer: row.issuer,
    clientId: row.client_id,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export async function getSsoConfigForWorkspace(workspaceId: string): Promise<SsoConfig | null> {
  const { data } = await supabaseAdmin.from("workspace_sso").select("*").eq("workspace_id", workspaceId).maybeSingle();
  return data ? toPublicConfig(data as SsoConfigRow) : null;
}

export async function setSsoConfig(
  workspaceId: string,
  requesterId: string,
  config: { domain: string; issuer: string; clientId: string; clientSecret: string }
): Promise<SsoConfig> {
  const { data: ws } = await supabaseAdmin.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
  if (!ws) throw new Error("Workspace not found");
  if (ws.owner_id !== requesterId) throw new Error("Only the workspace owner can configure SSO");

  const domain = config.domain.trim().toLowerCase();
  if (!domain.includes(".")) throw new Error("Enter a valid domain, e.g. acme.com");
  if (!config.issuer.trim() || !config.clientId.trim() || !config.clientSecret.trim()) {
    throw new Error("Issuer, client ID, and client secret are all required");
  }

  // Fail fast at config time, not at someone's next login attempt.
  await discoverOidc(config.issuer.trim()).catch(() => {
    throw new Error("Couldn't reach that issuer's OpenID configuration -- check the issuer URL");
  });

  const { data, error } = await supabaseAdmin
    .from("workspace_sso")
    .upsert(
      {
        workspace_id: workspaceId,
        domain,
        issuer: config.issuer.trim(),
        client_id: config.clientId.trim(),
        client_secret: config.clientSecret.trim(),
      },
      { onConflict: "workspace_id" }
    )
    .select()
    .single();
  if (error || !data) throw new Error("Failed to save SSO configuration");
  return toPublicConfig(data as SsoConfigRow);
}

export async function removeSsoConfig(workspaceId: string, requesterId: string): Promise<void> {
  const { data: ws } = await supabaseAdmin.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
  if (!ws) throw new Error("Workspace not found");
  if (ws.owner_id !== requesterId) throw new Error("Only the workspace owner can remove SSO");
  await supabaseAdmin.from("workspace_sso").delete().eq("workspace_id", workspaceId);
}

type OidcDiscovery = { authorization_endpoint: string; token_endpoint: string; jwks_uri: string; issuer: string };

async function discoverOidc(issuer: string): Promise<OidcDiscovery> {
  const res = await fetch(`${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`);
  if (!res.ok) throw new Error("SSO provider discovery failed");
  return res.json();
}

/** Given the email a user typed on the SSO sign-in screen, finds their
 * workspace's SSO connection by domain and returns the IdP authorization
 * URL to redirect them to -- or null if no workspace has SSO configured
 * for that domain. */
export async function startSso(email: string): Promise<{ redirectUrl: string } | null> {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;

  const { data: config } = await supabaseAdmin
    .from("workspace_sso")
    .select("*")
    .eq("domain", domain)
    .maybeSingle<SsoConfigRow>();
  if (!config) return null;

  const state = await encode({
    token: { workspaceId: config.workspace_id, nonce: randomBytes(12).toString("hex") },
    secret: authSecret(),
    salt: STATE_SALT,
    maxAge: STATE_MAX_AGE_SECONDS,
  });

  const discovery = await discoverOidc(config.issuer);
  const url = new URL(discovery.authorization_endpoint);
  url.searchParams.set("client_id", config.client_id);
  url.searchParams.set("redirect_uri", `${baseUrl()}/api/auth/sso/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  return { redirectUrl: url.toString() };
}

export type SsoIdentity = { email: string; name: string; sub: string; workspaceId: string };

/** Completes the OIDC authorization-code exchange for the IdP's redirect
 * back to /api/auth/sso/callback, verifies the id_token's signature against
 * the issuer's own published keys, and confirms the resulting email is
 * actually on the workspace's configured domain (an IdP could in principle
 * be shared/misconfigured across domains -- this is the check that stops
 * that from granting access to the wrong workspace). */
export async function completeSso(code: string, state: string): Promise<SsoIdentity> {
  const statePayload = await decode<{ workspaceId: string; nonce: string }>({
    token: state,
    secret: authSecret(),
    salt: STATE_SALT,
  });
  if (!statePayload?.workspaceId) throw new Error("This SSO sign-in link is invalid or has expired -- try again");

  const { data: config } = await supabaseAdmin
    .from("workspace_sso")
    .select("*")
    .eq("workspace_id", statePayload.workspaceId)
    .maybeSingle<SsoConfigRow>();
  if (!config) throw new Error("SSO is no longer configured for this workspace");

  const discovery = await discoverOidc(config.issuer);
  const tokenRes = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${baseUrl()}/api/auth/sso/callback`,
      client_id: config.client_id,
      client_secret: config.client_secret,
    }),
  });
  if (!tokenRes.ok) throw new Error("SSO sign-in failed at the identity provider");
  const tokens = await tokenRes.json();
  const idToken = tokens.id_token as string | undefined;
  if (!idToken) throw new Error("SSO provider didn't return an id_token");

  const jwks = createRemoteJWKSet(new URL(discovery.jwks_uri));
  const { payload } = await jwtVerify(idToken, jwks, { issuer: discovery.issuer, audience: config.client_id });

  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
  const emailDomain = email.split("@")[1];
  if (!email || emailDomain !== config.domain) {
    throw new Error("This account's email doesn't match the workspace's configured SSO domain");
  }

  return {
    email,
    name: typeof payload.name === "string" ? payload.name : email,
    sub: `sso:${config.workspace_id}:${payload.sub}`,
    workspaceId: config.workspace_id,
  };
}

/** Bridges the verified OIDC identity into a short-lived token the client
 * hands to NextAuth's "sso" Credentials provider, which trusts it exactly
 * because only our own server (with AUTH_SECRET) could have minted it --
 * this is what lets SSO reuse the same session/jwt-callback machinery
 * (welcome email, user index, device sessions) as every other sign-in
 * method instead of duplicating it. */
export async function mintSsoLoginToken(identity: SsoIdentity): Promise<string> {
  return encode({ token: identity, secret: authSecret(), salt: LOGIN_TOKEN_SALT, maxAge: LOGIN_TOKEN_MAX_AGE_SECONDS });
}

export async function verifySsoLoginToken(token: string): Promise<SsoIdentity | null> {
  try {
    const payload = await decode<SsoIdentity>({ token, secret: authSecret(), salt: LOGIN_TOKEN_SALT });
    return payload?.sub ? payload : null;
  } catch {
    return null;
  }
}
