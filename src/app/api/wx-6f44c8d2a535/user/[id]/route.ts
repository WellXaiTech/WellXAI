import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { getUserById } from "@/lib/userIndex";
import { listSessions } from "@/lib/sessions";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserTokens } from "@/lib/tokenUsage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { id } = await params;

  const [user, sessions, postsRes, tokensUsed] = await Promise.all([
    getUserById(id),
    listSessions(id),
    supabaseAdmin.from("media_posts").select("*", { count: "exact", head: true }).eq("user_id", id),
    getUserTokens(id),
  ]);

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Each device session on the "mobile" platform (Android's own bearer-token
  // flow, see mobileAuth.ts) with a distinct device label is one physical
  // phone/SIM that's signed into this same Gmail account -- exactly what
  // "je, akaunti hii imetumika kwenye simu ngapi" is asking.
  const androidDevices = Array.from(
    new Set(sessions.filter((s) => s.platform === "mobile" && s.os === "Android").map((s) => s.device))
  );

  return NextResponse.json({
    user,
    sessions,
    androidDeviceCount: androidDevices.length,
    communityPostsCount: postsRes.count ?? 0,
    tokensUsed,
  });
}
