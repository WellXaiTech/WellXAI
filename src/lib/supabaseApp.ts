import { kv } from "@vercel/kv";
import { randomBytes } from "crypto";

// Thin wrapper around Supabase's Management API (api.supabase.com/v1) --
// the OAuth token itself comes from the pre-existing generic "supabase"
// connector in connectors.ts (never wired to anything until now). Mirrors
// the shape of githubApp.ts: small typed helpers here, the actual
// tool-confirmation/UI wiring lives in useBuildAgent.ts.

const MANAGEMENT_API = "https://api.supabase.com/v1";

async function sm<T>(token: string, path: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; status: number; body: string }> {
  const res = await fetch(`${MANAGEMENT_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    return { ok: false, status: res.status, body: await res.text() };
  }
  const data = (await res.json()) as T;
  return { ok: true, data };
}

export type SupabaseOrganization = { id: string; name: string };

export async function listOrganizations(token: string) {
  return sm<SupabaseOrganization[]>(token, "/organizations");
}

// A hardcoded, generally-available region -- picking one automatically
// (rather than asking) matches how push_to_github/deploy_to_vercel never
// ask the user to choose an AWS region either. "plan" is deliberately
// never a parameter the agent can set: always "free", so an autonomous
// tool call can never put a real charge on the user's account on its own.
const DEFAULT_REGION = "us-east-1";
const PLAN = "free";

export type SupabaseProject = {
  id: string;
  name: string;
  organization_id: string;
  region: string;
  status: string;
};

export async function createProject(token: string, name: string, organizationId: string, dbPass: string) {
  return sm<SupabaseProject>(token, "/projects", {
    method: "POST",
    body: JSON.stringify({
      name,
      organization_id: organizationId,
      region: DEFAULT_REGION,
      plan: PLAN,
      db_pass: dbPass,
    }),
  });
}

export async function getProject(token: string, ref: string) {
  return sm<SupabaseProject>(token, `/projects/${ref}`);
}

export type SupabaseApiKey = { name: string; api_key: string };

export async function getProjectApiKeys(token: string, ref: string) {
  return sm<SupabaseApiKey[]>(token, `/projects/${ref}/api-keys?reveal=true`);
}

export async function runSql(token: string, ref: string, query: string) {
  return sm<unknown>(token, `/projects/${ref}/database/query`, {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

export function generateDbPassword(): string {
  // base64url is already URL-safe (A-Z a-z 0-9 - _), so it can go straight
  // into a postgres connection string with no extra escaping.
  return randomBytes(24).toString("base64url");
}

export function projectDatabaseUrl(ref: string, region: string, dbPass: string): string {
  return `postgresql://postgres.${ref}:${dbPass}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
}

// Per-project-ref ownership record (same pattern as the Vercel deploy
// owner key in api/build/vercel/deploy/route.ts) -- lets the status/sql
// routes verify the calling user actually owns a given project ref
// without needing a broader "which Supabase project is this user's
// current one" concept (a BuildProject can have its own
// supabaseProjectRef independent of any other project's).
function projectOwnerKey(ref: string) {
  return `chatgiza:build-supabase-project-owner:${ref}`;
}
function projectDbPassKey(ref: string) {
  return `chatgiza:build-supabase-project-dbpass:${ref}`;
}
function projectRegionKey(ref: string) {
  return `chatgiza:build-supabase-project-region:${ref}`;
}

export async function saveSupabaseProjectRecord(ref: string, userId: string, dbPass: string, region: string) {
  await Promise.all([
    kv.set(projectOwnerKey(ref), userId),
    kv.set(projectDbPassKey(ref), dbPass),
    kv.set(projectRegionKey(ref), region),
  ]);
}

export async function getSupabaseProjectOwner(ref: string): Promise<string | null> {
  return (await kv.get<string>(projectOwnerKey(ref))) ?? null;
}

export async function getSupabaseProjectDbInfo(ref: string): Promise<{ dbPass: string; region: string } | null> {
  const [dbPass, region] = await Promise.all([
    kv.get<string>(projectDbPassKey(ref)),
    kv.get<string>(projectRegionKey(ref)),
  ]);
  if (!dbPass || !region) return null;
  return { dbPass, region };
}
