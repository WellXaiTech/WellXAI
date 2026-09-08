import { supabaseAdmin } from "@/lib/supabase";
import { sendMailBestEffort } from "@/lib/mailer";
import { suspiciousLoginAlertEmail } from "@/lib/emailTemplates";
import { adminEmailList } from "@/lib/admin";

export type SecurityEventType =
  | "member_joined"
  | "member_removed"
  | "member_left"
  | "workspace_created"
  | "api_key_created"
  | "api_key_revoked"
  | "sso_configured"
  | "sso_login"
  // Not workspace-scoped (workspaceId is null for these) -- a failed or
  // rate-limited 2FA attempt is a per-account event, logged against
  // whichever account was being signed into. See src/auth.ts.
  | "login_2fa_failed"
  | "login_2fa_rate_limited";

export type SecurityEvent = {
  id: string;
  workspaceId: string | null;
  actorUserId: string;
  actorName: string;
  eventType: SecurityEventType;
  detail: string | null;
  createdAt: number;
};

type EventRow = {
  id: string;
  workspace_id: string | null;
  actor_user_id: string;
  event_type: SecurityEventType;
  detail: string | null;
  created_at: string;
  users: { name: string | null } | { name: string | null }[] | null;
};

function fromRow(row: EventRow): SecurityEvent {
  const u = Array.isArray(row.users) ? row.users[0] : row.users;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    actorUserId: row.actor_user_id,
    actorName: u?.name || "Unknown",
    eventType: row.event_type,
    detail: row.detail,
    createdAt: new Date(row.created_at).getTime(),
  };
}

/** Best-effort -- a logging failure should never break the action it's
 * describing, so errors are swallowed (and reported) rather than thrown. */
export async function logSecurityEvent(
  actorUserId: string,
  eventType: SecurityEventType,
  opts: { workspaceId?: string | null; detail?: string } = {}
): Promise<void> {
  try {
    await supabaseAdmin.from("security_events").insert({
      actor_user_id: actorUserId,
      event_type: eventType,
      workspace_id: opts.workspaceId ?? null,
      detail: opts.detail ?? null,
    });
  } catch (err) {
    console.error("logSecurityEvent failed:", err);
  }
}

/** Real-time half of "protection against hacks" -- logSecurityEvent alone
 * just writes a row nobody's necessarily watching; this actually notifies
 * every admin the moment an account crosses the 2FA rate limit, which is
 * the strongest signal available today that a real attack (not a typo) is
 * in progress. Best-effort, same reasoning as logSecurityEvent -- an
 * alerting failure must never break the login flow it's watching. */
export async function alertAdminsOfSuspiciousLogin(detail: string): Promise<void> {
  const { subject, html, from } = suspiciousLoginAlertEmail(detail);
  await Promise.all(adminEmailList().map((email) => sendMailBestEffort(email, subject, html, from)));
}

export async function listWorkspaceSecurityEvents(workspaceId: string, limit = 100): Promise<SecurityEvent[]> {
  const { data, error } = await supabaseAdmin
    .from("security_events")
    .select("id, workspace_id, actor_user_id, event_type, detail, created_at, users!security_events_actor_user_id_fkey(name)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as EventRow[]).map(fromRow);
}
