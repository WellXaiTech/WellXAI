import { randomBytes, createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { ensureUserExists } from "@/lib/userIndex";

export type ApiKeyRecord = {
  id: string;
  userId: string;
  label: string;
  // Only the hash is ever stored -- the plaintext key is shown to the user
  // exactly once, at creation time, same as every real API-key product
  // (Stripe, OpenAI, etc.). Losing it means generating a new one.
  keyHash: string;
  keyPrefix: string; // first few chars of the plaintext, for display ("gz_live_abcd...")
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
 * retrieved again) plus the stored record. */
export async function createApiKey(userId: string, label: string): Promise<{ plaintextKey: string; record: ApiKeyRecord }> {
  await ensureUserExists(userId, "", "", "");

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
    })
    .select()
    .single();

  if (error || !data) throw new Error("Failed to create API key");
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
  return data !== null;
}

/** Resolves a plaintext API key (from an incoming request's Authorization
 * header) to the userId that owns it, or null if it's invalid/revoked.
 * Also bumps lastUsedAt so a user can see whether a key is actually being
 * used from their key list. */
export async function resolveApiKey(plaintextKey: string): Promise<string | null> {
  if (!plaintextKey.startsWith(KEY_PREFIX)) return null;
  const hash = hashKey(plaintextKey);

  const { data } = await supabaseAdmin.from("api_keys").select("*").eq("key_hash", hash).maybeSingle();
  if (!data) return null;
  const record = fromRow(data as ApiKeyRow);
  if (record.revoked) return null;

  await supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", record.id);
  return record.userId;
}
