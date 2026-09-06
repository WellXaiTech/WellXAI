import { supabaseAdmin } from "@/lib/supabase";

// "web" = browser or installed PWA (not currently distinguishable from
// plain browser server-side); "desktop" = the Electron app (detected via
// its custom User-Agent suffix); "android" = the native app's bearer-token
// flow; "vscode" = the VS Code extension's SSO handoff.
export type UserPlatform = "web" | "desktop" | "android" | "vscode";

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  image: string;
  createdAt: number;
  lastSeenAt: number;
  lastLogoutAt: number | null;
  platforms: UserPlatform[];
};

type UserRow = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  created_at: string;
  last_seen_at: string;
  last_logout_at: string | null;
  platforms: string[] | null;
};

function fromRow(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email ?? "",
    name: row.name ?? "",
    image: row.image ?? "",
    createdAt: new Date(row.created_at).getTime(),
    lastSeenAt: new Date(row.last_seen_at).getTime(),
    lastLogoutAt: row.last_logout_at ? new Date(row.last_logout_at).getTime() : null,
    platforms: (row.platforms ?? []) as UserPlatform[],
  };
}

// Called from /api/auth/clear-device-trust, which already runs on every
// sign-out (see chatgizaSignOut). Distinct from last_seen_at, which only
// moves on a real sign-in.
export async function recordUserLogout(userId: string): Promise<void> {
  await supabaseAdmin.from("users").update({ last_logout_at: new Date().toISOString() }).eq("id", userId);
}

function mergePlatforms(existing: string[] | null | undefined, next: UserPlatform | undefined): string[] {
  const set = new Set(existing ?? []);
  if (next) set.add(next);
  return Array.from(set);
}

// Called once per real sign-in (not per token refresh) from the auth.ts jwt
// callback. This is the durable record of who has ever signed in -- the
// admin dashboard enumerates it directly from Postgres now.
export async function recordUserSeen(
  sub: string,
  email: string,
  name: string,
  image: string,
  isNewAccount: boolean,
  platform?: UserPlatform
): Promise<void> {
  const nowIso = new Date().toISOString();

  if (isNewAccount) {
    await supabaseAdmin.from("users").upsert(
      { id: sub, email, name, image, last_seen_at: nowIso, platforms: mergePlatforms(null, platform) },
      { onConflict: "id" }
    );
    return;
  }

  // Returning user: only overwrite fields Google actually gave us this time,
  // keep whatever was already on file otherwise.
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("email, name, image, platforms")
    .eq("id", sub)
    .maybeSingle();

  await supabaseAdmin.from("users").upsert(
    {
      id: sub,
      email: email || existing?.email || "",
      name: name || existing?.name || "",
      image: image || existing?.image || "",
      last_seen_at: nowIso,
      platforms: mergePlatforms(existing?.platforms, platform),
    },
    { onConflict: "id" }
  );
}

// Guarantees a `users` row exists for [id] without clobbering any real data
// already on file -- needed before inserting anything that has a foreign
// key to `users` (workspace members, api keys, media posts/comments), since
// not every caller path (e.g. the native app's bearer-token auth) goes
// through auth.ts's jwt callback first.
//
// Some callers (workspace.ts) always pass an empty image, since they run on
// code paths that don't have it handy. If one of those calls happens to be
// what first creates a user's row, `image` used to be stuck empty forever --
// every later call, even ones carrying the real image (e.g. media post
// creation), was a no-op against an existing row. Backfilling a still-empty
// image here (without ever overwriting a real one) closes that gap.
export async function ensureUserExists(
  id: string,
  email: string,
  name: string,
  image: string,
  platform?: UserPlatform
): Promise<void> {
  const { data: existing } = await supabaseAdmin.from("users").select("image, platforms").eq("id", id).maybeSingle();

  if (!existing) {
    await supabaseAdmin.from("users").upsert(
      { id, email: email || null, name: name || null, image: image || null, platforms: mergePlatforms(null, platform) },
      { onConflict: "id" }
    );
    return;
  }

  const mergedPlatforms = mergePlatforms(existing.platforms, platform);
  const platformsChanged = platform && !(existing.platforms ?? []).includes(platform);
  if ((image && !existing.image) || platformsChanged) {
    await supabaseAdmin
      .from("users")
      .update({ ...(image && !existing.image ? { image } : {}), platforms: mergedPlatforms })
      .eq("id", id);
  }
}

export async function countUsers(): Promise<number> {
  const { count } = await supabaseAdmin.from("users").select("*", { count: "exact", head: true });
  return count ?? 0;
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  const { data } = await supabaseAdmin.from("users").select("*").eq("id", id).maybeSingle();
  return data ? fromRow(data as UserRow) : null;
}

export async function listUsers(limit = 100): Promise<UserRecord[]> {
  const { data } = await supabaseAdmin
    .from("users")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row) => fromRow(row as UserRow));
}

export type UserGrowthStats = {
  newToday: number;
  newThisWeek: number;
  newThisMonth: number;
  activeToday: number;
  activeThisWeek: number;
  // Oldest first, 14 entries -- one per day, for a simple signups-per-day
  // bar chart. Computed in JS from a single created_at range query rather
  // than a SQL GROUP BY, since the admin dashboard's user volume doesn't
  // need database-side aggregation yet.
  signupsByDay: { date: string; count: number }[];
};

export async function getUserGrowthStats(): Promise<UserGrowthStats> {
  const dayMs = 24 * 60 * 60 * 1000;
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const weekStart = todayStart - 6 * dayMs;
  const monthStart = todayStart - 29 * dayMs;
  const chartStart = todayStart - 13 * dayMs;

  const [newTodayRes, newWeekRes, newMonthRes, activeTodayRes, activeWeekRes, chartRowsRes] = await Promise.all([
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }).gte("created_at", new Date(todayStart).toISOString()),
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }).gte("created_at", new Date(weekStart).toISOString()),
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }).gte("created_at", new Date(monthStart).toISOString()),
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }).gte("last_seen_at", new Date(todayStart).toISOString()),
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }).gte("last_seen_at", new Date(weekStart).toISOString()),
    supabaseAdmin.from("users").select("created_at").gte("created_at", new Date(chartStart).toISOString()),
  ]);

  const counts = new Map<string, number>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(chartStart + i * dayMs);
    counts.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of chartRowsRes.data ?? []) {
    const key = (row as { created_at: string }).created_at.slice(0, 10);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return {
    newToday: newTodayRes.count ?? 0,
    newThisWeek: newWeekRes.count ?? 0,
    newThisMonth: newMonthRes.count ?? 0,
    activeToday: activeTodayRes.count ?? 0,
    activeThisWeek: activeWeekRes.count ?? 0,
    signupsByDay: Array.from(counts.entries()).map(([date, count]) => ({ date, count })),
  };
}
