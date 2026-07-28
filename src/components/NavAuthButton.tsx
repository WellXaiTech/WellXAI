"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function NavAuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <span className="hidden sm:inline text-sm text-muted">···</span>;
  }

  if (session?.user) {
    return (
      <button
        onClick={() => signOut()}
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
    <button
      onClick={() => signIn("google", undefined, { prompt: "select_account" })}
      className="hidden sm:inline text-sm text-muted hover:text-foreground"
    >
      Log in
    </button>
  );
}
