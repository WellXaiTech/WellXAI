import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { getFreshConnectorToken } from "@/lib/connectors";
import { runSql, getSupabaseProjectOwner } from "@/lib/supabaseApp";

// The schema-management half of the Supabase integration -- runs real SQL
// (CREATE TABLE, ALTER TABLE, RLS policies, etc.) against an already-
// created project via the Management API's own query endpoint, so the
// agent never needs a direct Postgres connection just to shape a schema.
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const projectRef = body?.projectRef as string | undefined;
  const sql = body?.sql as string | undefined;
  if (!projectRef || !sql) {
    return NextResponse.json({ error: "projectRef and sql are required" }, { status: 400 });
  }

  const ownerId = await getSupabaseProjectOwner(projectRef);
  if (ownerId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const token = await getFreshConnectorToken(user.id, "supabase");
  if (!token) {
    return NextResponse.json({ error: "Connect Supabase first." }, { status: 400 });
  }

  try {
    const res = await runSql(token.accessToken, projectRef, sql);
    if (!res.ok) {
      return NextResponse.json({ error: `Supabase rejected the query: ${res.body}` }, { status: 502 });
    }
    return NextResponse.json({ ok: true, result: res.data });
  } catch (err) {
    console.error("Supabase run SQL error:", err);
    return NextResponse.json({ error: "Something went wrong running the query." }, { status: 500 });
  }
}
