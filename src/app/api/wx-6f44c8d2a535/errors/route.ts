import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("app_errors")
    .select("id, message, stack, route, user_id, created_at, users(name, email)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: "Failed to load errors" }, { status: 500 });
  }

  const errors = (data ?? []).map((row) => {
    const user = Array.isArray(row.users) ? row.users[0] : row.users;
    return {
      id: row.id as string,
      message: row.message as string,
      stack: row.stack as string | null,
      route: row.route as string | null,
      userId: row.user_id as string | null,
      userName: (user?.name as string | undefined) ?? null,
      userEmail: (user?.email as string | undefined) ?? null,
      createdAt: new Date(row.created_at as string).getTime(),
    };
  });

  return NextResponse.json({ errors });
}
