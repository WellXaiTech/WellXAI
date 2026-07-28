import Link from "next/link";
import Logo from "./Logo";

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
          <Logo className="text-sm" />
          <span>© 2016–{new Date().getFullYear()} WellX AI. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
