import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";

type Project = { id: string; name: string; createdAt?: number; pinned?: boolean; description?: string };
type DeletedIds = Record<string, number>;

function projectsKey(userId: string) {
  return `chatgiza:projects:${userId}`;
}

function deletedIdsKey(userId: string) {
  return `chatgiza:projects-deleted:${userId}`;
}

function mergeDeletedIds(a: DeletedIds, b: DeletedIds): DeletedIds {
  const merged: DeletedIds = { ...a };
  for (const [id, ts] of Object.entries(b)) {
    if (!merged[id] || ts > merged[id]) merged[id] = ts;
  }
  return merged;
}

// Two devices each hold their own full list and PUT it back independently --
// a plain kv.set used to let whichever save landed last silently erase
// whatever the other device had just added (see the equivalent fix in
// /api/history). Unioning by id (incoming wins a same-id conflict, since
// it's the newer write -- covers renames too) means an addition from either
// side always survives a concurrent save; deletedIds tombstones a removal so
// a device that hasn't caught up yet doesn't resurrect it.
function mergeProjects(current: Project[], incoming: Project[], deletedIds: DeletedIds): Project[] {
  const byId = new Map<string, Project>();
  for (const p of current) byId.set(p.id, p);
  for (const p of incoming) byId.set(p.id, p);
  for (const id of Object.keys(deletedIds)) byId.delete(id);
  return Array.from(byId.values());
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const [projects, deletedIds] = await Promise.all([
      kv.get<Project[]>(projectsKey(userId)),
      kv.get<DeletedIds>(deletedIdsKey(userId)),
    ]);
    return NextResponse.json({ projects: projects ?? [], deletedIds: deletedIds ?? {} });
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
      pinned: typeof p.pinned === "boolean" ? p.pinned : undefined,
      description: typeof p.description === "string" ? p.description : undefined,
    }))
    .filter((p: Project) => p.id);
  const incomingDeletedIds: DeletedIds =
    body.deletedIds && typeof body.deletedIds === "object" && !Array.isArray(body.deletedIds) ? body.deletedIds : {};

  try {
    const [currentProjects, currentDeletedIds] = await Promise.all([
      kv.get<Project[]>(projectsKey(userId)),
      kv.get<DeletedIds>(deletedIdsKey(userId)),
    ]);
    const mergedDeletedIds = mergeDeletedIds(currentDeletedIds ?? {}, incomingDeletedIds);
    const mergedProjects = mergeProjects(currentProjects ?? [], projects, mergedDeletedIds);
    await Promise.all([
      kv.set(projectsKey(userId), mergedProjects),
      kv.set(deletedIdsKey(userId), mergedDeletedIds),
    ]);
    return NextResponse.json({ ok: true, projects: mergedProjects, deletedIds: mergedDeletedIds });
  } catch (err) {
    console.error("Projects KV set error", err);
    const message = err instanceof Error ? err.message : "Failed to save projects";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
