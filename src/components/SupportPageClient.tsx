"use client";

import { useMemo, useState, type ReactElement } from "react";
import Logo from "@/components/Logo";

type Article = { question: string; answer: string };
type Category = { title: string; description: string; icon: ReactElement; articles: Article[] };

// Shared icon for Getting Started / ChatGiZa App / Contact -- Business & API
// and Privacy & Legal deliberately keep their own distinct icons instead.
const IconFolder = (
  <svg width="24" height="24" viewBox="0 0 512 512">
    <path d="M0 0h512v512H0z" fill="none" />
    <path
      fill="currentColor"
      d="M251.7 127.6c10.5 10.5 24.7 16.4 39.6 16.4H448c8.8 0 16 7.2 16 16v32H48V96c0-8.8 7.2-16 16-16h133.5c4.2 0 8.3 1.7 11.3 4.7l33.9-33.9l-33.9 33.9zM48 240h416v176c0 8.8-7.2 16-16 16H64c-8.8 0-16-7.2-16-16zM285.7 93.7l-43-43c-12-12-28.3-18.7-45.3-18.7H64C28.7 32 0 60.7 0 96v320c0 35.3 28.7 64 64 64h384c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H291.3c-2.1 0-4.2-.8-5.7-2.3z"
    />
  </svg>
);
const IconGettingStarted = IconFolder;
const IconChat = IconFolder;
const IconBusiness = (
  <svg width="24" height="24" viewBox="0 0 24 24">
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M8 21a2 2 0 0 0 2-2v-8a4 4 0 0 0-8 0v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8a4 4 0 0 0-4-4H6m-4 6h20" />
    </g>
  </svg>
);
const IconPrivacy = (
  <svg width="24" height="24" viewBox="0 0 24 24">
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M12 12h.01M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2m14 7a18.15 18.15 0 0 1-20 0" />
      <rect width="20" height="14" x="2" y="6" rx="2" />
    </g>
  </svg>
);
const IconContact = IconFolder;
const SearchIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const GlobeIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
  </svg>
);
const BackIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 12H5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m12 19-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// The category grid is meant to grow -- more categories get added here over
// time as more of the product gets documented, same way help.openai.com's
// grid covers many products.
const categories: Category[] = [
  {
    title: "Getting Started",
    description: "What WellXAI and ChatGiZa are, and whether it's free.",
    icon: IconGettingStarted,
    articles: [
      {
        question: "What is WellXAI?",
        answer:
          "WellXAI is the company behind ChatGiZa. We build AI that's closer to people — in the language they understand, at a price they can afford, and built with transparency.",
      },
      {
        question: "What is ChatGiZa?",
        answer:
          "ChatGiZa is our conversational AI assistant — a chat app and an API, available at chatgiza.com. It's the product WellXAI builds and operates.",
      },
      {
        question: "Is ChatGiZa free to use?",
        answer:
          "You can start using ChatGiZa for free at chatgiza.com. For team or business use, see the Business page for what's available.",
      },
    ],
  },
  {
    title: "ChatGiZa App",
    description: "Languages, mobile, and signing in.",
    icon: IconChat,
    articles: [
      {
        question: "What languages does ChatGiZa support?",
        answer:
          "ChatGiZa is built to understand Swahili, English, and code-switched conversation naturally, with more languages planned.",
      },
      {
        question: "Can I use ChatGiZa on my phone?",
        answer:
          "Yes — ChatGiZa works in any mobile browser, and a native Android app is available from chatgiza.com.",
      },
      {
        question: "How do I sign in to ChatGiZa?",
        answer:
          "Go to chatgiza.com and continue with Google, Apple, Microsoft, or your company's SSO to save chat history across devices.",
      },
    ],
  },
  {
    title: "Business & API",
    description: "Team access and building on the ChatGiZa API.",
    icon: IconBusiness,
    articles: [
      {
        question: "How do I bring ChatGiZa to my company?",
        answer:
          "Visit the Business page, or email hello@chatgiza.com and our team will get back to you about team access and integration.",
      },
      {
        question: "Where can I get API access?",
        answer:
          "The Developers page has details on the ChatGiZa API — bring ChatGiZa into your own product with a simple REST API.",
      },
    ],
  },
  {
    title: "Privacy & Legal",
    description: "How your data is handled, and our policies.",
    icon: IconPrivacy,
    articles: [
      {
        question: "How is my data handled?",
        answer: "See our Privacy Policy for details on how ChatGiZa collects, uses, and protects your data.",
      },
      {
        question: "Where are your Terms of Service?",
        answer: "You can read the full Terms of Service on the Terms page.",
      },
    ],
  },
  {
    title: "Contact",
    description: "Reach the WellXAI team directly.",
    icon: IconContact,
    articles: [
      {
        question: "How do I contact support?",
        answer: "Email hello@chatgiza.com and our team will get back to you.",
      },
    ],
  },
];

