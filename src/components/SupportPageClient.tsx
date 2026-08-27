"use client";

import { useMemo, useState, type ReactElement } from "react";
import Logo from "@/components/Logo";

type Article = { question: string; answer: string };
type Category = { title: string; description: string; icon: ReactElement; articles: Article[] };

const IconGettingStarted = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconChat = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconBusiness = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="7" width="18" height="14" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconPrivacy = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2 4 5v6c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11V5l-8-3Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconContact = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m4 6 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SearchIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
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
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <a
            href="https://wellxai.world"
            className="inline-flex items-center gap-2"
            onClick={() => {
              setActiveIndex(null);
              setQuery("");
            }}
          >
            <Logo brand="WellXAI" />
            <span className="text-muted">Support</span>
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
        <div className="mx-auto max-w-3xl px-4 pt-16 pb-10 text-center sm:px-6">
          <h1 className="text-3xl font-semibold sm:text-4xl">How can we help?</h1>
          <div className="mx-auto mt-8 flex max-w-xl items-center gap-2.5 rounded-full border border-border px-5 py-3.5 text-left text-sm text-muted focus-within:border-foreground/40">
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
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
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
