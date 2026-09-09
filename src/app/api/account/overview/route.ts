import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";
import { getUserById } from "@/lib/userIndex";
import { getUserTokens, getModelTokenHistory } from "@/lib/tokenUsage";
import { deriveUid } from "@/lib/uid";

// Personal "Overview" tab in Settings -- everything here is either already
// tracked server-side (createdAt/lastSeenAt/lastLogoutAt, tokens, deleted
// conversation count) or intentionally omitted because it isn't tracked
// anywhere yet (see the Overview stats plan doc). Nothing here is invented.
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const [user, tokensUsed, deletedIds, modelTokenHistory] = await Promise.all([
    getUserById(userId),
    getUserTokens(userId),
    kv.get<Record<string, number>>(`chatgiza:history-deleted:${userId}`),
    // 45 days, fed only by the Build agent (see tokenUsage.ts) -- same
    // partial-coverage caveat as tokensUsed above, just broken down by
    // model and by day instead of one running total.
    getModelTokenHistory(userId, 45),
  ]);

  return NextResponse.json({
    id: userId,
    uid: deriveUid(userId),
    createdAt: user?.createdAt ?? null,
    lastSeenAt: user?.lastSeenAt ?? null,
    lastLogoutAt: user?.lastLogoutAt ?? null,
    platforms: user?.platforms ?? [],
    tokensUsed,
    modelTokenHistory,
    deletedConversationsCount: deletedIds ? Object.keys(deletedIds).length : 0,
  });
}
