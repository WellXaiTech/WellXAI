"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLocalShop, type LocalShop } from "@/lib/chackallLocalShop";

const StoreIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l1-5h16l1 5M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M4 9h16M9 21v-6h6v6" />
  </svg>
);

export default function MyShopLink({ className }: { className?: string }) {
  // null until the effect runs -- localStorage doesn't exist during server
  // rendering, so this only ever resolves on the client, after mount.
  const [shop, setShop] = useState<LocalShop | null>(null);

  useEffect(() => {
    // A one-time read of a browser-only source (localStorage) on mount --
    // the same pattern ChatGizaShell.tsx already uses for its own
    // persisted settings (theme, font, etc).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShop(getLocalShop());
  }, []);

  if (!shop) return null;

  return (
    <Link
      href={`/duka/${shop.slug}/dhibiti?token=${shop.editToken}`}
      className={className ?? "flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"}
    >
      {StoreIcon}
      Duka lako: {shop.name}
    </Link>
  );
}
