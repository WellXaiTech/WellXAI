import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { peekRateLimit } from "@/lib/rateLimit";

// Mirrors the exact key/limit/window /api/build/turn's own rate limiter
// uses, so this always reports the real, current count -- never a
// separately-tracked (and possibly stale or fake) number.
const BUILD_TURN_LIMIT_PER_MINUTE = 40;

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const usage = await peekRateLimit(`build-turn:${user.id}`, BUILD_TURN_LIMIT_PER_MINUTE, 60);
  return NextResponse.json(usage);
}
