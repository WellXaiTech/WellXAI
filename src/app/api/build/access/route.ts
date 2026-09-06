import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { hasBuildAccess } from "@/lib/usageLimit";

// Client-side UX check only -- every Build API route independently
// enforces hasBuildAccess() server-side regardless of what this returns.
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ allowed: false }, { status: 401 });
  }
  const allowed = await hasBuildAccess(user.id);
  return NextResponse.json({ allowed });
}
