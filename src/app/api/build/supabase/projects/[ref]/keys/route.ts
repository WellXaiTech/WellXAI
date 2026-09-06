import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { hasBuildAccess } from "@/lib/usageLimit";
import { getFreshConnectorToken } from "@/lib/connectors";

// Fetches a chosen Supabase project's URL + anon (public) key so the
// Build agent can write real @supabase/supabase-js client code against
// it. Deliberately never returns the service_role key -- that belongs
// server-side only, not in generated client code.
export async function GET(req: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!(await hasBuildAccess(user.id))) {
    return NextResponse.json({ error: "The Build page requires a Growth or Enterprise plan." }, { status: 403 });
  }

  const { ref } = await params;
  const token = await getFreshConnectorToken(user.id, "supabase");
  if (!token) {
    return NextResponse.json({ error: "Connect Supabase first." }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys`, {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Could not fetch that project's API keys." }, { status: 502 });
    }
    const keys = await res.json();
    const anonKey = (Array.isArray(keys) ? keys : []).find((k: { name: string }) => k.name === "anon")?.api_key as string | undefined;
    if (!anonKey) {
      return NextResponse.json({ error: "That project has no anon key available." }, { status: 502 });
    }

    return NextResponse.json({ url: `https://${ref}.supabase.co`, anonKey });
  } catch (err) {
    console.error("Supabase project keys error:", err);
    return NextResponse.json({ error: "Something went wrong fetching the project's keys." }, { status: 500 });
  }
}
