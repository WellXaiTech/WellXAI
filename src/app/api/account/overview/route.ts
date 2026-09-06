import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";
import { getUserById } from "@/lib/userIndex";
import { getUserTokens } from "@/lib/tokenUsage";
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

  const [user, tokensUsed, deletedIds] = await Promise.all([
    getUserById(userId),
    getUserTokens(userId),
    kv.get<Record<string, number>>(`chatgiza:history-deleted:${userId}`),
  ]);

  return NextResponse.json({
    id: userId,
    uid: deriveUid(userId),
    createdAt: user?.createdAt ?? null,
    lastSeenAt: user?.lastSeenAt ?? null,
    lastLogoutAt: user?.lastLogoutAt ?? null,
    platforms: user?.platforms ?? [],
    tokensUsed,
    deletedConversationsCount: deletedIds ? Object.keys(deletedIds).length : 0,
  });
}
