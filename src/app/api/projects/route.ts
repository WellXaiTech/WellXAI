import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";

type Project = { id: string; name: string; createdAt?: number };

function projectsKey(userId: string) {
  return `chatgiza:projects:${userId}`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const projects = await kv.get<Project[]>(projectsKey(userId));
    return NextResponse.json({ projects: projects ?? [] });
  } catch (err) {
    console.error("Projects KV get error", err);
    const message = err instanceof Error ? err.message : "Failed to load projects";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.projects)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const projects: Project[] = body.projects
    .filter((p: unknown): p is Record<string, unknown> => !!p && typeof p === "object")
    .map((p: Record<string, unknown>) => ({
      id: typeof p.id === "string" ? p.id : "",
      name: typeof p.name === "string" ? p.name : "",
      createdAt: typeof p.createdAt === "number" ? p.createdAt : undefined,
    }))
    .filter((p: Project) => p.id);

  try {
    await kv.set(projectsKey(userId), projects);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Projects KV set error", err);
    const message = err instanceof Error ? err.message : "Failed to save projects";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
