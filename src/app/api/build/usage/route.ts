import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { peekRateLimit } from "@/lib/rateLimit";

// Mirrors the exact key/limit/window api/build/turn's own two tracking
// windows use (see that route's FIVE_HOUR_LIMIT_PLACEHOLDER/
// WEEKLY_LIMIT_PLACEHOLDER comment) -- a peek, not a consuming request,
// so the usage popup can poll this without itself counting toward
// either window. Both ceilings are placeholders pending a real product
// decision on what they should actually cap out at; the counts
// themselves are real.
const FIVE_HOUR_LIMIT_PLACEHOLDER = 1000;
const WEEKLY_LIMIT_PLACEHOLDER = 5000;

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const [fiveHour, weekly] = await Promise.all([
    peekRateLimit(`build-5h:${user.id}`, FIVE_HOUR_LIMIT_PLACEHOLDER, 5 * 3600),
    peekRateLimit(`build-weekly:${user.id}`, WEEKLY_LIMIT_PLACEHOLDER, 7 * 24 * 3600),
  ]);
  return NextResponse.json({ fiveHour, weekly });
}
