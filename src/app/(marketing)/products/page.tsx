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
];

export default function ProductsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 w-full">
      <h1 className="text-3xl font-semibold">Products</h1>
      <p className="mt-4 text-muted max-w-xl">
        ChatGiZa — the chat app and the API behind it, in one place.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {products.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="card group rounded-2xl p-6 hover:border-foreground/40 transition-colors"
          >
            <span className="text-xs uppercase tracking-wide text-muted">{p.tag}</span>
            <h2 className="mt-2 text-xl font-semibold">{p.title}</h2>
            <p className="mt-3 text-sm text-muted">{p.description}</p>
            <span className="mt-4 inline-block text-sm font-medium group-hover:underline">
              Learn more →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
