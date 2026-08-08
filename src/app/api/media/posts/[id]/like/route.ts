import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ensureUserExists } from "@/lib/userIndex";
import { getRequestUser } from "@/lib/requestUser";

// A row per (post, liker) with a unique primary key, not a counter on the
// post itself -- toggling is then just "does my row already exist" followed
// by an insert/delete, which is safe under concurrent likes from different
// users in a way a read-post/increment-count/write-post round trip is not.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const { data: existing } = await supabaseAdmin
      .from("media_likes")
      .select("post_id")
      .eq("post_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin.from("media_likes").delete().eq("post_id", id).eq("user_id", user.id);
    } else {
      await ensureUserExists(user.id, "", user.name, user.image ?? "");
      const { error: insertError } = await supabaseAdmin.from("media_likes").insert({ post_id: id, user_id: user.id });
      // Two rapid taps can both pass the "existing" check above before
      // either insert lands, so the loser hits the (post_id, user_id)
      // primary key here -- that's not a real failure, the like already
      // exists exactly as intended, so don't bounce it to the client as
      // an error (which was reverting the optimistic UI even though the
      // like had actually gone through).
      if (insertError && insertError.code !== "23505") {
        throw insertError;
      }
    }

    const { count } = await supabaseAdmin.from("media_likes").select("*", { count: "exact", head: true }).eq("post_id", id);
    return NextResponse.json({ liked: !existing, likeCount: count ?? 0 });
  } catch (err) {
    console.error("Media post like error:", err);
    return NextResponse.json({ error: "Failed to update like" }, { status: 500 });
  }
}
