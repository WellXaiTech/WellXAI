import { supabaseAdmin } from "@/lib/supabase";

export type SecurityEventType =
  | "member_joined"
  | "member_removed"
  | "member_left"
  | "workspace_created"
  | "api_key_created"
  | "api_key_revoked"
  | "sso_configured"
  | "sso_login";

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
