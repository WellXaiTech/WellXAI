import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestUser } from "@/lib/requestUser";

// Account Settings > Deactivate an Account. Unlike DELETE /api/account this
// touches nothing else -- just stamps deactivated_at so the account is
// visibly "paused" (see finishMobileSignIn, which clears it again the next
// time this same account signs back in).
export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { error } = await supabaseAdmin
    .from("users")
    .upsert({ id: user.id, deactivated_at: new Date().toISOString() }, { onConflict: "id" });

  if (error) {
    console.error("Account deactivate error:", error);
    return NextResponse.json({ error: "Couldn't deactivate the account -- try again" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
