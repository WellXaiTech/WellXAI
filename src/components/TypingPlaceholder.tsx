"use client";

import { useTypewriter } from "@/hooks/useTypewriter";

const DEFAULT_PHRASES = [
  "Ask ChatGiZa anything",
  "Write a short email to a client",
  "Explain quantum computing simply",
  "Plan a 3-day trip to Zanzibar",
  "Summarize this article for me",
];

export default function TypingPlaceholder({
  phrases = DEFAULT_PHRASES,
  className = "",
}: {
  phrases?: string[];
  className?: string;
}) {
  const text = useTypewriter(phrases);

  return (
    <span className={`inline-flex items-center ${className}`}>
      {text}
      <span className="typing-caret ml-0.5" />
    </span>
  );
}
