import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestUser } from "@/lib/requestUser";

// Public-facing summary of another (or your own) ChatGiZa Media profile:
// follower/following counts (Supabase, media_follows) plus the public bio
// (Vercel KV, same store /api/profile reads/writes) -- two separate data
// stores because media_* lives in Supabase while account/profile settings
// are still KV, so this is the one place that reads both to answer "what
// does this person's profile look like" in a single round trip.
function profileKey(userId: string) {
  return `chatgiza:profile-data:${userId}`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id: targetId } = await params;

  try {
    const [followerCountRes, followingCountRes, isFollowingRes, profileData, userRow] = await Promise.all([
      supabaseAdmin.from("media_follows").select("*", { count: "exact", head: true }).eq("followed_id", targetId),
      supabaseAdmin.from("media_follows").select("*", { count: "exact", head: true }).eq("follower_id", targetId),
      supabaseAdmin
        .from("media_follows")
        .select("follower_id")
        .eq("follower_id", user.id)
        .eq("followed_id", targetId)
        .maybeSingle(),
      kv.get<{ profile?: { bio?: string; displayName?: string; role?: string; country?: string; link?: string } }>(
        profileKey(targetId)
      ),
      // is_verified is admin-only (no self-serve UI writes it) and
      // created_at powers the "Joined <month year>" row -- both live in
      // Supabase alongside the rest of the account record, not KV.
      supabaseAdmin.from("users").select("created_at, is_verified").eq("id", targetId).maybeSingle(),
    ]);

    return NextResponse.json({
      followerCount: followerCountRes.count ?? 0,
      followingCount: followingCountRes.count ?? 0,
      isFollowedByMe: isFollowingRes.data !== null,
      bio: profileData?.profile?.bio ?? "",
      displayName: profileData?.profile?.displayName ?? "",
      occupation: profileData?.profile?.role ?? "",
      location: profileData?.profile?.country ?? "",
      link: profileData?.profile?.link ?? "",
      isVerified: userRow.data?.is_verified ?? false,
      joinedAt: userRow.data?.created_at ? new Date(userRow.data.created_at).getTime() : null,
    });
  } catch (err) {
    console.error("Media user profile error:", err);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}
