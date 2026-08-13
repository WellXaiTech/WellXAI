"use client";

import { Suspense, useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { COUNTRIES, COUNTRY_CODES } from "@/lib/countries";
import { LANGUAGES } from "@/components/LanguagePanel";

type Ad = {
  id: string;
  headline: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  countries: string[];
  language: string;
  durationSeconds: number;
  status: "pending_payment" | "pending_review" | "approved" | "rejected";
  createdAt: number;
  startsAt: number | null;
  expiresAt: number | null;
  rejectionReason: string | null;
  priceCents: number | null;
};

// Must match PRICE_TABLE_CENTS in src/lib/ads.ts -- kept here too so the
// price can be shown before the user submits, without an extra round trip.
const DURATION_OPTIONS = [
  { label: "5 minutes", seconds: 5 * 60, priceCents: 200 },
  { label: "15 minutes", seconds: 15 * 60, priceCents: 500 },
  { label: "30 minutes", seconds: 30 * 60, priceCents: 900 },
  { label: "1 hour", seconds: 60 * 60, priceCents: 1500 },
  { label: "6 hours", seconds: 6 * 60 * 60, priceCents: 6000 },
  { label: "24 hours", seconds: 24 * 60 * 60, priceCents: 18000 },
  { label: "7 days", seconds: 7 * 24 * 60 * 60, priceCents: 90000 },
];

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusLabel(ad: Ad, nowMs: number): string {
  if (ad.status === "approved" && ad.expiresAt !== null && ad.expiresAt <= nowMs) return "Expired";
  if (ad.status === "pending_payment") return "Awaiting payment";
  if (ad.status === "pending_review") return "Pending review";
  if (ad.status === "approved") return "Live";
  if (ad.status === "rejected") return "Rejected";
  return ad.status;
}

function statusColor(label: string): string {
  if (label === "Live") return "text-green-500";
  if (label === "Pending review" || label === "Awaiting payment") return "text-yellow-500";
  if (label === "Rejected") return "text-red-500";
  return "text-muted";
}

function AdvertisePageInner() {
  const { status } = useSession();
  const searchParams = useSearchParams();
  const [ads, setAds] = useState<Ad[] | null>(null);
  const [nowMs] = useState(() => Date.now());
  const [headline, setHeadline] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [language, setLanguage] = useState(LANGUAGES.includes("English") ? "English" : LANGUAGES[0]);
  const [durationSeconds, setDurationSeconds] = useState(DURATION_OPTIONS[2].seconds);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function reload() {
    fetch("/api/ads")
      .then((r) => r.json())
      .then((data) => setAds(data.ads ?? []))
      .catch(() => setError("Couldn't load your ads"));
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    reload();
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const adSessionId = searchParams.get("ad_session_id");
    const cancelled = searchParams.get("ad_cancelled");
    if (!adSessionId && !cancelled) return;
    window.history.replaceState(null, "", "/advertise");

    if (cancelled) {
      Promise.resolve().then(() => setNotice("Payment cancelled -- your ad was not submitted."));
      return;
    }
    fetch(`/api/ads/checkout/verify?session_id=${encodeURIComponent(adSessionId!)}`)
      .then((r) => r.json())
      .then((data: { paid?: boolean }) => {
        setNotice(
          data.paid
            ? "Payment received -- your ad is now waiting for review."
            : "We couldn't confirm your payment yet. If you were charged, contact support."
        );
        reload();
      })
      .catch(() => setNotice("We couldn't confirm your payment yet. If you were charged, contact support."));
  }, [status, searchParams]);

  function toggleCountry(code: string) {
    setSelectedCountries((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  async function handleCreate() {
    if (!headline.trim() || !subtitle.trim() || selectedCountries.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: headline.trim(),
          subtitle: subtitle.trim(),
          imageUrl: imageUrl.trim(),
          linkUrl: linkUrl.trim(),
          countries: selectedCountries,
          language,
          durationSeconds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create ad");
      if (!data.checkoutUrl) throw new Error("No checkout URL returned");
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ad");
      setBusy(false);
    }
  }

  const selectedDuration = DURATION_OPTIONS.find((opt) => opt.seconds === durationSeconds) ?? DURATION_OPTIONS[0];

  if (status === "loading" || (status === "authenticated" && ads === null)) {
    return <div className="mx-auto max-w-2xl px-4 py-16 w-full" />;
  }

  if (status !== "authenticated") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 w-full">
        <h1 className="text-3xl font-semibold">Advertise on ChatGiZa</h1>
        <p className="mt-3 text-muted">Sign in to create an ad campaign.</p>
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
      <h1 className="text-3xl font-semibold">Advertise on ChatGiZa</h1>
      <p className="mt-3 text-muted">
        Your ad appears in the Events carousel, targeted to the countries you choose, for the duration you pay for.
        Every ad is reviewed before it goes live -- your live window starts once it&apos;s approved, not at payment.
      </p>

      {notice && <p className="mt-4 text-sm text-green-500">{notice}</p>}
      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

      <div className="mt-8 card rounded-2xl p-6 space-y-3">
        <h2 className="text-lg font-semibold">New ad</h2>
        <input
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="Headline"
          maxLength={500}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
        />
        <input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Subtitle"
          maxLength={500}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
        />
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Image URL (optional)"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
        />
        <input
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="Link URL (optional)"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
        />

        <div>
          <p className="mb-1 text-xs text-muted">Language</p>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-1 text-xs text-muted">Duration</p>
          <select
            value={durationSeconds}
            onChange={(e) => setDurationSeconds(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
          >
            {DURATION_OPTIONS.map((opt) => (
              <option key={opt.seconds} value={opt.seconds}>
                {opt.label} — {formatUsd(opt.priceCents)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-1 text-xs text-muted">
            Countries {selectedCountries.length > 0 && `(${selectedCountries.length} selected)`}
          </p>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-border p-2 grid grid-cols-2 gap-1">
            {COUNTRIES.map((name) => {
              const code = COUNTRY_CODES[name];
              const checked = selectedCountries.includes(code);
              return (
                <label key={code} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={checked} onChange={() => toggleCountry(code)} />
                  {name}
                </label>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={busy || !headline.trim() || !subtitle.trim() || selectedCountries.length === 0}
          className="w-full rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {busy ? "Redirecting to payment..." : `Pay ${formatUsd(selectedDuration.priceCents)} & submit`}
        </button>
      </div>

      <h2 className="mt-10 text-lg font-semibold">Your ads</h2>
      {ads && ads.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No ads yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {ads?.map((ad) => {
            const label = statusLabel(ad, nowMs);
            return (
              <li key={ad.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{ad.headline}</p>
                    <p className="text-xs text-muted truncate">{ad.subtitle}</p>
                    <p className="mt-1 text-xs text-muted">
                      {ad.countries.join(", ")} · {ad.language}
                      {ad.priceCents !== null && ` · ${formatUsd(ad.priceCents)}`}
                    </p>
                    {ad.rejectionReason && <p className="mt-1 text-xs text-red-500">Reason: {ad.rejectionReason}</p>}
                  </div>
                  <span className={`shrink-0 text-xs font-medium ${statusColor(label)}`}>{label}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function AdvertisePage() {
  return (
    <Suspense>
      <AdvertisePageInner />
    </Suspense>
  );
}
