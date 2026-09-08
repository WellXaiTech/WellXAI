import Link from "next/link";

const products = [
  {
    href: "/chatgiza",
    title: "ChatGiZa",
    tag: "Chat",
    description:
      "A conversational assistant that can answer questions, write, plan, and think things through with you in Swahili or English.",
  },
  {
    href: "/developers",
    title: "ChatGiZa API",
    tag: "Developers",
    description:
      "Bring ChatGiZa into your own product through a simple REST API.",
  },
  {
    // Its own subdomain (store.wellxai.world), same as the ChatGiZa card
    // above points at chatgiza.com -- both leave this site entirely.
    href: "https://store.wellxai.world",
    title: "ChackAll",
    tag: "Storefront",
    description:
      "A link-aggregator storefront for sellers -- one page for all your products, built to share anywhere.",
  },
  {
    // A real ChatGiZa feature, so it lives on chatgiza.com like the ChatGiZa
    // card above, not on this domain (see src/proxy.ts).
    href: "https://chatgiza.com/ebook",
    title: "E-book",
    tag: "ChatGiZa",
    description:
      "Write, edit, and keep your own e-books, page by page, right inside ChatGiZa.",
  },
  {
    // ?open=media deep-links straight into the media feed panel instead of
    // landing on plain chat (see the matching useEffect in chatgiza/page.tsx).
    href: "https://chatgiza.com/chatgiza?open=media",
    title: "Quantara",
    tag: "ChatGiZa",
    description:
      "ChatGiZa's media feed -- share and discover posts from the community.",
  },
];

export default function ProductsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 w-full">
      <h1 className="text-3xl font-semibold">Products</h1>
      <p className="mt-4 text-muted max-w-xl">
        ChatGiZa — the chat app and the API behind it, in one place.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {products.map((p) => {
          const card = (
            <>
              <span className="text-xs uppercase tracking-wide text-muted">{p.tag}</span>
              <h2 className="mt-2 text-xl font-semibold">{p.title}</h2>
              <p className="mt-3 text-sm text-muted">{p.description}</p>
              <span className="mt-4 inline-block text-sm font-medium group-hover:underline">
                Learn more →
              </span>
            </>
          );
          // Anything that leaves this site entirely (ChatGiZa itself, its
          // sub-features on chatgiza.com, ChackAll's own subdomain) opens in
          // a new tab so wellxai.world stays open, matching how Navbar/Footer
          // already handle this exact same jump elsewhere. "/chatgiza" is
          // proxy.ts-redirected the same way if it's ever used bare.
          return p.href.startsWith("http") || p.href === "/chatgiza" ? (
            <a
              key={p.href}
              href={p.href === "/chatgiza" ? "https://chatgiza.com" : p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="card group rounded-2xl p-6 hover:border-foreground/40 transition-colors"
            >
              {card}
            </a>
          ) : (
            <Link
              key={p.href}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="card group rounded-2xl p-6 hover:border-foreground/40 transition-colors"
            >
              {card}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
