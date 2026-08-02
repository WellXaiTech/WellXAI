"use client";

import { useState, type FormEvent } from "react";

export default function SupportModal({
  defaultEmail,
  onClose,
}: {
  defaultEmail?: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim() || !email.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Imeshindikana kutuma ujumbe. Jaribu tena.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Imeshindikana kutuma ujumbe. Jaribu tena.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onClick={onClose}>
      <div className="card w-full max-w-md rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <>
            <div className="glow-badge mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface text-2xl">
              ✓
            </div>
            <h2 className="mb-1 text-center text-base font-semibold">Ujumbe umetumwa</h2>
            <p className="mb-5 text-center text-sm text-muted">
              Asante kwa kutuandikia. Timu yetu itapitia ujumbe wako na kukujibu kwenye barua pepe uliyotoa.
            </p>
            <button
              onClick={onClose}
              className="btn-primary w-full rounded-full py-2.5 text-sm font-medium hover:opacity-85"
            >
              Sawa
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 className="mb-1 text-base font-semibold">Wasiliana nasi</h2>
            <p className="mb-5 text-sm text-muted">
              Andika tatizo lako au jambo lolote unalotaka kutushirikisha, kwa maneno yako mwenyewe — tutasoma na
              kukujibu.
            </p>

            <label className="mb-1 block text-xs text-muted">Barua pepe yako (ili tuweze kukujibu)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="wewe@example.com"
              required
              className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
            />

            <label className="mb-1 block text-xs text-muted">Ujumbe wako</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Eleza tatizo au jambo lako hapa..."
              required
              rows={6}
              className="mb-4 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
            />

            {error && <p className="mb-4 text-xs text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={sending || !message.trim() || !email.trim()}
              className="btn-primary mb-2 w-full rounded-full py-2.5 text-sm font-medium hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? "Inatuma…" : "Tuma ujumbe"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-full py-2 text-sm text-muted transition-colors hover:text-foreground"
            >
              Ghairi
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
