import { kv } from "@vercel/kv";
import { createPrivateKey } from "crypto";
import { SignJWT, importPKCS8 } from "jose";

// A GitHub App, once a user installs it, needs no further popup ever
// again -- ChatGiZa mints fresh short-lived tokens itself from the app's
// own credentials, server-side, the same way a GitHub App installed
// locally (e.g. via `gh`) never re-prompts you either. This is what
// makes it more reliable than the classic OAuth connector (still used
// as-is in connectors.ts, kept for the one thing a GitHub App genuinely
// can't do: create a brand-new repo under a PERSONAL account -- see
// api/build/github/push/route.ts).
//
// One app definition serves every ChatGiZa user; each user has their own
// separate "installation" of it (on their own account or org), which is
// what actually scopes access to their repos.

export type GithubAppConfig = {
  appId: string;
  slug: string;
  // PEM (PKCS8), as returned by GitHub's manifest-conversion endpoint.
  privateKey: string;
  clientId: string;
  clientSecret: string;
  webhookSecret?: string;
  htmlUrl: string;
  createdAt: number;
};

const CONFIG_KEY = "chatgiza:github-app:config";

export async function saveGithubAppConfig(cfg: GithubAppConfig): Promise<void> {
  await kv.set(CONFIG_KEY, cfg);
}

export async function getGithubAppConfig(): Promise<GithubAppConfig | null> {
  return (await kv.get<GithubAppConfig>(CONFIG_KEY)) ?? null;
}

export async function isGithubAppConfigured(): Promise<boolean> {
  return !!(await getGithubAppConfig());
}

// Signs a short-lived JWT identifying the APP itself (not any one
// installation or user) -- the only credential GitHub accepts for
// minting a real installation access token. Backdated a minute to
// tolerate clock drift between this server and GitHub's; capped at 9
// minutes, under GitHub's hard 10-minute limit for these.
async function signAppJwt(cfg: GithubAppConfig): Promise<string> {
  // GitHub's manifest-conversion endpoint returns the private key in
  // PKCS#1 form ("BEGIN RSA PRIVATE KEY"), but jose's importPKCS8 only
  // parses PKCS#8 ("BEGIN PRIVATE KEY") -- feeding it the raw PKCS#1 PEM
  // directly throws, which is what was surfacing as a bare 500 on the
  // install callback instead of ever reaching a real error message.
  // Node's own createPrivateKey auto-detects the input format, so
  // round-tripping through it first works regardless of which form
  // GitHub (or a future manifest response) actually returns.
  const pkcs8Pem = createPrivateKey(cfg.privateKey).export({ format: "pem", type: "pkcs8" }) as string;
  const key = await importPKCS8(pkcs8Pem, "RS256");
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt(now - 60)
    .setExpirationTime(now + 9 * 60)
    .setIssuer(cfg.appId)
    .sign(key);
}

async function appFetch(cfg: GithubAppConfig, path: string, init?: RequestInit): Promise<Response> {
  const appJwt = await signAppJwt(cfg);
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${appJwt}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });
}

// Installation access tokens are valid for only an hour and aren't
// refreshable -- callers just mint a fresh one per use rather than
// caching one that could expire mid-request.
export async function mintInstallationToken(installationId: string): Promise<string | null> {
  const cfg = await getGithubAppConfig();
  if (!cfg) return null;
  const res = await appFetch(cfg, `/app/installations/${installationId}/access_tokens`, { method: "POST" });
  if (!res.ok) {
    console.error("mintInstallationToken failed:", res.status, await res.text());
    return null;
  }
  const data = await res.json();
  return (data.token as string) ?? null;
}

export type InstallationInfo = {
  installationId: string;
  accountLogin: string;
  accountType: "User" | "Organization";
};

// Looked up right after a user installs, so the account login/type is
// available for every later decision (e.g. "can this installation create
// a new repo?") without an extra API round trip each time.
export async function fetchInstallationInfo(installationId: string): Promise<InstallationInfo | null> {
  const cfg = await getGithubAppConfig();
  if (!cfg) return null;
  const res = await appFetch(cfg, `/app/installations/${installationId}`);
  if (!res.ok) {
    console.error("fetchInstallationInfo failed:", res.status, await res.text());
    return null;
  }
  const data = await res.json();
  const account = data.account as { login: string; type: string } | undefined;
  if (!account) return null;
  return {
    installationId,
    accountLogin: account.login,
    accountType: account.type === "Organization" ? "Organization" : "User",
  };
}

function installationKey(userId: string) {
  return `chatgiza:github-app-installation:${userId}`;
}

function installationOwnerKey(installationId: string) {
  return `chatgiza:github-app-installation-owner:${installationId}`;
}

// A durable reverse index (installation id -> ChatGiZa user id) --
// unlike the per-user record above, this is NEVER deleted by
// disconnectUserInstallation, so it survives a disconnect (or any other
// accidental loss of the per-user record). It's what lets the webhook
// handler (api/admin/github-app/webhook) self-heal a user's connection
// automatically the next time GitHub sends an event for that
// installation, instead of the only way back being a support request
// with the installation id typed in by hand (see the manual
// reconciliation endpoint, api/connectors/[service]/route.ts's POST).
async function saveInstallationOwner(installationId: string, userId: string): Promise<void> {
  await kv.set(installationOwnerKey(installationId), userId);
}

export async function getInstallationOwner(installationId: string): Promise<string | null> {
  return (await kv.get<string>(installationOwnerKey(installationId))) ?? null;
}

export async function saveUserInstallation(userId: string, info: InstallationInfo): Promise<void> {
  await kv.set(installationKey(userId), info);
  await saveInstallationOwner(info.installationId, userId);
}

export async function getUserInstallation(userId: string): Promise<InstallationInfo | null> {
  return (await kv.get<InstallationInfo>(installationKey(userId))) ?? null;
}

export async function disconnectUserInstallation(userId: string): Promise<void> {
  await kv.del(installationKey(userId));
}

// Webhook-driven equivalent of disconnectUserInstallation -- looks up
// the owner via the reverse index (a disconnect from GitHub's own side
// carries no ChatGiZa user id, only the installation id) rather than
// requiring the caller to already know who owns it.
export async function clearInstallationByInstallationId(installationId: string): Promise<void> {
  const userId = await getInstallationOwner(installationId);
  if (!userId) return;
  await kv.del(installationKey(userId));
}
