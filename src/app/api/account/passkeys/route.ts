import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestUser } from "@/lib/requestUser";

// Lists this account's registered passkeys -- id/public key/counter never
// leave the server, only what's needed to show and manage the list.
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("passkey_credentials")
    .select("id, device_name, created_at, last_used_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Passkeys list error:", error);
    return NextResponse.json({ error: "Failed to load passkeys" }, { status: 500 });
  }

  return NextResponse.json({
    passkeys: (data ?? []).map((row) => ({
      id: row.id,
      deviceName: row.device_name,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
    })),
  });
}

// Removes one passkey -- scoped to the caller's own credentials via the
// user_id match in the delete filter, not just the credential id, so one
// account can't remove another's passkey by guessing an id.
export async function DELETE(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("passkey_credentials").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    console.error("Passkey delete error:", error);
    return NextResponse.json({ error: "Failed to remove passkey" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
