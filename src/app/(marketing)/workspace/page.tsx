"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";

type WorkspaceMember = { userId: string; email: string; name: string; role: "owner" | "member"; joinedAt: number };
type Workspace = { id: string; name: string; ownerId: string; members: WorkspaceMember[]; createdAt: number };

export default function WorkspacePage() {
  const { data: session, status } = useSession();
  const [workspace, setWorkspace] = useState<Workspace | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/workspace")
      .then((r) => r.json())
      .then((data) => setWorkspace(data.workspace ?? null))
      .catch(() => setError("Couldn't load your workspace"));
  }, [status]);

  async function handleCreate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "My Workspace" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWorkspace(data.workspace);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create workspace");
    } finally {
      setBusy(false);
    }
  }

  async function handleInvite() {
    setBusy(true);
    setError(null);
    setInviteLink(null);
    try {
      const res = await fetch("/api/workspace/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInviteLink(data.joinUrl);
      setInviteEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send invite");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(userId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/workspace/members/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWorkspace(data.workspace);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove member");
    }
  }

  async function handleLeave() {
    setError(null);
    try {
      const res = await fetch("/api/workspace", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWorkspace(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't leave workspace");
    }
  }

  if (status === "loading" || workspace === undefined) {
    return <div className="mx-auto max-w-2xl px-4 py-16 w-full" />;
  }

  if (status !== "authenticated") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 w-full">
        <h1 className="text-3xl font-semibold">Team Workspace</h1>
        <p className="mt-3 text-muted">Sign in to create or join a team workspace.</p>
        <button
          onClick={() => signIn("google")}
          className="mt-4 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 w-full">
      <h1 className="text-3xl font-semibold">Team Workspace</h1>
      <p className="mt-3 text-muted">
        Invite people to work alongside you on ChatGiZa. Each account can belong to one workspace at a time.
      </p>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

      {!workspace ? (
        <div className="mt-8 card rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Create a workspace</h2>
          <div className="mt-4 flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Workspace name"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
            />
            <button
              onClick={handleCreate}
              disabled={busy}
              className="shrink-0 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <div className="card rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{workspace.name}</h2>
              {workspace.ownerId !== session?.user?.id && (
                <button onClick={handleLeave} className="text-xs text-[#b3413e] hover:underline">
                  Leave workspace
                </button>
              )}
            </div>
            <ul className="mt-4 space-y-2">
              {workspace.members.map((m) => (
                <li key={m.userId} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {m.name || m.email || m.userId} {m.role === "owner" && <span className="text-xs text-muted">(owner)</span>}
                    </p>
                    {m.email && <p className="text-xs text-muted">{m.email}</p>}
                  </div>
                  {workspace.ownerId === session?.user?.id && m.role !== "owner" && (
                    <button
                      onClick={() => handleRemove(m.userId)}
                      className="shrink-0 rounded-full border border-[#b3413e] px-3 py-1.5 text-xs font-medium text-[#b3413e] hover:bg-[#b3413e]/10 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {workspace.ownerId === session?.user?.id && (
            <div className="card rounded-2xl p-6">
              <h2 className="text-lg font-semibold">Invite someone</h2>
              <div className="mt-4 flex gap-2">
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@example.com"
                  type="email"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                />
                <button
                  onClick={handleInvite}
                  disabled={busy || !inviteEmail.trim()}
                  className="shrink-0 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Invite
                </button>
              </div>
              {inviteLink && (
                <div className="mt-3 rounded-lg border border-border bg-surface-2 p-3">
                  <p className="mb-1 text-xs text-muted">Invite sent. Share this link directly too, if needed:</p>
                  <code className="block overflow-x-auto text-xs">{inviteLink}</code>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
