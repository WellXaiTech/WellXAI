"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import NavAuthButton from "./NavAuthButton";

// These pages represent WellXAI, the company, rather than the ChatGiZa
// product — the logo should read "WellXAI" there instead.
const COMPANY_BRANDED_PATHS = ["/terms", "/privacy"];

const links = [
  { href: "/research", label: "Research" },
  { href: "/products", label: "Products" },
  { href: "/business", label: "Business" },
  { href: "/developers", label: "Developers" },
  { href: "/company", label: "Company" },
  { href: "/foundation", label: "Foundation" },
];

export default function Navbar() {
  const pathname = usePathname();
  const isCompanyBranded = COMPANY_BRANDED_PATHS.includes(pathname);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/">
          <Logo brand={isCompanyBranded ? "WellXAI" : "ChatGiZa"} />
        </Link>
        <div className="hidden items-center gap-6 text-sm text-muted lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <button aria-label="Search" className="text-muted hover:text-foreground transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <NavAuthButton />
          <Link
            href="/chatgiza"
            className="btn-primary rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-85"
          >
            Try ChatGiZa
          </Link>
        </div>
      </nav>
    </header>
  );
}
