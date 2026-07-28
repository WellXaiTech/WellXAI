"use client";

import { useEffect, useState } from "react";

export function useTypewriter(
  phrases: string[],
  options?: { typingSpeed?: number; deletingSpeed?: number; pauseTime?: number }
) {
  const { typingSpeed = 55, deletingSpeed = 30, pauseTime = 1400 } = options ?? {};
  const [text, setText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[phraseIndex % phrases.length];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && text.length < current.length) {
      timeout = setTimeout(() => setText(current.slice(0, text.length + 1)), typingSpeed);
    } else if (!deleting && text.length === current.length) {
      timeout = setTimeout(() => setDeleting(true), pauseTime);
    } else if (deleting && text.length > 0) {
      timeout = setTimeout(() => setText(current.slice(0, text.length - 1)), deletingSpeed);
    } else {
      setDeleting(false);
      setPhraseIndex((i) => (i + 1) % phrases.length);
    }

    return () => clearTimeout(timeout);
  }, [text, deleting, phraseIndex, phrases, typingSpeed, deletingSpeed, pauseTime]);

  return text;
}
