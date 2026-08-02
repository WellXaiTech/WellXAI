"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import TypingPlaceholder from "@/components/TypingPlaceholder";

const quickLinks = [
  { href: "/chatgiza", label: "Talk with ChatGiZa" },
  { href: "/research", label: "Research" },
  { href: "/developers", label: "API Platform" },
  { href: "/stories", label: "Stories" },
  { href: "/company", label: "More" },
];

const products = [
  {
    href: "/chatgiza",
    title: "ChatGiZa",
    tag: "Chat",
    description:
      "A conversational assistant that can answer questions, write, plan, and think things through with you.",
  },
  {
    href: "/developers",
    title: "ChatGiZa API",
    tag: "Developers",
    description: "Bring ChatGiZa into your own product through a simple REST API.",
  },
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = prompt.trim();
    router.push(q ? `/chatgiza?q=${encodeURIComponent(q)}` : "/chatgiza");
  }

  return (
    <div>
      <section className="mx-auto max-w-2xl px-6 pt-36 pb-16 text-center">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          What can I help with?
        </h1>

        <form
          onSubmit={handleSubmit}
          className="card mt-8 flex items-center gap-2 rounded-full px-4 py-3 text-left"
        >
          <div className="relative flex-1">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-transparent px-2 py-1.5 text-sm outline-none"
            />
            {!prompt && (
              <div className="pointer-events-none absolute inset-0 flex items-center px-2 text-sm text-muted">
                <TypingPlaceholder />
              </div>
            )}
          </div>
          <button
            type="submit"
            aria-label="Send"
            className="btn-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:opacity-85"
          >
            ↑
          </button>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {quickLinks.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="rounded-full border border-border px-4 py-2 text-sm text-muted hover:text-foreground hover:border-foreground/40 transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 sm:grid-cols-2">
          {products.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="card group rounded-2xl p-6 hover:border-foreground/40 transition-colors"
            >
              <span className="text-xs uppercase tracking-wide text-muted">{p.tag}</span>
              <h3 className="mt-2 text-xl font-semibold">{p.title}</h3>
              <p className="mt-3 text-sm text-muted">{p.description}</p>
              <span className="mt-4 inline-block text-sm font-medium group-hover:underline">
                Learn more →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="card rounded-2xl px-10 py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold">
            Get started with ChatGiZa
          </h2>
          <Link
            href="/chatgiza"
            className="btn-primary mt-6 inline-block rounded-full px-6 py-3 text-sm font-medium hover:opacity-85 transition-opacity"
          >
            Download
          </Link>
        </div>
      </section>
    </div>
  );
}
