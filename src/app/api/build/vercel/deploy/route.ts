import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getRequestUser } from "@/lib/requestUser";
import { hasBuildAccess } from "@/lib/usageLimit";
import { getFreshConnectorToken } from "@/lib/connectors";
import { validateBuildFiles } from "@/lib/buildFileLimits";

const DEPLOY_OWNER_TTL_SECONDS = 24 * 60 * 60;

function deployOwnerKey(deploymentId: string) {
  return `chatgiza:build-deploy-owner:${deploymentId}`;
}

// Kicks off a real Vercel deployment of the Build page's current virtual
// file set on the USER'S OWN connected Vercel account -- Vercel does the
// actual npm install/framework build server-side on their infrastructure,
// so ChatGiZa never runs generated code itself. Returns immediately
// (does not wait for the build to finish); the client polls
// /api/build/vercel/deploy/[id]/status until it's READY.
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!(await hasBuildAccess(user.id))) {
    return NextResponse.json({ error: "The Build page requires a Growth or Enterprise plan." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const files = body?.files as Record<string, string> | undefined;
  const projectName = body?.projectName as string | undefined;
  if (!files || Object.keys(files).length === 0 || !projectName) {
    return NextResponse.json({ error: "files and projectName are required" }, { status: 400 });
  }
  const sizeError = validateBuildFiles(files);
  if (sizeError) {
    return NextResponse.json({ error: sizeError }, { status: 400 });
  }

  const token = await getFreshConnectorToken(user.id, "vercel");
  if (!token) {
    return NextResponse.json({ error: "Connect Vercel first." }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: projectName,
        target: "production",
        files: Object.entries(files).map(([file, data]) => ({ file, data })),
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Vercel deployment creation failed:", res.status, errBody);
      return NextResponse.json({ error: "Vercel rejected the deployment. Check that Vercel is still connected." }, { status: 502 });
    }

    const data = await res.json();
    const deploymentId = data.id as string;
    await kv.set(deployOwnerKey(deploymentId), user.id, { ex: DEPLOY_OWNER_TTL_SECONDS });

    return NextResponse.json({
      deploymentId,
      url: data.url ? `https://${data.url}` : null,
      inspectorUrl: data.inspectorUrl ?? null,
      state: data.readyState ?? "QUEUED",
    });
  } catch (err) {
    console.error("Vercel deploy error:", err);
    return NextResponse.json({ error: "Something went wrong starting the deployment." }, { status: 500 });
  }
}
