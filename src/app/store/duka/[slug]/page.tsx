import { notFound } from "next/navigation";
import Link from "next/link";
import { getShop, listProducts } from "@/lib/chackallStore";
import Logo from "@/components/Logo";

// See src/app/store/page.tsx for why force-dynamic is needed on every page
// reached through proxy.ts's host rewriting.
export const dynamic = "force-dynamic";

function waLink(whatsapp: string, productName: string): string {
  const text = encodeURIComponent(`Habari, nataka kuuliza kuhusu: ${productName}`);
  return `https://wa.me/${whatsapp}?text=${text}`;
}

function mailLink(email: string, productName: string): string {
  const subject = encodeURIComponent(`Kuhusu: ${productName}`);
  const body = encodeURIComponent(`Habari, nataka kuuliza kuhusu: ${productName}`);
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shop = await getShop(slug);
  if (!shop) notFound();

  const products = await listProducts(slug);

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-border px-6 py-4">
        <Link href="/">
          <Logo brand="ChackAll" />
        </Link>
      </header>

      {/* A real-store banner strip, not just a plain page title -- the
          closest thing to Amazon's own storefront header without a fake
          search bar (there's nothing to search across yet). */}
      <div className="border-b border-border bg-surface-2 px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="heading">{shop.name}</h1>
          <p className="mt-1 text-sm text-muted">{products.length} bidhaa</p>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {products.length === 0 && <p className="text-sm text-muted">Duka hili bado halina bidhaa.</p>}

        {/* An actual product grid -- many compact tiles per row, the same
            "square image, two-line title, price, buy action" pattern real
            storefronts (Amazon included) use, not one giant stacked card
            per product. */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 md:gap-5">
          {products.map((p) => (
            <div key={p.id} className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface-2">
              <div className="flex aspect-square w-full items-center justify-center bg-background">
                {p.video ? (
                  <video src={p.video} controls playsInline className="h-full w-full bg-black object-contain" />
                ) : p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- arbitrary seller-supplied image
                  <img src={p.image} alt={p.name} className="h-full w-full object-contain" />
                ) : (
                  <span className="text-xs text-muted">Hakuna picha</span>
                )}
              </div>

              <div className="flex flex-1 flex-col p-3">
                <p className="line-clamp-2 text-sm">{p.name}</p>
                <p className="mt-1 text-base font-semibold">{p.price}</p>
                {p.description && <p className="mt-1 line-clamp-2 text-xs text-muted">{p.description}</p>}

                <div className="mt-auto flex flex-col gap-1.5 pt-3">
                  <a
                    href={mailLink(shop.email, p.name)}
                    className="rounded-md bg-foreground px-3 py-1.5 text-center text-xs font-medium text-background"
                  >
                    Tuma barua pepe
                  </a>
                  {shop.whatsapp && (
                    <a
                      href={waLink(shop.whatsapp, p.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md border border-border px-3 py-1.5 text-center text-xs font-medium"
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
