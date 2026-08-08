import { kv } from "@vercel/kv";
import { randomBytes, createHash } from "crypto";

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

const KEY_PREFIX = "gz_live_";

function userKeysIndexKey(userId: string) {
  return `chatgiza:api-keys:${userId}`;
}

function keyByHashKey(hash: string) {
  return `chatgiza:api-key-by-hash:${hash}`;
}

function hashKey(plaintextKey: string): string {
  return createHash("sha256").update(plaintextKey).digest("hex");
}

/** Generates a new API key for [userId], stores only its hash, and returns
 * the plaintext key (caller must show it to the user now -- it can't be
 * retrieved again) plus the stored record. */
export async function createApiKey(userId: string, label: string): Promise<{ plaintextKey: string; record: ApiKeyRecord }> {
  const secret = randomBytes(24).toString("base64url");
  const plaintextKey = `${KEY_PREFIX}${secret}`;
  const keyHash = hashKey(plaintextKey);

  const record: ApiKeyRecord = {
    id: crypto.randomUUID(),
    userId,
    label: label.slice(0, 60) || "API key",
    keyHash,
    keyPrefix: plaintextKey.slice(0, KEY_PREFIX.length + 6),
    createdAt: Date.now(),
    lastUsedAt: null,
    revoked: false,
  };

  const existing = (await kv.get<ApiKeyRecord[]>(userKeysIndexKey(userId))) ?? [];
  await Promise.all([
    kv.set(userKeysIndexKey(userId), [record, ...existing]),
    kv.set(keyByHashKey(keyHash), record),
  ]);

  return { plaintextKey, record };
}

export async function listApiKeys(userId: string): Promise<ApiKeyRecord[]> {
  return (await kv.get<ApiKeyRecord[]>(userKeysIndexKey(userId))) ?? [];
}

export async function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
  const existing = (await kv.get<ApiKeyRecord[]>(userKeysIndexKey(userId))) ?? [];
  const target = existing.find((k) => k.id === keyId);
  if (!target) return false;

  const updated = existing.map((k) => (k.id === keyId ? { ...k, revoked: true } : k));
  await Promise.all([
    kv.set(userKeysIndexKey(userId), updated),
    kv.set(keyByHashKey(target.keyHash), { ...target, revoked: true }),
  ]);
  return true;
}

/** Resolves a plaintext API key (from an incoming request's Authorization
 * header) to the userId that owns it, or null if it's invalid/revoked.
 * Also bumps lastUsedAt so a user can see whether a key is actually being
 * used from their key list. */
export async function resolveApiKey(plaintextKey: string): Promise<string | null> {
  if (!plaintextKey.startsWith(KEY_PREFIX)) return null;
  const hash = hashKey(plaintextKey);
  const record = await kv.get<ApiKeyRecord>(keyByHashKey(hash));
  if (!record || record.revoked) return null;

  const updated: ApiKeyRecord = { ...record, lastUsedAt: Date.now() };
  const existing = (await kv.get<ApiKeyRecord[]>(userKeysIndexKey(record.userId))) ?? [];
  await Promise.all([
    kv.set(keyByHashKey(hash), updated),
    kv.set(
      userKeysIndexKey(record.userId),
      existing.map((k) => (k.id === record.id ? updated : k))
    ),
  ]);

  return record.userId;
}
