"use client";

import { useEffect } from "react";

export default function CelebrationToast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 4200);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex justify-center px-4 sm:bottom-8">
      <div className="celebration-pop pointer-events-auto rounded-full border border-border bg-surface px-5 py-3 text-sm font-medium text-foreground shadow-2xl">
        {message}
      </div>
    </div>
  );
}
