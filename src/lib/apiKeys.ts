import { randomBytes, createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { ensureUserExists } from "@/lib/userIndex";
import { getWorkspaceForUser } from "@/lib/workspace";
import { logSecurityEvent } from "@/lib/securityLog";

export type ApiKeyRecord = {
  id: string;
  userId: string;
  label: string;
  // Only the hash is ever stored -- the plaintext key is shown to the user
  // exactly once, at creation time, same as every real API-key product
  // (Stripe, OpenAI, etc.). Losing it means generating a new one.
  keyHash: string;
  keyPrefix: string; // first few chars of the plaintext, for display ("gz_live_abcd...")
  priority: boolean; // workspace/enterprise accounts get a higher /api/v1/chat rate limit
  createdAt: number;
  lastUsedAt: number | null;
  revoked: boolean;
};

type ApiKeyRow = {
  id: string;
  user_id: string;
  label: string;
  key_hash: string;
  key_prefix: string;
  priority: boolean;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

const KEY_PREFIX = "gz_live_";

function fromRow(row: ApiKeyRow): ApiKeyRecord {
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    keyHash: row.key_hash,
    keyPrefix: row.key_prefix,
    priority: row.priority,
    createdAt: new Date(row.created_at).getTime(),
    lastUsedAt: row.last_used_at ? new Date(row.last_used_at).getTime() : null,
    revoked: row.revoked_at !== null,
  };
}

function hashKey(plaintextKey: string): string {
  return createHash("sha256").update(plaintextKey).digest("hex");
}

/** Generates a new API key for [userId], stores only its hash, and returns
 * the plaintext key (caller must show it to the user now -- it can't be
 * retrieved again) plus the stored record. Keys created by a workspace
 * member are marked priority -- see /api/v1/chat's rate limiting. */
export async function createApiKey(userId: string, label: string): Promise<{ plaintextKey: string; record: ApiKeyRecord }> {
  await ensureUserExists(userId, "", "", "");
  const workspace = await getWorkspaceForUser(userId).catch(() => null);
  const priority = workspace !== null;

  const secret = randomBytes(24).toString("base64url");
  const plaintextKey = `${KEY_PREFIX}${secret}`;
  const keyHash = hashKey(plaintextKey);

  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .insert({
      user_id: userId,
      label: label.slice(0, 60) || "API key",
      key_hash: keyHash,
      key_prefix: plaintextKey.slice(0, KEY_PREFIX.length + 6),
      priority,
    })
    .select()
    .single();

  if (error || !data) throw new Error("Failed to create API key");
  await logSecurityEvent(userId, "api_key_created", { workspaceId: workspace?.id, detail: data.label });
  return { plaintextKey, record: fromRow(data as ApiKeyRow) };
}

export async function listApiKeys(userId: string): Promise<ApiKeyRecord[]> {
  const { data } = await supabaseAdmin
    .from("api_keys")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => fromRow(row as ApiKeyRow));
}

export async function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("user_id", userId)
    .select()
    .maybeSingle();
  if (data) {
    const workspace = await getWorkspaceForUser(userId).catch(() => null);
    await logSecurityEvent(userId, "api_key_revoked", { workspaceId: workspace?.id, detail: data.label });
  }
  return data !== null;
}

/** Resolves a plaintext API key (from an incoming request's Authorization
 * header) to the key's owner and priority tier, or null if invalid/revoked.
 * Also bumps lastUsedAt so a user can see whether a key is actually being
 * used from their key list. */
export async function resolveApiKey(plaintextKey: string): Promise<{ id: string; userId: string; priority: boolean } | null> {
  if (!plaintextKey.startsWith(KEY_PREFIX)) return null;
  const hash = hashKey(plaintextKey);

  const { data } = await supabaseAdmin.from("api_keys").select("*").eq("key_hash", hash).maybeSingle();
  if (!data) return null;
  const record = fromRow(data as ApiKeyRow);
  if (record.revoked) return null;

  await supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", record.id);
  return { id: record.id, userId: record.userId, priority: record.priority };
}
