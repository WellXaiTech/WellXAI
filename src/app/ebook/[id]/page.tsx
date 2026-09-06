"use client";

import { use } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import EbookEditor from "@/components/EbookEditor";

export default function EbookEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: ebookId } = use(params);
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
    <div className="h-screen bg-background">
      <EbookEditor ebookId={ebookId} onBack={() => router.push("/ebook")} />
    </div>
  );
}
