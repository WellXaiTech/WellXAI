import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { getFreshConnectorToken } from "@/lib/connectors";
import { deployFunction, getSupabaseProjectOwner, setSecrets } from "@/lib/supabaseApp";

// The other half of "hide a third-party API key behind a real backend" --
// create_supabase_project/run_supabase_sql cover the database side, this
// covers actually shipping server-side CODE (an Edge Function) that can
// hold a secret the browser never sees. Deployed via the Management
// API's own multipart endpoint (see supabaseApp.ts's deployFunction),
// which is the ONLY real path to this -- the project's own anon/
// service_role keys are database-level credentials and can't deploy
// functions at all, regardless of which one is used.
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const projectRef = body?.projectRef as string | undefined;
  const slug = body?.slug as string | undefined;
  const files = body?.files as Record<string, string> | undefined;
  const entrypoint = (body?.entrypoint as string | undefined) || "index.ts";
  const secrets = body?.secrets as Record<string, string> | undefined;
  if (!projectRef || !slug || !files || Object.keys(files).length === 0) {
    return NextResponse.json({ error: "projectRef, slug, and files are required" }, { status: 400 });
  }
  if (!(entrypoint in files)) {
    return NextResponse.json({ error: `entrypoint "${entrypoint}" is not one of the given files` }, { status: 400 });
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
    if (secrets && Object.keys(secrets).length > 0) {
      const secretsRes = await setSecrets(token.accessToken, projectRef, secrets);
      if (!secretsRes.ok) {
        return NextResponse.json(
          { error: `Supabase rejected setting the function's secrets (${secretsRes.status}): ${secretsRes.body}` },
          { status: 502 }
        );
      }
    }
    const res = await deployFunction(token.accessToken, projectRef, slug, files, entrypoint);
    if (!res.ok) {
      return NextResponse.json({ error: `Supabase rejected the function deploy (${res.status}): ${res.body}` }, { status: 502 });
    }
    return NextResponse.json({
      ok: true,
      slug: res.data.slug,
      // The URL a client calls this function at -- the Supabase JS
      // client's functions.invoke(slug) builds this same URL itself, but
      // generated code that calls it with a plain fetch() needs the real
      // address written out.
      url: `https://${projectRef}.supabase.co/functions/v1/${res.data.slug}`,
    });
  } catch (err) {
    console.error("Supabase deploy function error:", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Something went wrong deploying the function: ${detail}` }, { status: 500 });
  }
}
