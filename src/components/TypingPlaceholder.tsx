"use client";

import { useEffect, useState } from "react";

const DEFAULT_PHRASES = [
  "Ask ChatGiZa anything",
  "Write a short email to a client",
  "Explain quantum computing simply",
  "Plan a 3-day trip to Zanzibar",
  "Summarize this article for me",
  "Draft a business proposal",
  "Debug this piece of code",
  "Niandikie barua ya kazi",
  "Eleza dhana hii kwa urahisi",
  "Nisaidie kupanga bajeti yangu",
  "Écris un poème court",
  "Explique-moi ce concept",
  "Resume este documento",
  "Ayúdame a planear un viaje",
  "Create a logo for my startup",
  "Analyze this data for trends",
];

export default function TypingPlaceholder({
  phrases = DEFAULT_PHRASES,
  className = "",
}: {
  phrases?: string[];
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const holdTime = 2200;
    const fadeTime = 300;
    let fadeOutTimer: ReturnType<typeof setTimeout>;

    const holdTimer = setTimeout(() => {
      setVisible(false);
      fadeOutTimer = setTimeout(() => {
        setIndex((i) => (i + 1) % phrases.length);
        setVisible(true);
      }, fadeTime);
    }, holdTime);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(fadeOutTimer);
    };
  }, [index, phrases.length]);

  return (
    <span
      className={`inline-block transition-opacity duration-300 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      } ${className}`}
    >
      {phrases[index % phrases.length]}
    </span>
  );
}
