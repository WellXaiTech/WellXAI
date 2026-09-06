import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserGrowthStats } from "@/lib/userIndex";

type UserPlatform = "web" | "desktop" | "android" | "vscode";

export async function GET() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const [{ data: users }, growth] = await Promise.all([
    supabaseAdmin.from("users").select("platforms"),
    getUserGrowthStats(),
  ]);

  const platformCounts: Record<UserPlatform, number> = { web: 0, desktop: 0, android: 0, vscode: 0 };
  let untracked = 0;
  for (const row of users ?? []) {
    const platforms = (row.platforms as UserPlatform[] | null) ?? [];
    if (platforms.length === 0) {
      untracked++;
      continue;
    }
    for (const p of platforms) {
      if (p in platformCounts) platformCounts[p]++;
    }
  }

  return NextResponse.json({
    totalUsers: users?.length ?? 0,
    platformCounts,
    untracked,
    ...growth,
  });
}
