import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { getFreshConnectorToken } from "@/lib/connectors";
import {
  getProject,
  getProjectApiKeys,
  getSupabaseProjectOwner,
  getSupabaseProjectDbInfo,
  projectDatabaseUrl,
} from "@/lib/supabaseApp";

// Polled by the Build page after create-project kicks off, the same way
// /api/build/vercel/deploy/[id]/status is polled for a deployment --
// except a Supabase project takes minutes, not seconds, so this can be
// polled for much longer. Once the project reports ACTIVE_HEALTHY, this
// also fetches its real API keys and hands back everything needed to
// inject into the project's own .env in one round trip, rather than
// requiring a second endpoint call right after the status flips.
export async function GET(req: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { ref } = await params;
  const ownerId = await getSupabaseProjectOwner(ref);
  if (ownerId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const token = await getFreshConnectorToken(user.id, "supabase");
  if (!token) {
    return NextResponse.json({ error: "Connect Supabase first." }, { status: 400 });
  }

  try {
    const projectRes = await getProject(token.accessToken, ref);
    if (!projectRes.ok) {
      console.error("Supabase project status check failed:", projectRes.status, projectRes.body);
      return NextResponse.json({ error: "Could not check the Supabase project's status." }, { status: 502 });
    }
    const status = projectRes.data.status;
    if (status !== "ACTIVE_HEALTHY") {
      return NextResponse.json({ status, ready: false });
    }

    const [keysRes, dbInfo] = await Promise.all([
      getProjectApiKeys(token.accessToken, ref),
      getSupabaseProjectDbInfo(ref),
    ]);
    if (!keysRes.ok) {
      console.error("Supabase api-keys fetch failed:", keysRes.status, keysRes.body);
      return NextResponse.json({ error: "The project is ready but its API keys could not be read." }, { status: 502 });
    }
    const anonKey = keysRes.data.find((k) => k.name === "anon")?.api_key;
    const serviceRoleKey = keysRes.data.find((k) => k.name === "service_role")?.api_key;
    if (!anonKey || !serviceRoleKey) {
      return NextResponse.json({ error: "The project is ready but is missing its anon/service_role keys." }, { status: 502 });
    }

    return NextResponse.json({
      status,
      ready: true,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
        SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
        ...(dbInfo ? { DATABASE_URL: projectDatabaseUrl(ref, dbInfo.region, dbInfo.dbPass) } : {}),
      },
    });
  } catch (err) {
    console.error("Supabase project status error:", err);
    return NextResponse.json({ error: "Something went wrong checking the Supabase project." }, { status: 500 });
  }
}
