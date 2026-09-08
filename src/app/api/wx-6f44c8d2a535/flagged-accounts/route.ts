import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";

// An account counts as "flagged" once it has this many failed/rate-limited
// 2FA attempts within the lookback window -- a real owner mistyping a code
// once or twice is normal; this many in a week is the pattern an actual
// brute-force attempt (or a compromised/shared account) leaves behind.
const FLAG_THRESHOLD = 3;
const LOOKBACK_DAYS = 7;

export async function GET() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("security_events")
    .select("actor_user_id, event_type, detail, created_at, users!security_events_actor_user_id_fkey(name, email)")
    .in("event_type", ["login_2fa_failed", "login_2fa_rate_limited"])
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load flagged accounts" }, { status: 500 });
  }

  type Row = {
    actor_user_id: string;
    event_type: string;
    detail: string | null;
    created_at: string;
    users: { name: string | null; email: string | null } | { name: string | null; email: string | null }[] | null;
  };

  const byAccount = new Map<
    string,
    { userId: string; name: string; email: string; failedCount: number; rateLimitedCount: number; lastSeen: number }
  >();

  for (const row of (data ?? []) as Row[]) {
    const u = Array.isArray(row.users) ? row.users[0] : row.users;
    const entry = byAccount.get(row.actor_user_id) ?? {
      userId: row.actor_user_id,
      name: u?.name || "Unknown",
      email: u?.email || "",
      failedCount: 0,
      rateLimitedCount: 0,
      lastSeen: 0,
    };
    if (row.event_type === "login_2fa_failed") entry.failedCount++;
    if (row.event_type === "login_2fa_rate_limited") entry.rateLimitedCount++;
    entry.lastSeen = Math.max(entry.lastSeen, new Date(row.created_at).getTime());
    byAccount.set(row.actor_user_id, entry);
  }

  const flagged = Array.from(byAccount.values())
    .filter((a) => a.failedCount + a.rateLimitedCount >= FLAG_THRESHOLD)
    .sort((a, b) => b.failedCount + b.rateLimitedCount - (a.failedCount + a.rateLimitedCount));

  return NextResponse.json({ flagged, lookbackDays: LOOKBACK_DAYS, threshold: FLAG_THRESHOLD });
}
