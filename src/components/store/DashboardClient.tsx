"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";

type Product = {
  id: string;
  name: string;
  price: string;
  image: string | null;
  video: string | null;
  description: string | null;
  createdAt: number;
};

const CheckIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const StoreIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l1-5h16l1 5M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M4 9h16M9 21v-6h6v6" />
  </svg>
);
const HomeIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
    <path d="M9 22V12h6v10" />
  </svg>
);
const ExternalLinkIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <path d="M15 3h6v6M10 14 21 3" />
  </svg>
);

export default function DashboardClient({
  slug,
  token,
  shopName,
  hasWhatsapp,
  initialProducts,
}: {
  slug: string;
  token: string;
  shopName: string;
  hasWhatsapp: boolean;
  initialProducts: Product[];
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [productLink, setProductLink] = useState("");
  const [unfurling, setUnfurling] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shopUrl = `https://store.wellxai.world/duka/${slug}`;

  // Real, checkable steps only -- no fabricated 8-step checklist, just
  // what ChackAll actually has: a shop always exists once this dashboard
  // is reachable, so that step starts checked.
  const steps = [
    { label: "Fungua duka", done: true },
    { label: "Ongeza bidhaa ya kwanza", done: products.length > 0 },
    { label: "Weka namba ya WhatsApp (hiari)", done: hasWhatsapp },
    { label: "Shiriki link ya duka lako", done: copied },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  function copyShopLink() {
    navigator.clipboard.writeText(shopUrl).catch(() => {});
    setCopied(true);
  }

  async function handleAutofill() {
    const url = productLink.trim();
    if (!url || unfurling) return;
    setUnfurling(true);
    setError(null);
    try {
      const res = await fetch("/api/store/unfurl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Imeshindwa kusoma link hii.");
      if (data.title) setName(data.title);
      if (data.description) setDescription(data.description);
      // The seller can still edit this -- it's a starting point read from
      // the source page's own price, not locked in.
      if (data.price) setPrice(data.price);
      setImage(data.image ?? null);
      setVideo(data.video ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Imeshindwa kusoma link hii.");
    } finally {
      setUnfurling(false);
    }
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/store/shops/${slug}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, price, description, image, video }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Imeshindwa kuongeza bidhaa.");
      setProducts((prev) => [data.product, ...prev]);
      setProductLink("");
      setName("");
      setPrice("");
      setDescription("");
      setImage(null);
      setVideo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Imeshindwa kuongeza bidhaa.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(productId: string) {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    try {
      const res = await fetch(`/api/store/shops/${slug}/products/${productId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Best-effort UI removal; refetch on next visit will resync if this
      // silently failed server-side.
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Persistent sidebar -- same shape as a real seller-dashboard app
          (nav on the left, content on the right), not just a plain
          top-only header. */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-border p-4">
        <Link href="/" className="px-2">
          <Logo brand="ChackAll" />
        </Link>
        <nav className="mt-8 flex flex-col gap-1">
          <span className="flex items-center gap-2.5 rounded-lg bg-surface-2 px-3 py-2 text-sm font-medium">
            {StoreIcon}
            Dashibodi
          </span>
          <a
            href={shopUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            {ExternalLinkIcon}
            Duka langu
          </a>
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            {HomeIcon}
            Nyumbani
          </Link>
        </nav>
      </aside>

      <main className="min-h-0 flex-1 overflow-y-auto px-8 py-10">
        <div className="mx-auto max-w-2xl">
          <h1 className="heading">Habari, {shopName}!</h1>

          <div className="mt-6 rounded-xl border border-border bg-surface-2 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Anza kuuza na ChackAll</p>
              <p className="text-xs text-muted">
                {doneCount} ya {steps.length} imekamilika
              </p>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-foreground transition-all"
                style={{ width: `${(doneCount / steps.length) * 100}%` }}
              />
            </div>

            <ul className="mt-4 flex flex-col gap-2">
              {steps.map((s) => (
                <li key={s.label} className="flex items-center gap-2.5 text-sm">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      s.done ? "bg-foreground text-background" : "border border-border text-transparent"
                    }`}
                  >
                    {CheckIcon}
                  </span>
                  <span className={s.done ? "text-muted line-through" : ""}>{s.label}</span>
                  {s.label === "Shiriki link ya duka lako" && !copied && (
                    <button
                      type="button"
                      onClick={copyShopLink}
                      className="ml-auto shrink-0 rounded-md border border-border px-2.5 py-1 text-xs font-medium"
                    >
                      Nakili
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleAddProduct} className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-4">
            <p className="text-sm font-medium">Ongeza bidhaa</p>

            <div className="flex gap-2">
              <input
                value={productLink}
                onChange={(e) => setProductLink(e.target.value)}
                placeholder="Bandika link ya bidhaa (hiari) -- itajaza jina/picha kiotomatiki"
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-foreground"
              />
              <button
                type="button"
                onClick={handleAutofill}
                disabled={unfurling || !productLink.trim()}
                className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-40"
              >
                {unfurling ? "..." : "Jaza"}
              </button>
            </div>

            {image && (
              // eslint-disable-next-line @next/next/no-img-element -- preview of an auto-filled remote image
              <img src={image} alt="" className="h-32 w-full rounded-lg bg-background object-contain" />
            )}

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jina la bidhaa"
              required
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-foreground"
            />
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Bei (mfano: TSh 45,000)"
              required
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-foreground"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Maelezo (hiari)"
              rows={2}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-foreground"
            />

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={saving || !name.trim() || !price.trim()}
              className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-40"
            >
              {saving ? "Inaongeza..." : "Ongeza bidhaa"}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-3">
            {products.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-3">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- seller-supplied product image
                  <img src={p.image} alt={p.name} className="h-14 w-14 shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-border text-xs text-muted">
                    --
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted">{p.price}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs text-red-500"
                >
                  Futa
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
