"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { saveLocalShop } from "@/lib/chackallLocalShop";

export default function NewShopClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/store/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, whatsapp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Imeshindwa kuunda duka.");
      saveLocalShop({ slug: data.slug, name, editToken: data.editToken });
      // The editToken only ever lives in this URL -- there's no separate
      // login, so this redirect IS the account handoff. Uses the clean,
      // host-rewritten path (proxy.ts blanket-prefixes every path on
      // store.wellxai.world with /store) -- pushing the already-prefixed
      // real path here would get prefixed a second time into
      // /store/store/duka/... and 404.
      router.push(`/duka/${data.slug}/dhibiti?token=${data.editToken}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Imeshindwa kuunda duka.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-border px-6 py-4">
        <Link href="/">
          <Logo brand="ChackAll" />
        </Link>
      </header>

      <main className="mx-auto max-w-md px-6 py-12">
        <h1 className="heading">Anzisha duka lako</h1>
        <p className="mt-2 text-sm text-muted">
          Barua pepe inafanya kazi kwa wateja duniani kote, hivyo ndiyo njia kuu ya mawasiliano. WhatsApp ni ya
          hiari -- ongeza kama wateja wako wa karibu wanaitumia zaidi.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Jina la duka</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mfano: Shure Electronics"
              required
              className="w-full rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Barua pepe</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
              required
              className="w-full rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Namba ya WhatsApp (hiari)</label>
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="255712345678"
              inputMode="tel"
              className="w-full rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-foreground"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim() || !email.trim()}
            className="mt-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity disabled:opacity-40"
          >
            {loading ? "Inaunda..." : "Fungua duka"}
          </button>
        </form>
      </main>
    </div>
  );
}
