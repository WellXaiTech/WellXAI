"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";

// These pages represent WellXAI, the company, rather than the ChatGiZa
// product — the brand shown in the footer should read "WellXAI" there.
const COMPANY_BRANDED_PATHS = ["/terms", "/privacy", "/wx-6f44c8d2a535", "/company"];
// wellxai.world's "/" is proxy-rewritten to "/company" (see src/proxy.ts)
// rather than redirected, so usePathname() there still reports "/" -- the
// hostname check catches that case too. See Navbar.tsx for the same fix.
const COMPANY_HOSTS = new Set(["wellxai.world", "www.wellxai.world"]);

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
      { label: "Help Center", href: "/support" },
      { label: "Contact", href: "/company" },
    ],
  },
];

export default function Footer() {
  const pathname = usePathname();
  const [isCompanyHost, setIsCompanyHost] = useState(false);
  useEffect(() => {
    setIsCompanyHost(COMPANY_HOSTS.has(window.location.hostname));
  }, []);
  const isCompanyBranded = COMPANY_BRANDED_PATHS.includes(pathname) || isCompanyHost;
  const brand = isCompanyBranded ? "WellXAI" : "ChatGiZa";

  return (
    <footer className="border-t border-border mt-24">
      <div className="mx-auto max-w-6xl px-6 py-12 grid gap-8 sm:grid-cols-2 md:grid-cols-5 text-sm">
        {columns.map((col) => (
          <div key={col.heading}>
            <h4 className="font-medium mb-3">{col.heading}</h4>
            <ul className="space-y-2 text-muted">
              {col.links.map((l) =>
                // On wellxai.world, "/chatgiza" is company-only-blocked (see
                // src/proxy.ts) and would redirect this same tab away to
                // chatgiza.com. Opening it in a new tab keeps the company
                // site open, matching the "Try ChatGiZa" button.
                isCompanyHost && l.href === "/chatgiza" ? (
                  <li key={l.label}>
                    <a
                      href="https://chatgiza.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground"
                    >
                      {l.label}
                    </a>
                  </li>
                ) : (
                  <li key={l.label}>
                    <Link href={l.href} className="hover:text-foreground">
                      {l.label}
                    </Link>
                  </li>
                )
              )}
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
