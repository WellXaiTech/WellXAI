import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getRequestUser } from "@/lib/requestUser";
import { getFreshConnectorToken } from "@/lib/connectors";

function deployOwnerKey(deploymentId: string) {
  return `chatgiza:build-deploy-owner:${deploymentId}`;
}

// Polled by the Build page every few seconds after a deploy is kicked
// off, until state is READY/ERROR. Ownership-checked against the record
// written at deploy-creation time so one user can't poll (or learn
// anything about) another user's deployment.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await params;
  const ownerId = await kv.get<string>(deployOwnerKey(id));
  if (ownerId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const token = await getFreshConnectorToken(user.id, "vercel");
  if (!token) {
    return NextResponse.json({ error: "Connect Vercel first." }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.vercel.com/v13/deployments/${id}`, {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Could not check deployment status." }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json({
      state: data.readyState as string,
      url: data.url ? `https://${data.url}` : null,
    });
  } catch (err) {
    console.error("Vercel deploy status error:", err);
    return NextResponse.json({ error: "Something went wrong checking the deployment." }, { status: 500 });
  }
}
