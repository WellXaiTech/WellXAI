"use client";

import { useEffect, useState } from "react";

const IMAGE_PHRASES = ["Creating image", "Adding details", "Refining composition", "Almost ready"];

export default function GeneratingMediaPlaceholder({
  kind,
  progress,
}: {
  kind: "image" | "video";
  progress?: number;
}) {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    if (kind !== "image") return;
    const id = setInterval(() => setPhraseIndex((i) => (i + 1) % IMAGE_PHRASES.length), 1800);
    return () => clearInterval(id);
  }, [kind]);

  const title = kind === "image" ? IMAGE_PHRASES[phraseIndex] : `Generating video… ${progress ?? 0}%`;

  return (
    <div className="relative aspect-[3/2] w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface-2 sm:max-w-2xl">
      <div className="dot-grid-shimmer absolute inset-0" />
      <span className="absolute left-4 top-4 text-sm font-medium text-foreground">{title}</span>
    </div>
  );
}
