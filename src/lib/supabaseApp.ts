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

// Sets Edge Function runtime secrets (Deno.env.get(name) inside a
// deployed function) -- a DIFFERENT env layer entirely from the
// project's own .env (that's for the app's own build/frontend; this is
// what a deployed Edge Function can actually read at runtime). This is
// the real mechanism for "hide a third-party API key behind a backend
// call" -- the key goes in here, never into the function's own deployed
// source code or the app's own .env, so the browser never sees it.
export async function setSecrets(token: string, ref: string, secrets: Record<string, string>) {
  return sm<unknown>(token, `/projects/${ref}/secrets`, {
    method: "POST",
    body: JSON.stringify(Object.entries(secrets).map(([name, value]) => ({ name, value }))),
  });
}

export async function runSql(token: string, ref: string, query: string) {
  return sm<unknown>(token, `/projects/${ref}/database/query`, {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

// A real Edge Function deploy, via the Management API's own multipart
// endpoint -- NOT routed through the sm() helper above, since that always
// forces a JSON content-type; a multipart body needs fetch to set its own
// Content-Type (with the real boundary) instead. This is what actually
// lets generated code do things like proxy a third-party API call from a
// public client without shipping that API's own secret key to the
// browser -- something create_supabase_project/run_supabase_sql alone
// (project creation and schema/SQL only) never could.
export async function deployFunction(
  token: string,
  ref: string,
  slug: string,
  files: Record<string, string>,
  entrypointPath: string
): Promise<{ ok: true; data: { id: string; slug: string } } | { ok: false; status: number; body: string }> {
  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify({ entrypoint_path: entrypointPath, name: slug, verify_jwt: true })], {
      type: "application/json",
    })
  );
  for (const [path, content] of Object.entries(files)) {
    form.append("file", new Blob([content], { type: "text/typescript" }), path);
  }
  const res = await fetch(`${MANAGEMENT_API}/projects/${ref}/functions/deploy?slug=${encodeURIComponent(slug)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    body: form,
  });
  if (!res.ok) {
    return { ok: false, status: res.status, body: await res.text() };
  }
  const data = (await res.json()) as { id: string; slug: string };
  return { ok: true, data };
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
