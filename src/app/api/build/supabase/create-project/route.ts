import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { hasBuildAccess } from "@/lib/usageLimit";
import { getFreshConnectorToken } from "@/lib/connectors";
import {
  listOrganizations,
  createProject,
  generateDbPassword,
  saveSupabaseProjectRecord,
} from "@/lib/supabaseApp";

// Kicks off a real Supabase project (Management API), same spirit as
// push_to_github/deploy_to_vercel: the user's own connected Supabase
// account, a real cloud resource created the instant the model calls this
// (gated by useBuildAgent's own confirmation modal, same as those two).
// Unlike a GitHub repo or a Vercel deployment, a Supabase project takes a
// couple of minutes to actually provision -- this route only starts that
// and returns immediately; the client polls
// /api/build/supabase/create-project/[ref]/status until it's ready.
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!(await hasBuildAccess(user.id))) {
    return NextResponse.json({ error: "The Build page requires a Growth or Enterprise plan." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const name = body?.name as string | undefined;
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const token = await getFreshConnectorToken(user.id, "supabase");
  if (!token) {
    return NextResponse.json({ error: "Connect Supabase first." }, { status: 400 });
  }

  try {
    const orgsRes = await listOrganizations(token.accessToken);
    if (!orgsRes.ok) {
      console.error("Supabase list organizations failed:", orgsRes.status, orgsRes.body);
      return NextResponse.json({ error: "Could not read the connected Supabase account's organizations." }, { status: 502 });
    }
    const org = orgsRes.data[0];
    if (!org) {
      return NextResponse.json({ error: "The connected Supabase account has no organization to create a project in." }, { status: 400 });
    }

    const dbPass = generateDbPassword();
    const createRes = await createProject(token.accessToken, name, org.id, dbPass);
    if (!createRes.ok) {
      console.error("Supabase create project failed:", createRes.status, createRes.body);
      return NextResponse.json({ error: "Supabase rejected the project creation request." }, { status: 502 });
    }

    const project = createRes.data;
    await saveSupabaseProjectRecord(project.id, user.id, dbPass, project.region);

    return NextResponse.json({
      projectRef: project.id,
      orgName: org.name,
      status: project.status,
    });
  } catch (err) {
    console.error("Supabase create project error:", err);
    return NextResponse.json({ error: "Something went wrong creating the Supabase project." }, { status: 500 });
  }
}
