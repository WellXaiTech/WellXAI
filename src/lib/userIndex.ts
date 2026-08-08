import { supabaseAdmin } from "@/lib/supabase";

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  image: string;
  createdAt: number;
  lastSeenAt: number;
};

type UserRow = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  created_at: string;
  last_seen_at: string;
};

function fromRow(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email ?? "",
    name: row.name ?? "",
    image: row.image ?? "",
    createdAt: new Date(row.created_at).getTime(),
    lastSeenAt: new Date(row.last_seen_at).getTime(),
  };
}

// Called once per real sign-in (not per token refresh) from the auth.ts jwt
// callback. This is the durable record of who has ever signed in -- the
// admin dashboard enumerates it directly from Postgres now.
export async function recordUserSeen(
  sub: string,
  email: string,
  name: string,
  image: string,
  isNewAccount: boolean
): Promise<void> {
  const nowIso = new Date().toISOString();

  if (isNewAccount) {
    await supabaseAdmin.from("users").upsert(
      { id: sub, email, name, image, last_seen_at: nowIso },
      { onConflict: "id" }
    );
    return;
  }

  // Returning user: only overwrite fields Google actually gave us this time,
  // keep whatever was already on file otherwise.
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("email, name, image")
    .eq("id", sub)
    .maybeSingle();

  await supabaseAdmin.from("users").upsert(
    {
      id: sub,
      email: email || existing?.email || "",
      name: name || existing?.name || "",
      image: image || existing?.image || "",
      last_seen_at: nowIso,
    },
    { onConflict: "id" }
  );
}

// Guarantees a `users` row exists for [id] without clobbering any real data
// already on file -- needed before inserting anything that has a foreign
// key to `users` (workspace members, api keys, media posts/comments), since
// not every caller path (e.g. the native app's bearer-token auth) goes
// through auth.ts's jwt callback first.
export async function ensureUserExists(id: string, email: string, name: string, image: string): Promise<void> {
  await supabaseAdmin
    .from("users")
    .upsert({ id, email: email || null, name: name || null, image: image || null }, { onConflict: "id", ignoreDuplicates: true });
}

export async function countUsers(): Promise<number> {
  const { count } = await supabaseAdmin.from("users").select("*", { count: "exact", head: true });
  return count ?? 0;
}

export async function listUsers(limit = 100): Promise<UserRecord[]> {
  const { data } = await supabaseAdmin
    .from("users")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row) => fromRow(row as UserRow));
}
