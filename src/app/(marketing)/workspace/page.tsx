"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";

type WorkspaceMember = { userId: string; email: string; name: string; role: "owner" | "member"; joinedAt: number };
type Workspace = {
  id: string;
  name: string;
  ownerId: string;
  customInstructions: string;
  members: WorkspaceMember[];
  createdAt: number;
};
type SsoConfig = { workspaceId: string; domain: string; issuer: string; clientId: string; createdAt: number };
type SecurityEvent = {
  id: string;
  actorName: string;
  eventType: string;
  detail: string | null;
  createdAt: number;
};

const EVENT_LABELS: Record<string, string> = {
  workspace_created: "created the workspace",
  member_joined: "joined",
  member_removed: "was removed",
  member_left: "left",
  api_key_created: "created an API key",
  api_key_revoked: "revoked an API key",
  sso_configured: "configured SSO",
  sso_login: "signed in via SSO",
};

export default function WorkspacePage() {
  const { data: session, status } = useSession();
  const [workspace, setWorkspace] = useState<Workspace | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [instructions, setInstructions] = useState("");
  const [instructionsSaved, setInstructionsSaved] = useState(false);

  const [sso, setSso] = useState<SsoConfig | null | undefined>(undefined);
  const [ssoDomain, setSsoDomain] = useState("");
  const [ssoIssuer, setSsoIssuer] = useState("");
  const [ssoClientId, setSsoClientId] = useState("");
  const [ssoClientSecret, setSsoClientSecret] = useState("");
  const [ssoBusy, setSsoBusy] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);

  const [events, setEvents] = useState<SecurityEvent[] | null>(null);

  const isOwner = !!workspace && workspace.ownerId === session?.user?.id;

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/workspace")
      .then((r) => r.json())
      .then((data) => {
        setWorkspace(data.workspace ?? null);
        setInstructions(data.workspace?.customInstructions ?? "");
      })
      .catch(() => setError("Couldn't load your workspace"));
  }, [status]);

  useEffect(() => {
    if (!isOwner) return;
    fetch("/api/workspace/sso")
      .then((r) => r.json())
      .then((data) => setSso(data.config ?? null))
      .catch(() => setSso(null));
    fetch("/api/workspace/security-log")
      .then((r) => r.json())
      .then((data) => setEvents(data.events ?? []))
      .catch(() => setEvents([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner]);

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

  async function handleSaveInstructions() {
    setBusy(true);
    setInstructionsSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customInstructions: instructions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWorkspace(data.workspace);
      setInstructionsSaved(true);
      setTimeout(() => setInstructionsSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save instructions");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveSso() {
    setSsoBusy(true);
    setSsoError(null);
    try {
      const res = await fetch("/api/workspace/sso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: ssoDomain, issuer: ssoIssuer, clientId: ssoClientId, clientSecret: ssoClientSecret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSso(data.config);
      setSsoClientSecret("");
    } catch (err) {
      setSsoError(err instanceof Error ? err.message : "Couldn't save SSO configuration");
    } finally {
      setSsoBusy(false);
    }
  }

  async function handleRemoveSso() {
    setSsoBusy(true);
    setSsoError(null);
    try {
      const res = await fetch("/api/workspace/sso", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSso(null);
      setSsoDomain("");
      setSsoIssuer("");
      setSsoClientId("");
    } catch (err) {
      setSsoError(err instanceof Error ? err.message : "Couldn't remove SSO configuration");
    } finally {
      setSsoBusy(false);
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
              {!isOwner && (
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
                  {isOwner && m.role !== "owner" && (
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

          {isOwner && (
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

          {isOwner && (
            <div className="card rounded-2xl p-6">
              <h2 className="text-lg font-semibold">Custom AI instructions</h2>
              <p className="mt-1 text-xs text-muted">
                Applied to every member&apos;s chats in this workspace, alongside their own personal settings.
              </p>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={4}
                placeholder="e.g. Always answer as a senior product manager at Acme Inc. Prefer concise, numbered action items."
                className="mt-3 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
              />
              <div className="mt-2 flex items-center gap-3">
                <button
                  onClick={handleSaveInstructions}
                  disabled={busy}
                  className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Save
                </button>
                {instructionsSaved && <span className="text-xs text-muted">Saved</span>}
              </div>
            </div>
          )}

          {isOwner && (
            <div className="card rounded-2xl p-6">
              <h2 className="text-lg font-semibold">Enterprise SSO</h2>
              <p className="mt-1 text-xs text-muted">
                Let anyone with an email on your company domain sign in through your own identity provider (Okta, Azure
                AD, Google Workspace, or anything else that speaks OIDC).
              </p>

              {sso === undefined ? null : sso ? (
                <div className="mt-4 space-y-2 text-sm">
                  <p>
                    <span className="text-muted">Domain: </span>
                    {sso.domain}
                  </p>
                  <p>
                    <span className="text-muted">Issuer: </span>
                    {sso.issuer}
                  </p>
                  <p>
                    <span className="text-muted">Client ID: </span>
                    {sso.clientId}
                  </p>
                  {ssoError && <p className="text-red-500">{ssoError}</p>}
                  <button
                    onClick={handleRemoveSso}
                    disabled={ssoBusy}
                    className="mt-2 rounded-full border border-[#b3413e] px-3 py-1.5 text-xs font-medium text-[#b3413e] hover:bg-[#b3413e]/10 transition-colors disabled:opacity-50"
                  >
                    Remove SSO
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  <input
                    value={ssoDomain}
                    onChange={(e) => setSsoDomain(e.target.value)}
                    placeholder="Company email domain, e.g. acme.com"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                  />
                  <input
                    value={ssoIssuer}
                    onChange={(e) => setSsoIssuer(e.target.value)}
                    placeholder="Issuer URL, e.g. https://your-org.okta.com"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                  />
                  <input
                    value={ssoClientId}
                    onChange={(e) => setSsoClientId(e.target.value)}
                    placeholder="Client ID"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                  />
                  <input
                    value={ssoClientSecret}
                    onChange={(e) => setSsoClientSecret(e.target.value)}
                    placeholder="Client secret"
                    type="password"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                  />
                  {ssoError && <p className="text-xs text-red-500">{ssoError}</p>}
                  <button
                    onClick={handleSaveSso}
                    disabled={ssoBusy || !ssoDomain.trim() || !ssoIssuer.trim() || !ssoClientId.trim() || !ssoClientSecret.trim()}
                    className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {ssoBusy ? "Saving…" : "Save SSO configuration"}
                  </button>
                </div>
              )}
            </div>
          )}

          {isOwner && (
            <div className="card rounded-2xl p-6">
              <h2 className="text-lg font-semibold">Security log</h2>
              <p className="mt-1 text-xs text-muted">Membership changes, API key activity, and SSO sign-ins for this workspace.</p>
              {events === null ? (
                <p className="mt-3 text-xs text-muted">Loading…</p>
              ) : events.length === 0 ? (
                <p className="mt-3 text-xs text-muted">No security events yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {events.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 border-b border-border pb-2 text-sm last:border-0">
                      <span>
                        <span className="font-medium">{e.actorName}</span> {EVENT_LABELS[e.eventType] ?? e.eventType}
                        {e.detail && <span className="text-muted"> — {e.detail}</span>}
                      </span>
                      <span className="shrink-0 text-xs text-muted">{new Date(e.createdAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
