"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import MyShopLink from "@/components/store/MyShopLink";

type BusinessAdvice = {
  price: string;
  audience: string;
  caption: string;
  angle: string;
  complementaryProduct: string;
};

type Product = {
  id: number;
  url: string;
  title: string | null;
  image: string | null;
  video: string | null;
  description: string | null;
  siteName: string | null;
  price: string | null;
  adviceLoading: boolean;
  advice?: BusinessAdvice;
  adviceError?: string;
};

const ADVICE_LABELS: { key: keyof BusinessAdvice; label: string }[] = [
  { key: "price", label: "Bei" },
  { key: "audience", label: "Wateja walengwa" },
  { key: "caption", label: "Maandishi ya tangazo" },
  { key: "angle", label: "Mtazamo wa uuzaji" },
  { key: "complementaryProduct", label: "Bidhaa ya kuongeza" },
];

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Same browser-chrome visual language as the Build workspace's own "Live"
// panel (BuildWorkspace.tsx) -- tab chip + back/forward/reload + address
// bar -- so the two products in the WellXAI family read as one system.
// Back/forward stay decorative (there's no real navigation history here,
// same reasoning as Build's), reload actually re-fetches.
const BackIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);
const ForwardIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
const ReloadIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 3v6h-6" />
  </svg>
);
const ExternalLinkIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <path d="M15 3h6v6M10 14 21 3" />
  </svg>
);
const GlobeIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
  </svg>
);
const PlayIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);
const CloseIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export default function StorePageClient() {
  // The ONE place a link ever gets typed/pasted -- the address bar itself,
  // always visible in the Live pane (empty or loaded). The old separate
  // sidebar paste-box was a second place doing the same job; removed.
  const [addressInput, setAddressInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selected = products.find((p) => p.id === selectedId) ?? null;

  async function fetchAdvice(id: number, data: { url: string; title: string | null; description: string | null; siteName: string | null }) {
    try {
      const res = await fetch("/api/store/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Imeshindwa.");
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, adviceLoading: false, advice: json.advice } : p)));
    } catch {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, adviceLoading: false, adviceError: "Imeshindwa kutengeneza ushauri." } : p))
      );
    }
  }

  async function unfurl(url: string): Promise<void> {
    if (!url || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/store/unfurl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Imeshindwa kusoma link hii.");

      const id = Date.now();
      const product: Product = { id, ...data, adviceLoading: true };
      setProducts((prev) => [product, ...prev]);
      setSelectedId(id);
      setAddressInput(data.url);
      void fetchAdvice(id, { url: data.url, title: data.title, description: data.description, siteName: data.siteName });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Imeshindwa kusoma link hii.");
    } finally {
      setLoading(false);
    }
  }

  function handleAddressSubmit(e: React.FormEvent) {
    e.preventDefault();
    void unfurl(addressInput.trim());
  }

  function selectProduct(p: Product) {
    setSelectedId(p.id);
    setAddressInput(p.url);
    setError(null);
  }

  function closeCurrent() {
    setSelectedId(null);
    setAddressInput("");
    setError(null);
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
        <Link href="/">
          <Logo brand="ChackAll" />
        </Link>
        <div className="flex items-center gap-4">
          <MyShopLink />
          <Link href="/duka" className="text-sm font-medium text-muted hover:text-foreground">
            Anzisha duka lako
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Chat-style side: just the history of everything you've looked
            up in this session -- pick one to bring it back up in the Live
            pane's address bar. */}
        <div className="flex w-72 shrink-0 flex-col border-r border-border">
          <div className="shrink-0 border-b border-border p-4">
            <h1 className="text-sm font-medium">Weka link ya bidhaa</h1>
            <p className="mt-1 text-xs text-muted">
              Andika link kwenye address bar upande wa kulia -- Amazon, Alibaba, eBay, Shopify au duka lingine
              lolote.
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {products.length === 0 && <p className="p-2 text-xs text-muted">Bidhaa ulizoangalia zitaonekana hapa.</p>}
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectProduct(p)}
                className={`flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors ${
                  p.id === selectedId ? "bg-surface-2" : "hover:bg-surface-2/60"
                }`}
              >
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- arbitrary third-party image, see unfurl API
                  <img src={p.image} alt="" className="h-9 w-9 shrink-0 rounded-md bg-surface-2 object-contain" />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted">
                    {GlobeIcon}
                  </div>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{p.title ?? hostnameOf(p.url)}</span>
                  <span className="block truncate text-xs text-muted">{hostnameOf(p.url)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Live pane -- same browser-chrome pattern as Build's Live panel.
            The tab strip + address bar are always shown, loaded or not, so
            there's exactly one place a link ever lives. */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-1 border-b border-border px-2 pt-2">
            <span className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1 text-xs font-medium text-foreground">
              <span className="text-muted">{GlobeIcon}</span>
              <span className="max-w-[160px] truncate">
                {selected ? selected.siteName ?? hostnameOf(selected.url) : "New tab"}
              </span>
              {selected && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={closeCurrent}
                  aria-label="Funga"
                  className="flex h-4 w-4 items-center justify-center rounded-full text-muted transition-colors hover:bg-border hover:text-foreground"
                >
                  {CloseIcon}
                </span>
              )}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1 border-b border-border px-2 py-2">
            <span className="flex h-6 w-6 cursor-default items-center justify-center rounded-full text-muted opacity-40">
              {BackIcon}
            </span>
            <span className="flex h-6 w-6 cursor-default items-center justify-center rounded-full text-muted opacity-40">
              {ForwardIcon}
            </span>
            <button
              type="button"
              onClick={() => unfurl(addressInput.trim())}
              aria-label="Reload"
              className="flex h-6 w-6 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              {ReloadIcon}
            </button>
            <form onSubmit={handleAddressSubmit} className="ml-1 flex flex-1 items-center gap-1.5">
              <input
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="https://..."
                inputMode="url"
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-1 text-sm outline-none focus:border-foreground"
              />
              <button
                type="submit"
                disabled={loading || !addressInput.trim()}
                aria-label="Angalia"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
              >
                {PlayIcon}
              </button>
            </form>
            {selected && (
              <a
                href={selected.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                aria-label="Fungua kwenye tab mpya"
                className="flex h-6 w-6 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                {ExternalLinkIcon}
              </a>
            )}
          </div>

          {error && <p className="shrink-0 border-b border-border px-4 py-2 text-xs text-red-500">{error}</p>}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {selected ? (
              <div className="p-6">
                <div className="mx-auto max-w-xl">
                  {selected.video ? (
                    <video src={selected.video} controls playsInline className="max-h-96 w-full rounded-xl bg-black" />
                  ) : selected.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- arbitrary third-party image, see unfurl API
                    <img
                      src={selected.image}
                      alt={selected.title ?? "Bidhaa"}
                      className="max-h-96 w-full rounded-xl bg-surface-2 object-contain"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-xl bg-surface-2 text-sm text-muted">
                      Hakuna picha
                    </div>
                  )}

                  <p className="mt-4 text-lg font-medium">{selected.title ?? hostnameOf(selected.url)}</p>
                  {selected.price && <p className="mt-1 text-xl font-semibold">{selected.price}</p>}
                  {selected.description && <p className="mt-2 text-sm text-muted">{selected.description}</p>}

                  <div className="mt-6 rounded-lg border border-border bg-surface-2 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">Mawazo ya biashara</p>
                    {selected.adviceLoading ? (
                      <p className="mt-2 text-sm text-muted">Inatengeneza ushauri...</p>
                    ) : selected.advice ? (
                      <dl className="mt-2 flex flex-col gap-2.5">
                        {ADVICE_LABELS.map(({ key, label }) => (
                          <div key={key}>
                            <dt className="text-xs font-medium text-muted">{label}</dt>
                            <dd className="text-sm">{selected.advice![key]}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="mt-2 text-sm text-muted">{selected.adviceError}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                {/* Same pill pattern as Build workspace's own Live-panel
                    empty state -- name + action badge -- for one visual
                    language across the WellXAI product family. No literal
                    port here (there's no dev server), just the same shape. */}
                <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-sm font-medium text-foreground">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="text-muted">{GlobeIcon}</span>
                    <span>chackall-tafuta</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted">link</span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-border/60 text-foreground">
                      {PlayIcon}
                    </span>
                  </span>
                </div>
                <p className="mt-4 max-w-xs text-xs text-muted">
                  Andika link ya bidhaa kwenye address bar juu -- itaonekana hapa moja kwa moja.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
