"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";

export default function VsCodeAuthPage() {
  const { data: session, status } = useSession();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vscode-auth/token", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate a token.");
      setToken(data.token);
      setCopied(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
  }

  if (status === "loading") {
    return <main className="flex min-h-screen items-center justify-center bg-black text-white">Loading…</main>;
  }

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
        <h1 className="text-xl font-bold">Sign in to connect VS Code</h1>
        <p className="max-w-sm text-sm text-white/60">
          You need to be signed in to ChatGiZa to generate a token for the VS Code extension.
        </p>
        <button
          onClick={() => signIn("google")}
          className="rounded-full bg-white px-6 py-3 text-sm font-bold text-black"
        >
          Sign in with Google
        </button>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-black px-6 py-16 text-white">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold">Connect ChatGiZa to VS Code</h1>
        <p className="mt-2 text-sm text-white/60">
          Signed in as {session.user?.email}. Generate a token below, then paste it into VS Code when the
          &quot;ChatGiZa: Sign In&quot; command asks for one.
        </p>

        {!token ? (
          <button
            onClick={generate}
            disabled={loading}
            className="mt-6 w-full rounded-full bg-white px-6 py-3 text-sm font-bold text-black disabled:opacity-50"
          >
            {loading ? "Generating…" : "Generate token"}
          </button>
        ) : (
          <div className="mt-6">
            <div className="break-all rounded-xl border border-white/15 bg-white/5 p-4 font-mono text-xs">{token}</div>
            <button
              onClick={copy}
              className="mt-3 w-full rounded-full bg-white px-6 py-3 text-sm font-bold text-black"
            >
              {copied ? "Copied!" : "Copy token"}
            </button>
            <p className="mt-3 text-xs text-white/40">
              This token works for 60 days and can be revoked anytime from Settings &gt; Security &gt; Trusted
              Devices (look for &quot;VS Code&quot;). Don&apos;t share it with anyone.
            </p>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </div>
    </main>
  );
}
