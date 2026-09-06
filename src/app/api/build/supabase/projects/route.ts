import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { hasBuildAccess } from "@/lib/usageLimit";
import { getFreshConnectorToken } from "@/lib/connectors";

// Lists the user's EXISTING Supabase projects via the Management API, so
// they can pick one for the agent to wire generated app code up to.
// Creating a brand-new project from here is intentionally out of scope --
// Management API project creation is asynchronous (~2 min) and returns a
// database password exactly once, which needs its own reveal-once UI
// flow this page doesn't have yet.
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!(await hasBuildAccess(user.id))) {
    return NextResponse.json({ error: "The Build page requires a Growth or Enterprise plan." }, { status: 403 });
  }

  const token = await getFreshConnectorToken(user.id, "supabase");
  if (!token) {
    return NextResponse.json({ error: "Connect Supabase first." }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.supabase.com/v1/projects", {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Supabase rejected the stored connection. Please reconnect Supabase." }, { status: 400 });
    }
    const data = await res.json();
    const projects = (Array.isArray(data) ? data : []).map((p: { id: string; name: string; region: string; status: string }) => ({
      ref: p.id,
      name: p.name,
      region: p.region,
      status: p.status,
    }));
    return NextResponse.json({ projects });
  } catch (err) {
    console.error("Supabase projects list error:", err);
    return NextResponse.json({ error: "Something went wrong listing Supabase projects." }, { status: 500 });
  }
}
