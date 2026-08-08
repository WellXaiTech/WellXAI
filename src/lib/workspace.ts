import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { ensureUserExists } from "@/lib/userIndex";

export type WorkspaceMember = {
  userId: string;
  email: string;
  name: string;
  role: "owner" | "member";
  joinedAt: number;
};

export type Workspace = {
  id: string;
  name: string;
  ownerId: string;
  members: WorkspaceMember[];
  createdAt: number;
};

export type WorkspaceInvite = {
  token: string;
  workspaceId: string;
  email: string;
  invitedBy: string;
  createdAt: number;
  acceptedAt: number | null;
};

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

type MemberRow = {
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
  users: { email: string | null; name: string | null } | { email: string | null; name: string | null }[] | null;
};

function memberUser(row: MemberRow): { email: string; name: string } {
  const u = Array.isArray(row.users) ? row.users[0] : row.users;
  return { email: u?.email ?? "", name: u?.name ?? "" };
}

async function getWorkspaceById(id: string): Promise<Workspace | null> {
  const { data: ws } = await supabaseAdmin.from("workspaces").select("*").eq("id", id).maybeSingle();
  if (!ws) return null;

  const { data: members, error } = await supabaseAdmin
    .from("workspace_members")
    .select("user_id, role, joined_at, users!workspace_members_user_id_fkey(email, name)")
    .eq("workspace_id", id)
    .order("joined_at", { ascending: true });
  if (error) throw error;

  return {
    id: ws.id,
    name: ws.name,
    ownerId: ws.owner_id,
    createdAt: new Date(ws.created_at).getTime(),
    members: ((members ?? []) as MemberRow[]).map((m) => ({
      userId: m.user_id,
      ...memberUser(m),
      role: m.role,
      joinedAt: new Date(m.joined_at).getTime(),
    })),
  };
}

export async function getWorkspaceForUser(userId: string): Promise<Workspace | null> {
  const { data: membership } = await supabaseAdmin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) return null;
  return getWorkspaceById(membership.workspace_id);
}

export async function createWorkspace(owner: { userId: string; email: string; name: string }, name: string): Promise<Workspace> {
  const { data: existing } = await supabaseAdmin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", owner.userId)
    .maybeSingle();
  if (existing) throw new Error("You're already in a workspace");

  await ensureUserExists(owner.userId, owner.email, owner.name, "");

  const { data: ws, error } = await supabaseAdmin
    .from("workspaces")
    .insert({ name: name.slice(0, 80) || "My Workspace", owner_id: owner.userId })
    .select()
    .single();
  if (error || !ws) throw new Error("Failed to create workspace");

  const { error: memberErr } = await supabaseAdmin
    .from("workspace_members")
    .insert({ workspace_id: ws.id, user_id: owner.userId, role: "owner" });
  if (memberErr) throw new Error("Failed to create workspace");

  return (await getWorkspaceById(ws.id))!;
}

export async function createInvite(workspaceId: string, invitedBy: string, email: string): Promise<WorkspaceInvite> {
  const token = randomBytes(20).toString("base64url");
  const now = Date.now();
  const { data, error } = await supabaseAdmin
    .from("workspace_invites")
    .insert({
      token,
      workspace_id: workspaceId,
      email: email.toLowerCase().trim(),
      invited_by: invitedBy,
      expires_at: new Date(now + INVITE_TTL_MS).toISOString(),
    })
    .select()
    .single();
  if (error || !data) throw new Error("Failed to create invite");

  return {
    token: data.token,
    workspaceId: data.workspace_id,
    email: data.email,
    invitedBy: data.invited_by,
    createdAt: new Date(data.created_at).getTime(),
    acceptedAt: null,
  };
}

export async function acceptInvite(token: string, user: { userId: string; email: string; name: string }): Promise<Workspace> {
  const { data: invite } = await supabaseAdmin.from("workspace_invites").select("*").eq("token", token).maybeSingle();
  if (!invite || invite.accepted_at) throw new Error("This invite link is invalid or already used");
  if (new Date(invite.expires_at).getTime() < Date.now()) throw new Error("This invite link has expired");

  const { data: alreadyIn } = await supabaseAdmin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.userId)
    .maybeSingle();
  if (alreadyIn) throw new Error("You're already in a workspace — leave it first to join a new one");

  const workspace = await getWorkspaceById(invite.workspace_id);
  if (!workspace) throw new Error("This workspace no longer exists");

  await ensureUserExists(user.userId, user.email, user.name, "");

  if (!workspace.members.some((m) => m.userId === user.userId)) {
    await supabaseAdmin.from("workspace_members").insert({ workspace_id: workspace.id, user_id: user.userId, role: "member" });
  }
  await supabaseAdmin.from("workspace_invites").update({ accepted_at: new Date().toISOString() }).eq("token", token);

  return (await getWorkspaceById(workspace.id))!;
}

export async function removeMember(workspaceId: string, requesterId: string, targetUserId: string): Promise<Workspace> {
  const workspace = await getWorkspaceById(workspaceId);
  if (!workspace) throw new Error("Workspace not found");
  if (workspace.ownerId !== requesterId) throw new Error("Only the workspace owner can remove members");
  if (targetUserId === workspace.ownerId) throw new Error("The owner can't be removed — delete the workspace instead");

  await supabaseAdmin.from("workspace_members").delete().eq("workspace_id", workspaceId).eq("user_id", targetUserId);
  return (await getWorkspaceById(workspaceId))!;
}

export async function leaveWorkspace(userId: string): Promise<void> {
  const { data: membership } = await supabaseAdmin
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) return;
  if (membership.role === "owner") {
    throw new Error("The owner can't leave — remove all members and this will be handled separately, or transfer ownership first");
  }
  await supabaseAdmin.from("workspace_members").delete().eq("workspace_id", membership.workspace_id).eq("user_id", userId);
}
