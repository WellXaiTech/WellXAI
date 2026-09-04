"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import NavAuthButton from "./NavAuthButton";
import { CHATGIZA_APK_URL } from "@/lib/useInstallPrompt";

// These pages represent WellXAI, the company, rather than the ChatGiZa
// product — the logo should read "WellXAI" there instead.
const COMPANY_BRANDED_PATHS = ["/terms", "/privacy", "/wx-6f44c8d2a535", "/company"];
// wellxai.world's "/" is proxy-rewritten to "/company" (see src/proxy.ts)
// rather than redirected, so the browser's address bar -- and therefore
// usePathname() -- stays on "/", never actually reporting "/company". Path
// alone can't detect that case; checking the hostname too covers it.
const COMPANY_HOSTS = new Set(["wellxai.world", "www.wellxai.world"]);

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
  const [isCompanyHost, setIsCompanyHost] = useState(false);
  useEffect(() => {
    setIsCompanyHost(COMPANY_HOSTS.has(window.location.hostname));
  }, []);
  const isCompanyBranded = COMPANY_BRANDED_PATHS.includes(pathname) || isCompanyHost;

  // On an Android phone/tablet, "Try ChatGiZa" should get people into the
  // real native app (via its APK download) rather than the web chat —
  // everywhere else (desktop, iOS) it opens the web version as before.
  const [isAndroid, setIsAndroid] = useState(false);
  useEffect(() => {
    setIsAndroid(/Android/i.test(window.navigator.userAgent));
  }, []);

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
        </div>
        <div className="flex items-center gap-3">
          {/* wellxai.world is a plain company/marketing site, not a product
              with accounts -- "Log in" only makes sense on chatgiza.com,
              where people actually sign in to save chat history. */}
          {!isCompanyHost && <NavAuthButton />}
          {isCompanyHost ? (
            // wellxai.world must never render the chat app itself (see
            // src/proxy.ts) -- opening chatgiza.com in a new tab instead of
            // navigating away keeps the WellXAI site open in this one.
            <a
              href="https://chatgiza.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-85"
            >
              Try ChatGiZa
            </a>
          ) : (
            <Link
              href={isAndroid ? CHATGIZA_APK_URL : "/chatgiza"}
              className="btn-primary rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-85"
            >
              Try ChatGiZa
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
