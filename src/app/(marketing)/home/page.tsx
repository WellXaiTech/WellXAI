import Link from "next/link";

const sections: { title: string; description: string; href: string }[] = [
  {
    title: "Research",
    description: "How we make conversational AI more useful, affordable, and safe.",
    href: "/research",
  },
  {
    title: "Products",
    description: "ChatGiZa, the app, and the API behind it.",
    href: "/products",
  },
  {
    title: "Business",
    description: "Bring ChatGiZa and its API into your company.",
    href: "/business",
  },
  {
    title: "Developers",
    description: "Build on top of ChatGiZa with a simple API.",
    href: "/developers",
  },
  {
    title: "Company",
    description: "Who we are and how WellXAI is structured.",
    href: "/company",
  },
  {
    title: "Foundation",
    description: "Our commitment to accessible, transparent AI.",
    href: "/foundation",
  },
  {
    title: "Help Center",
    description: "Answers to common questions about WellXAI and ChatGiZa.",
    href: "https://support.wellxai.world",
  },
];

export default function HomePage() {
  return (
    <div className="w-full">
      <section className="mx-auto max-w-5xl px-4 pt-20 pb-16 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          AI that understands the language you speak
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-muted sm:text-lg">
          WellXAI builds ChatGiZa — bringing world-class AI closer to people, in the
          language they understand, at a price they can afford, and built with
          transparency.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://chatgiza.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary rounded-full px-6 py-3 text-sm font-medium transition-opacity hover:opacity-85"
          >
            Try ChatGiZa
          </a>
          <Link
            href="/company"
            className="rounded-full border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-surface-2"
          >
            About WellXAI
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <a
          href="https://chatgiza.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex h-64 items-center justify-center overflow-hidden rounded-3xl border border-border bg-surface sm:h-80"
        >
          <div className="hero-shimmer-bg" style={{ position: "absolute" }} />
          <span className="glow-badge relative z-10 rounded-full px-10 py-4 text-5xl font-extrabold tracking-tight sm:text-7xl">
            ChatGiZa
          </span>
          <span className="absolute bottom-6 right-8 z-10 text-sm font-medium text-muted transition-colors group-hover:text-foreground">
            Try it →
          </span>
        </a>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) =>
            // Help Center is its own site (support.wellxai.world) -- a new
            // tab keeps this page open, same as the ChatGiZa banner above.
            s.href.startsWith("https://") ? (
              <a
                key={s.href}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="card group rounded-2xl p-6 transition-colors hover:border-foreground/40"
              >
                <h2 className="text-lg font-semibold">{s.title}</h2>
                <p className="mt-2 text-sm text-muted">{s.description}</p>
                <span className="mt-4 inline-block text-sm font-medium group-hover:underline">
                  Learn more →
                </span>
              </a>
            ) : (
              <Link
                key={s.href}
                href={s.href}
                className="card group rounded-2xl p-6 transition-colors hover:border-foreground/40"
              >
                <h2 className="text-lg font-semibold">{s.title}</h2>
                <p className="mt-2 text-sm text-muted">{s.description}</p>
                <span className="mt-4 inline-block text-sm font-medium group-hover:underline">
                  Learn more →
                </span>
              </Link>
            )
          )}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-24">
        <div className="card rounded-2xl p-8 text-center sm:p-12">
          <h2 className="text-xl font-semibold sm:text-2xl">
            Want to bring ChatGiZa to your company?
          </h2>
          <p className="mt-2 text-sm text-muted">
            Email <span className="text-foreground">hello@chatgiza.com</span> and our
            team will get back to you.
          </p>
        </div>
      </section>
    </div>
  );
}
