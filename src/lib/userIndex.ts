import { kv } from "@vercel/kv";

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  image: string;
  createdAt: number;
  lastSeenAt: number;
};

const ALL_USERS_KEY = "chatgiza:all-users";

function userRecordKey(sub: string) {
  return `chatgiza:user-record:${sub}`;
}

// Called once per real sign-in (not per token refresh) from the auth.ts jwt
// callback. There's no DB user table in this JWT-session/no-adapter setup,
// so this sorted set (score = createdAt) is the only durable index of who
// has ever signed in -- it's what the admin dashboard enumerates.
export async function recordUserSeen(
  sub: string,
  email: string,
  name: string,
  image: string,
  isNewAccount: boolean
): Promise<void> {
  const key = userRecordKey(sub);
  const now = Date.now();
  const existing = isNewAccount ? null : await kv.get<UserRecord>(key);
  const record: UserRecord = {
    id: sub,
    email: email || existing?.email || "",
    name: name || existing?.name || "",
    image: image || existing?.image || "",
    createdAt: existing?.createdAt ?? now,
    lastSeenAt: now,
  };
  await kv.set(key, record);
  if (isNewAccount || !existing) {
    await kv.zadd(ALL_USERS_KEY, { score: record.createdAt, member: sub });
  }
}

export async function countUsers(): Promise<number> {
  return (await kv.zcard(ALL_USERS_KEY)) ?? 0;
}

export async function listUsers(limit = 100): Promise<UserRecord[]> {
  const subs = await kv.zrange<string[]>(ALL_USERS_KEY, 0, limit - 1, { rev: true });
  if (!subs || subs.length === 0) return [];
  const records = await Promise.all(subs.map((sub) => kv.get<UserRecord>(userRecordKey(sub))));
  return records.filter((r): r is UserRecord => r !== null);
}
