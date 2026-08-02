"use client";

import { useEffect, useState } from "react";
import { getReferralLink } from "@/lib/referral";

export default function ReferralModal({ code, onClose }: { code: string; onClose: () => void }) {
  const [count, setCount] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  // Starts empty on purpose (must match the server-rendered pass, which has no
  // `window`) and gets filled in by the mount effect below — computing this
  // directly during render caused a hydration mismatch (server fell back to
  // the hardcoded origin, client used the real one).
  const [link, setLink] = useState("");

  useEffect(() => {
    setLink(getReferralLink(code));
  }, [code]);

  useEffect(() => {
    fetch(`/api/referral/count?code=${encodeURIComponent(code)}`)
      .then((res) => res.json())
      .then((data: { count?: number }) => setCount(data.count ?? 0))
      .catch(() => setCount(0));
  }, [code]);

  function copyLink() {
    navigator.clipboard
      .writeText(link)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onClick={onClose}>
      <div className="card w-full max-w-sm rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="glow-badge mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface text-2xl">
          🎁
        </div>
        <h2 className="mb-1 text-center text-base font-semibold">Mwalike rafiki yako</h2>
        <p className="mb-4 text-center text-sm text-muted">
          Shiriki link yako — rafiki yako atapata ujumbe wa ziada wa bure kabla ya kuhitaji kuingia.
          {count !== null && count > 0 ? ` Umeshawaalika watu ${count}.` : ""}
        </p>
        <div className="mb-4 truncate rounded-lg border border-border bg-background px-3 py-2.5 text-xs text-muted">
          {link}
        </div>
        <button
          onClick={copyLink}
          className="btn-primary mb-2 w-full rounded-full py-2.5 text-sm font-medium hover:opacity-85"
        >
          {copied ? "Imenakiliwa ✓" : "Nakili link"}
        </button>
        <button
          onClick={onClose}
          className="w-full rounded-full py-2 text-sm text-muted transition-colors hover:text-foreground"
        >
          Funga
        </button>
      </div>
    </div>
  );
}