export default function SupportPageClient() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return categories.flatMap((c) =>
      c.articles
        .filter((a) => a.question.toLowerCase().includes(q) || a.answer.toLowerCase().includes(q))
        .map((a) => ({ ...a, category: c.title }))
    );
  }, [query]);

  const active = activeIndex === null ? null : categories[activeIndex];

  return (
    <div className="w-full">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 pt-8 pb-4 sm:px-6">
        <a
          href="https://wellxai.world"
          className="inline-flex items-center gap-2"
          onClick={() => {
            setActiveIndex(null);
            setQuery("");
          }}
        >
          <Logo brand="WellXAI" />
        </a>
        <div className="flex items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-muted">
            {GlobeIcon} English
          </span>
          <a href="https://wx-6f44c8d2a535.wellxai.world/login" className="text-foreground underline underline-offset-2">
            Login
          </a>
        </div>
      </div>

      {active && !results ? (
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <button
            onClick={() => setActiveIndex(null)}
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            {BackIcon} All categories
          </button>

          <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">{active.title}</h1>
          <p className="mt-1 text-sm text-muted">{active.articles.length} articles</p>

          <div className="mt-6 space-y-3">
            {active.articles.map((a) => (
              <details key={a.question} className="card group rounded-2xl p-5">
                <summary className="cursor-pointer list-none font-medium marker:content-none">
                  <span className="flex items-center justify-between gap-4">
                    {a.question}
                    <span className="text-muted transition-transform group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted">{a.answer}</p>
              </details>
            ))}
          </div>

          <div className="card mt-10 rounded-2xl p-6 text-center">
            <p className="text-sm text-muted">
              Can&apos;t find what you&apos;re looking for? Email{" "}
              <span className="text-foreground">hello@chatgiza.com</span>.
            </p>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-5xl px-4 pt-10 pb-10 sm:px-6">
          <div className="flex items-center gap-2.5 border-b border-border pb-3 text-base text-muted focus-within:border-foreground/60">
            {SearchIcon}
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(null);
              }}
              placeholder="Search for articles..."
              className="w-full bg-transparent outline-none placeholder:text-muted"
            />
          </div>
        </div>
      )}

      {results && (
        <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
          <h2 className="text-lg font-semibold">
            {results.length} result{results.length === 1 ? "" : "s"} for &quot;{query}&quot;
          </h2>
          <div className="mt-6 space-y-3">
            {results.map((a) => (
              <details key={a.question} className="card group rounded-2xl p-5">
                <summary className="cursor-pointer list-none font-medium marker:content-none">
                  <span className="flex items-center justify-between gap-4">
                    <span>
                      {a.question}
                      <span className="ml-2 text-xs uppercase tracking-wide text-muted">{a.category}</span>
                    </span>
                    <span className="text-muted transition-transform group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted">{a.answer}</p>
              </details>
            ))}
            {results.length === 0 && (
              <p className="text-sm text-muted">
                No results. Email <span className="text-foreground">hello@chatgiza.com</span> and we&apos;ll help
                directly.
              </p>
            )}
          </div>
        </div>
      )}

      {!active && !results && (
        <div className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
          <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c, i) => (
              <button
                key={c.title}
                onClick={() => setActiveIndex(i)}
                className="flex items-start gap-4 text-left"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
                  {c.icon}
                </span>
                <span>
                  <span className="block font-semibold">{c.title}</span>
                  <span className="mt-1 block text-sm text-muted">{c.description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
