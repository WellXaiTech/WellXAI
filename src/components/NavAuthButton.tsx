"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function NavAuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <span className="hidden sm:inline text-sm text-muted">···</span>;
  }

  if (session?.user) {
    return (
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="hidden items-center gap-2 text-sm text-muted hover:text-foreground sm:flex"
      >
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.user.image} alt="" className="h-6 w-6 rounded-full" />
        ) : null}
        Log out
      </button>
    );
  }

  return (
    <Link href="/login" className="hidden sm:inline text-sm text-muted hover:text-foreground">
      Log in
    </Link>
  );
}
