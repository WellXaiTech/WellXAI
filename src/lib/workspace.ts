import { kv } from "@vercel/kv";
import { randomBytes } from "crypto";

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

// Each user belongs to at most one workspace at a time, for simplicity --
// this is a small "team" concept, not a full multi-tenant org system.
function userWorkspaceKey(userId: string) {
  return `chatgiza:workspace-by-user:${userId}`;
}

function workspaceKey(id: string) {
  return `chatgiza:workspace:${id}`;
}

function inviteKey(token: string) {
  return `chatgiza:workspace-invite:${token}`;
}

export async function getWorkspaceForUser(userId: string): Promise<Workspace | null> {
  const workspaceId = await kv.get<string>(userWorkspaceKey(userId));
  if (!workspaceId) return null;
  return (await kv.get<Workspace>(workspaceKey(workspaceId))) ?? null;
}

export async function createWorkspace(owner: { userId: string; email: string; name: string }, name: string): Promise<Workspace> {
  const existing = await kv.get<string>(userWorkspaceKey(owner.userId));
  if (existing) throw new Error("You're already in a workspace");

  const workspace: Workspace = {
    id: crypto.randomUUID(),
    name: name.slice(0, 80) || "My Workspace",
    ownerId: owner.userId,
    members: [{ userId: owner.userId, email: owner.email, name: owner.name, role: "owner", joinedAt: Date.now() }],
    createdAt: Date.now(),
  };
  await Promise.all([kv.set(workspaceKey(workspace.id), workspace), kv.set(userWorkspaceKey(owner.userId), workspace.id)]);
  return workspace;
}

export async function createInvite(workspaceId: string, invitedBy: string, email: string): Promise<WorkspaceInvite> {
  const invite: WorkspaceInvite = {
    token: randomBytes(20).toString("base64url"),
    workspaceId,
    email: email.toLowerCase().trim(),
    invitedBy,
    createdAt: Date.now(),
    acceptedAt: null,
  };
  // Invites expire from disuse after 14 days -- long enough to act on, not
  // forever accumulating unused tokens in KV.
  await kv.set(inviteKey(invite.token), invite, { ex: 14 * 24 * 60 * 60 });
  return invite;
}

export async function acceptInvite(token: string, user: { userId: string; email: string; name: string }): Promise<Workspace> {
  const invite = await kv.get<WorkspaceInvite>(inviteKey(token));
  if (!invite || invite.acceptedAt) throw new Error("This invite link is invalid or already used");

  const alreadyIn = await kv.get<string>(userWorkspaceKey(user.userId));
  if (alreadyIn) throw new Error("You're already in a workspace — leave it first to join a new one");

  const workspace = await kv.get<Workspace>(workspaceKey(invite.workspaceId));
  if (!workspace) throw new Error("This workspace no longer exists");

  if (!workspace.members.some((m) => m.userId === user.userId)) {
    workspace.members.push({ userId: user.userId, email: user.email, name: user.name, role: "member", joinedAt: Date.now() });
  }

  await Promise.all([
    kv.set(workspaceKey(workspace.id), workspace),
    kv.set(userWorkspaceKey(user.userId), workspace.id),
    kv.set(inviteKey(token), { ...invite, acceptedAt: Date.now() }, { ex: 14 * 24 * 60 * 60 }),
  ]);
  return workspace;
}

export async function removeMember(workspaceId: string, requesterId: string, targetUserId: string): Promise<Workspace> {
  const workspace = await kv.get<Workspace>(workspaceKey(workspaceId));
  if (!workspace) throw new Error("Workspace not found");
  if (workspace.ownerId !== requesterId) throw new Error("Only the workspace owner can remove members");
  if (targetUserId === workspace.ownerId) throw new Error("The owner can't be removed — delete the workspace instead");

  workspace.members = workspace.members.filter((m) => m.userId !== targetUserId);
  await Promise.all([kv.set(workspaceKey(workspace.id), workspace), kv.del(userWorkspaceKey(targetUserId))]);
  return workspace;
}

export async function leaveWorkspace(userId: string): Promise<void> {
  const workspaceId = await kv.get<string>(userWorkspaceKey(userId));
  if (!workspaceId) return;
  const workspace = await kv.get<Workspace>(workspaceKey(workspaceId));
  if (workspace) {
    if (workspace.ownerId === userId) {
      throw new Error("The owner can't leave — remove all members and this will be handled separately, or transfer ownership first");
    }
    workspace.members = workspace.members.filter((m) => m.userId !== userId);
    await kv.set(workspaceKey(workspace.id), workspace);
  }
  await kv.del(userWorkspaceKey(userId));
}
