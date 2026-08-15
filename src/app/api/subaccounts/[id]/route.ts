import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestUser } from "@/lib/requestUser";

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
