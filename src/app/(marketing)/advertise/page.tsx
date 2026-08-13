"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { COUNTRIES, COUNTRY_CODES } from "@/lib/countries";

type Ad = {
  id: string;
  headline: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  countries: string[];
  durationSeconds: number;
  status: "pending_review" | "approved" | "rejected";
  createdAt: number;
  startsAt: number | null;
  expiresAt: number | null;
  rejectionReason: string | null;
};

const DURATION_OPTIONS = [
  { label: "5 minutes", seconds: 5 * 60 },
  { label: "15 minutes", seconds: 15 * 60 },
  { label: "30 minutes", seconds: 30 * 60 },
  { label: "1 hour", seconds: 60 * 60 },
  { label: "6 hours", seconds: 6 * 60 * 60 },
  { label: "24 hours", seconds: 24 * 60 * 60 },
  { label: "7 days", seconds: 7 * 24 * 60 * 60 },
];

function statusLabel(ad: Ad, nowMs: number): string {
  if (ad.status === "approved" && ad.expiresAt !== null && ad.expiresAt <= nowMs) return "Expired";
  if (ad.status === "pending_review") return "Pending review";
  if (ad.status === "approved") return "Live";
  if (ad.status === "rejected") return "Rejected";
  return ad.status;
}

function statusColor(label: string): string {
  if (label === "Live") return "text-green-500";
  if (label === "Pending review") return "text-yellow-500";
  if (label === "Rejected") return "text-red-500";
  return "text-muted";
}

export default function AdvertisePage() {
  const { status } = useSession();
  const [ads, setAds] = useState<Ad[] | null>(null);
  const [nowMs] = useState(() => Date.now());
  const [headline, setHeadline] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [durationSeconds, setDurationSeconds] = useState(DURATION_OPTIONS[2].seconds);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/ads")
      .then((r) => r.json())
      .then((data) => setAds(data.ads ?? []))
      .catch(() => setError("Couldn't load your ads"));
  }, [status]);

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
          durationSeconds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create ad");
      setAds((prev) => [data.ad, ...(prev ?? [])]);
      setHeadline("");
      setSubtitle("");
      setImageUrl("");
      setLinkUrl("");
      setSelectedCountries([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ad");
    } finally {
      setBusy(false);
    }
  }

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
        Every ad is reviewed before it goes live.
      </p>

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
          <p className="mb-1 text-xs text-muted">Duration</p>
          <select
            value={durationSeconds}
            onChange={(e) => setDurationSeconds(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
          >
            {DURATION_OPTIONS.map((opt) => (
              <option key={opt.seconds} value={opt.seconds}>
                {opt.label}
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
          Submit for review
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
                    <p className="mt-1 text-xs text-muted">{ad.countries.join(", ")}</p>
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
