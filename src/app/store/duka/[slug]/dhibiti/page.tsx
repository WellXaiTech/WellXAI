import { notFound } from "next/navigation";
import Link from "next/link";
import { getShop, listProducts } from "@/lib/chackallStore";
import DashboardClient from "@/components/store/DashboardClient";
import Logo from "@/components/Logo";

// See src/app/store/page.tsx for why force-dynamic is needed on every page
// reached through proxy.ts's host rewriting.
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { slug } = await params;
  const { token } = await searchParams;
  const shop = await getShop(slug);
  if (!shop) notFound();

  // Gated server-side against the shop's real editToken -- the client
  // component below never has to make that comparison itself, it's just
  // handed a token that's already been confirmed valid.
  if (!token || token !== shop.editToken) {
    return (
      <div className="min-h-full bg-background text-foreground">
        <header className="border-b border-border px-6 py-4">
          <Link href="/">
            <Logo brand="ChackAll" />
          </Link>
        </header>
        <main className="mx-auto max-w-md px-6 py-12 text-center">
          <p className="text-sm text-muted">
            Huna ruhusa ya kudhibiti duka hili. Tumia kiungo (link) ulichopewa ulipofungua duka lako.
          </p>
        </main>
      </div>
    );
  }

  const products = await listProducts(slug);
  return (
    <DashboardClient
      slug={slug}
      token={token}
      shopName={shop.name}
      hasWhatsapp={!!shop.whatsapp}
      initialProducts={products}
    />
  );
}
