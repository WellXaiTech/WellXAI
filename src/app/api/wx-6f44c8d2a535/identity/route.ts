import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";

type EventRow = {
  id: string;
  event_type: string;
  detail: string | null;
  created_at: string;
  actor_user_id: string;
};

export async function GET() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const [totpRes, passkeysRes, apiKeysRes, ssoRes, eventsRes, users] = await Promise.all([
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }).eq("totp_enabled", true),
    supabaseAdmin.from("passkey_credentials").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("api_keys").select("*", { count: "exact", head: true }).is("revoked_at", null),
    supabaseAdmin.from("workspace_sso").select("*", { count: "exact", head: true }),
    supabaseAdmin
      .from("security_events")
      .select("id, event_type, detail, created_at, actor_user_id")
      .order("created_at", { ascending: false })
      .limit(20),
    supabaseAdmin.from("users").select("id, email, name"),
  ]);

  const userById = new Map((users.data ?? []).map((u) => [u.id, u]));
  const events = ((eventsRes.data as EventRow[] | null) ?? []).map((e) => {
    const actor = userById.get(e.actor_user_id);
    return {
      id: e.id,
      type: e.event_type,
      detail: e.detail,
      actorEmail: actor?.email ?? "",
      actorName: actor?.name ?? "",
      createdAt: new Date(e.created_at).getTime(),
    };
  });

  return NextResponse.json({
    totpEnabledCount: totpRes.count ?? 0,
    passkeysCount: passkeysRes.count ?? 0,
    apiKeysCount: apiKeysRes.count ?? 0,
    ssoCount: ssoRes.count ?? 0,
    events,
  });
}
