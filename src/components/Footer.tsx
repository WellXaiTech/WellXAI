"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

// These pages represent WellXAI, the company, rather than the ChatGiZa
// product — the brand shown in the footer should read "WellXAI" there.
const COMPANY_BRANDED_PATHS = ["/terms", "/privacy", "/wx-6f44c8d2a535"];

const columns: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Research",
    links: [
      { label: "Research Overview", href: "/research" },
      { label: "Safety Approach", href: "/research" },
      { label: "Trust & Transparency", href: "/research" },
    ],
  },
  {
    heading: "Products",
    links: [
      { label: "ChatGiZa", href: "/chatgiza" },
      { label: "GiZA-5.6", href: "/products" },
      { label: "GiZA-5.5", href: "/products" },
      { label: "GiZA-5.4", href: "/products" },
    ],
  },
  {
    heading: "Developers",
    links: [
      { label: "API Platform", href: "/developers" },
      { label: "Docs", href: "/developers" },
      { label: "Release Notes", href: "/developers" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About Us", href: "/company" },
      { label: "Careers", href: "/company" },
      { label: "Business", href: "/business" },
      { label: "Foundation", href: "/foundation" },
    ],
  },
  {
    heading: "More",
    links: [
      { label: "Stories", href: "/stories" },
      { label: "Contact", href: "/company" },
    ],
  },
];

export default function Footer() {
  const pathname = usePathname();
  const isCompanyBranded = COMPANY_BRANDED_PATHS.includes(pathname);
  const brand = isCompanyBranded ? "WellXAI" : "ChatGiZa";

  return (
    <footer className="border-t border-border mt-24">
      <div className="mx-auto max-w-6xl px-6 py-12 grid gap-8 sm:grid-cols-2 md:grid-cols-5 text-sm">
        {columns.map((col) => (
          <div key={col.heading}>
            <h4 className="font-medium mb-3">{col.heading}</h4>
            <ul className="space-y-2 text-muted">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <Logo className="text-sm" brand={brand} />
          <span>© 2016–{new Date().getFullYear()} {brand}. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
