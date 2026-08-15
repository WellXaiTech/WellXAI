import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestUser } from "@/lib/requestUser";

const MAX_SUBACCOUNTS = 5;

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("subaccounts")
      .select("id, name, avatar_preset_id, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ subaccounts: data ?? [] });
  } catch (err) {
    console.error("Subaccounts GET error:", err);
    return NextResponse.json({ error: "Failed to load subaccounts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const avatarPresetId = typeof body?.avatarPresetId === "string" ? body.avatarPresetId : null;
  if (!name || name.length > 40) {
    return NextResponse.json({ error: "A name between 1 and 40 characters is required" }, { status: 400 });
  }

  try {
    const { count, error: countError } = await supabaseAdmin
      .from("subaccounts")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id);
    if (countError) throw countError;
    if ((count ?? 0) >= MAX_SUBACCOUNTS) {
      return NextResponse.json({ error: `You can only have up to ${MAX_SUBACCOUNTS} subaccounts` }, { status: 400 });
    }

    const id = `sub_${user.id}_${Date.now().toString(36)}`;
    const { error } = await supabaseAdmin.from("subaccounts").insert({
      id,
      owner_id: user.id,
      name,
      avatar_preset_id: avatarPresetId,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true, id, name, avatarPresetId });
  } catch (err) {
    console.error("Subaccounts POST error:", err);
    return NextResponse.json({ error: "Failed to create subaccount" }, { status: 500 });
  }
}
