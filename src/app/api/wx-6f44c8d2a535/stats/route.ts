import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { countUsers, listUsers } from "@/lib/userIndex";

export async function GET() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const [userCount, users] = await Promise.all([countUsers(), listUsers(200)]);
  return NextResponse.json({ userCount, users });
}
