"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import EbookLibrary, { type Ebook } from "@/components/EbookLibrary";

const BackIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export default function EbookPage() {
  const { status: authStatus } = useSession();
  const signedIn = authStatus === "authenticated";
  const router = useRouter();

  if (authStatus === "loading") {
    return <div className="min-h-screen bg-background" />;
  }

  if (!signedIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
        <Logo />
        <p className="text-sm text-muted">Sign in to write and keep your own e-books.</p>
        <Link href="/login" className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
        <Link
          href="/chatgiza"
          aria-label="Back to chat"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          {BackIcon}
        </Link>
        <Logo />
      </header>
      <div className="min-h-0 flex-1">
        <EbookLibrary onOpenBook={(book: Ebook) => router.push(`/ebook/${book.id}`)} />
      </div>
    </div>
  );
}
