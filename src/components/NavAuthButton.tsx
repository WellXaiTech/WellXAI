"use client";

import { useSession } from "next-auth/react";
import { chatgizaSignOut } from "@/lib/signOutHelper";
import Link from "next/link";

// Matches openai.com's "Log in ⌄" nav pill (outlined, small down-chevron)
// rather than a bare text link.
const ChevronDownIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const pillClass =
  "hidden sm:flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-2";

export default function NavAuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <span className="hidden sm:inline text-sm text-muted">···</span>;
  }

  if (session?.user) {
    return (
      <button onClick={() => chatgizaSignOut()} className={pillClass}>
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.user.image} alt="" className="h-5 w-5 rounded-full" />
        ) : null}
        Log out
      </button>
    );
  }

  return (
    <Link href="/login" className={pillClass}>
      Log in
      {ChevronDownIcon}
    </Link>
  );
}
