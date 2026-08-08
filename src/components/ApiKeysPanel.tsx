"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";

type ApiKeyRecord = {
  id: string;
  label: string;
  keyPrefix: string;
  createdAt: number;
  lastUsedAt: number | null;
  revoked: boolean;
};

export default function ApiKeysPanel() {
  const { status } = useSession();
  const [keys, setKeys] = useState<ApiKeyRecord[] | null>(null);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/developer/keys")
      .then((r) => r.json())
      .then((data) => setKeys(data.keys ?? []))
      .catch(() => setError("Couldn't load your API keys"));
  }, [status]);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/developer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() || "API key" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't create key");
      setNewKey(data.key);
      setKeys((prev) => [{ ...data.record }, ...(prev ?? [])]);
      setLabel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create key");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/developer/keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Couldn't revoke key");
      setKeys((prev) => (prev ?? []).map((k) => (k.id === id ? { ...k, revoked: true } : k)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't revoke key");
    }
  }

  if (status === "loading") return null;

  if (status !== "authenticated") {
    return (
      <section className="mt-12 card rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Your API Keys</h2>
        <p className="mt-2 mb-4 text-sm text-muted">Sign in to generate and manage API keys for your account.</p>
        <button
          onClick={() => signIn("google")}
          className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity"
        >
          Sign in
        </button>
      </section>
    );
  }

  return (
    <section className="mt-12 card rounded-2xl p-6">
      <h2 className="text-lg font-semibold">Your API Keys</h2>
      <p className="mt-2 mb-4 text-sm text-muted">
        Keys are shown once, right after you create them — store yours somewhere safe. Anyone with a key can send
        requests as your account, so treat it like a password.
      </p>

      {newKey && (
        <div className="mb-4 rounded-xl border border-border bg-surface-2 p-4">
          <p className="mb-2 text-xs font-medium text-muted">
            Copy this now — you won&apos;t be able to see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg bg-background px-3 py-2 text-xs">{newKey}</code>
            <button
              onClick={() => navigator.clipboard.writeText(newKey)}
              className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-2 transition-colors"
            >
              Copy
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="mt-2 text-xs text-muted hover:text-foreground">
            Done
          </button>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Key name, e.g. Production"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
        />
        <button
          onClick={handleCreate}
          disabled={creating}
          className="shrink-0 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {creating ? "Creating…" : "Generate key"}
        </button>
      </div>

      {error && <p className="mb-3 text-xs text-red-500">{error}</p>}

      {keys === null ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-muted">No API keys yet.</p>
      ) : (
        <ul className="space-y-2">
          {keys.map((k) => (
            <li
              key={k.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm"
            >
              <div>
                <p className="font-medium">{k.label}</p>
                <p className="text-xs text-muted">
                  {k.keyPrefix}… · Created {new Date(k.createdAt).toLocaleDateString()}
                  {k.revoked ? " · Revoked" : k.lastUsedAt ? ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : " · Never used"}
                </p>
              </div>
              {!k.revoked && (
                <button
                  onClick={() => handleRevoke(k.id)}
                  className="shrink-0 rounded-full border border-[#b3413e] px-3 py-1.5 text-xs font-medium text-[#b3413e] hover:bg-[#b3413e]/10 transition-colors"
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
