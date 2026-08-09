import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ensureUserExists } from "@/lib/userIndex";
import { getRequestUser } from "@/lib/requestUser";

// Same shape as media_likes' toggle: a row per (follower, followed) with a
// composite primary key, check-then-act, and a 23505 conflict from two
// rapid taps treated as success rather than bounced to the client as an
// error (see the like route for the full reasoning).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id: followedId } = await params;

  if (followedId === user.id) {
    return NextResponse.json({ error: "Can't follow yourself" }, { status: 400 });
  }

  try {
    const { data: existing } = await supabaseAdmin
      .from("media_follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("followed_id", followedId)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin.from("media_follows").delete().eq("follower_id", user.id).eq("followed_id", followedId);
    } else {
      await ensureUserExists(user.id, "", user.name, user.image ?? "");
      const { error: insertError } = await supabaseAdmin
        .from("media_follows")
        .insert({ follower_id: user.id, followed_id: followedId });
      if (insertError && insertError.code !== "23505") {
        throw insertError;
      }
    }

    const { count } = await supabaseAdmin
      .from("media_follows")
      .select("*", { count: "exact", head: true })
      .eq("followed_id", followedId);

    return NextResponse.json({ following: !existing, followerCount: count ?? 0 });
  } catch (err) {
    console.error("Media follow error:", err);
    return NextResponse.json({ error: "Failed to update follow" }, { status: 500 });
  }
}
