"use client";

import { useState } from "react";
import { PLAN_DETAILS, PLAN_TIERS, type PlanTier } from "@/lib/plans";

const BackIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const CheckIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export default function UpgradePlanPanel({
  onClose,
  currentTier,
}: {
  onClose: () => void;
  currentTier: PlanTier | null;
}) {
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe(tier: PlanTier) {
    setError(null);
    setLoadingTier(tier);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Could not start checkout");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout");
      setLoadingTier(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4 sm:px-10">
        <button
          onClick={onClose}
          aria-label="Close Upgrade plan"
          className="rounded-full p-2 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          {BackIcon}
        </button>
        <h1 className="font-serif text-2xl">Upgrade plan</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <p className="mb-6 text-sm text-muted">
            Choose the plan that fits how you use ChatGiZa. You can change or cancel anytime.
          </p>

          {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {PLAN_TIERS.map((tier) => {
              const details = PLAN_DETAILS[tier];
              const isCurrent = currentTier === tier;
              return (
                <div
                  key={tier}
                  className={`flex flex-col rounded-2xl border p-5 ${
                    isCurrent ? "border-foreground" : "border-border"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-semibold">{details.name}</span>
                    {isCurrent && (
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-muted">
                        Current plan
                      </span>
                    )}
                  </div>
                  <div className="mb-4">
                    <span className="text-3xl font-semibold">${details.priceUsd}</span>
                    <span className="text-sm text-muted"> / month</span>
                  </div>
                  <ul className="mb-6 flex-1 space-y-2">
                    {details.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-muted">
                        <span className="mt-0.5 text-foreground/70">{CheckIcon}</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleSubscribe(tier)}
                    disabled={isCurrent || loadingTier !== null}
                    className="btn-primary rounded-full px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isCurrent
                      ? "Current plan"
                      : loadingTier === tier
                        ? "Redirecting…"
                        : "Subscribe"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
