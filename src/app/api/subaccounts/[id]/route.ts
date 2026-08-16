import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestUser } from "@/lib/requestUser";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 40) {
    return NextResponse.json({ error: "A name between 1 and 40 characters is required" }, { status: 400 });
  }

  try {
    const { data: sub } = await supabaseAdmin.from("subaccounts").select("owner_id").eq("id", id).maybeSingle();
    if (!sub) {
      return NextResponse.json({ error: "Subaccount not found" }, { status: 404 });
    }
    if (sub.owner_id !== user.id) {
      return NextResponse.json({ error: "You can only rename your own subaccounts" }, { status: 403 });
    }
    const { error } = await supabaseAdmin.from("subaccounts").update({ name }).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true, name });
  } catch (err) {
    console.error("Subaccounts PATCH error:", err);
    return NextResponse.json({ error: "Failed to rename subaccount" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const { data: sub } = await supabaseAdmin.from("subaccounts").select("owner_id").eq("id", id).maybeSingle();
    if (!sub) {
      return NextResponse.json({ error: "Subaccount not found" }, { status: 404 });
    }
    if (sub.owner_id !== user.id) {
      return NextResponse.json({ error: "You can only delete your own subaccounts" }, { status: 403 });
    }
    await supabaseAdmin.from("subaccounts").delete().eq("id", id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Subaccounts DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete subaccount" }, { status: 500 });
  }
}
