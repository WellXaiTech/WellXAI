"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";

type Ad = {
  id: string;
  advertiserEmail: string;
  headline: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  countries: string[];
  durationSeconds: number;
  status: "pending_payment" | "pending_review" | "approved" | "rejected";
  createdAt: number;
  expiresAt: number | null;
  rejectionReason: string | null;
};

function formatDuration(seconds: number): string {
  if (seconds % 86400 === 0) return `${seconds / 86400}d`;
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds % 60 === 0) return `${seconds / 60}m`;
  return `${seconds}s`;
}

export default function AdvertiseAdminPage() {
  const { data: session, status } = useSession();
  const [ads, setAds] = useState<Ad[] | null>(null);
  const [notAuthorized, setNotAuthorized] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/ads/admin")
      .then(async (r) => {
        if (r.status === 403) {
          setNotAuthorized(true);
          return;
        }
        const data = await r.json();
        setAds(data.ads ?? []);
      })
      .catch(() => setError("Couldn't load ads"));
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    load();
  }, [status]);

  async function review(id: string, action: "approve" | "reject") {
    const rejectionReason =
      action === "reject" ? window.prompt("Reason for rejecting (optional)") ?? "" : "";
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/ads/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, rejectionReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setAds((prev) => prev?.map((a) => (a.id === id ? data.ad : a)) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update ad");
    } finally {
      setBusyId(null);
    }
  }

  if (status === "loading" || (status === "authenticated" && ads === null && !notAuthorized)) {
    return <div className="mx-auto max-w-3xl px-4 py-16 w-full" />;
  }

  if (status !== "authenticated") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 w-full">
        <h1 className="text-3xl font-semibold">Ads admin</h1>
        <p className="mt-3 text-muted">Sign in with an admin account.</p>
        <button
          onClick={() => signIn("google")}
          className="mt-4 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity"
        >
          Sign in
        </button>
      </div>
    );
  }

  if (notAuthorized) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 w-full">
        <h1 className="text-3xl font-semibold">Ads admin</h1>
        <p className="mt-3 text-muted">{session?.user?.email} isn&apos;t authorized to review ads.</p>
      </div>
    );
  }

  // pending_payment ads haven't been paid for yet -- not admin's concern
  // until checkout completes and they land in pending_review.
  const pending = ads?.filter((a) => a.status === "pending_review") ?? [];
  const reviewed = ads?.filter((a) => a.status === "approved" || a.status === "rejected") ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 w-full">
      <h1 className="text-3xl font-semibold">Ads admin</h1>
      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

      <h2 className="mt-8 text-lg font-semibold">Pending review ({pending.length})</h2>
      {pending.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Nothing waiting.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {pending.map((ad) => (
            <li key={ad.id} className="rounded-xl border border-border p-3">
              <p className="text-sm font-medium">{ad.headline}</p>
              <p className="text-xs text-muted">{ad.subtitle}</p>
              <p className="mt-1 text-xs text-muted">
                {ad.advertiserEmail} · {ad.countries.join(", ")} · {formatDuration(ad.durationSeconds)}
              </p>
              {ad.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ad.imageUrl} alt="" className="mt-2 h-24 w-full rounded-lg object-cover" />
              )}
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => review(ad.id, "approve")}
                  disabled={busyId === ad.id}
                  className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => review(ad.id, "reject")}
                  disabled={busyId === ad.id}
                  className="rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-surface-2 transition-colors disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 text-lg font-semibold">Reviewed ({reviewed.length})</h2>
      <ul className="mt-3 space-y-2">
        {reviewed.map((ad) => (
          <li key={ad.id} className="rounded-xl border border-border p-3">
            <p className="text-sm font-medium">{ad.headline}</p>
            <p className="text-xs text-muted">
              {ad.status === "approved" ? "Approved" : "Rejected"} · {ad.advertiserEmail}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
