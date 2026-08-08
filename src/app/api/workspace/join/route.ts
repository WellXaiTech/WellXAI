import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";
import { acceptInvite } from "@/lib/workspace";

export async function POST(req: NextRequest) {
  const session = await auth();
  let caller: { userId: string; email: string; name: string } | null = null;
  if (session?.user?.id) {
    caller = { userId: session.user.id, email: session.user.email ?? "", name: session.user.name ?? "" };
  } else {
    const userId = await getMobileUserId(req);
    if (userId) caller = { userId, email: "", name: "" };
  }
  if (!caller) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!token) return NextResponse.json({ error: "Missing invite token" }, { status: 400 });

  try {
    const workspace = await acceptInvite(token, caller);
    return NextResponse.json({ workspace });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to join workspace" }, { status: 400 });
  }
}
