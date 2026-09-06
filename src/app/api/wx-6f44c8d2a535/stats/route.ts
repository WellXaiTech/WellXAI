import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { countUsers, listUsers, getUserGrowthStats } from "@/lib/userIndex";
import { supabaseAdmin } from "@/lib/supabase";
import { getAllAds } from "@/lib/ads";

export async function GET() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const [userCount, users, growth, postsRes, workspacesRes, subaccountsRes, ads] = await Promise.all([
    countUsers(),
    listUsers(200),
    getUserGrowthStats(),
    supabaseAdmin.from("media_posts").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("workspaces").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("subaccounts").select("*", { count: "exact", head: true }),
    getAllAds(),
  ]);

  const adsPendingReview = ads.filter((a) => a.status === "pending_review").length;
  const adsApproved = ads.filter((a) => a.status === "approved").length;

  return NextResponse.json({
    userCount,
    users,
    ...growth,
    postsCount: postsRes.count ?? 0,
    workspacesCount: workspacesRes.count ?? 0,
    subaccountsCount: subaccountsRes.count ?? 0,
    adsPendingReview,
    adsApproved,
  });
}
