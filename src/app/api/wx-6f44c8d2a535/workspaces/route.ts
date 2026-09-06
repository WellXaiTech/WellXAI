import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";

type WorkspaceRow = {
  id: string;
  name: string;
  custom_instructions: string | null;
  created_at: string;
  owner_id: string;
};

export async function GET() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const [{ data: workspaces }, { data: owners }, { data: members }] = await Promise.all([
    supabaseAdmin.from("workspaces").select("id, name, custom_instructions, created_at, owner_id").order("created_at", { ascending: false }),
    supabaseAdmin.from("users").select("id, email, name"),
    supabaseAdmin.from("workspace_members").select("workspace_id"),
  ]);

  const ownerById = new Map((owners ?? []).map((u) => [u.id, u]));
  const memberCountByWorkspace = new Map<string, number>();
  for (const m of members ?? []) {
    memberCountByWorkspace.set(m.workspace_id, (memberCountByWorkspace.get(m.workspace_id) ?? 0) + 1);
  }

  const result = (workspaces as WorkspaceRow[] | null ?? []).map((w) => {
    const owner = ownerById.get(w.owner_id);
    const instructions = w.custom_instructions?.trim() ?? "";
    return {
      id: w.id,
      name: w.name,
      ownerEmail: owner?.email ?? "",
      ownerName: owner?.name ?? "",
      memberCount: memberCountByWorkspace.get(w.id) ?? 0,
      hasInstructions: instructions.length > 0,
      instructionsPreview: instructions.slice(0, 160),
      instructionsLength: instructions.length,
      createdAt: new Date(w.created_at).getTime(),
    };
  });

  return NextResponse.json({ workspaces: result });
}
