import Link from "next/link";
import Logo from "@/components/Logo";
import MyShopLink from "@/components/store/MyShopLink";

// Reached by proxy.ts rewriting "/" here on store.wellxai.world.
// force-dynamic for the same reason as src/app/support/page.tsx: without
// it, Vercel's edge CDN can cache this response and serve it back for
// other hosts' "/" requests too, since the cache key doesn't vary by Host
// by default.
export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Logo brand="ChackAll" />
        <MyShopLink />
      </header>

      <main className="mx-auto flex max-w-3xl flex-col items-center px-6 py-20 text-center">
        <h1 className="heading">Duka lako, kwa wateja duniani kote</h1>
        <p className="mt-3 max-w-lg text-sm text-muted">
          Fungua duka lako mwenyewe, au bandika link ya bidhaa yoyote kutoka Amazon, Alibaba, eBay, Shopify na
          zaidi -- ChackAll inasoma bei, picha, na kukupa mawazo ya biashara papo hapo.
        </p>

        <div className="mt-8 grid w-full gap-4 sm:grid-cols-2">
          <Link
            href="/duka"
            className="rounded-xl border border-border bg-surface-2 p-6 text-left transition-colors hover:bg-border"
          >
            <p className="font-medium">Fungua duka lako</p>
            <p className="mt-1 text-sm text-muted">Ongeza bidhaa zako, pata link ya duka la kushiriki na wateja.</p>
          </Link>
          <Link
            href="/tafuta"
            className="rounded-xl border border-border bg-surface-2 p-6 text-left transition-colors hover:bg-border"
          >
            <p className="font-medium">Weka link ya bidhaa</p>
            <p className="mt-1 text-sm text-muted">Bandika link kutoka duka lolote la mtandaoni, tazama taarifa zake.</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
