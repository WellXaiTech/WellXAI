import type { Metadata } from "next";
import { Geist_Mono, Roboto } from "next/font/google";
import { headers } from "next/headers";
import Script from "next/script";
import AuthProvider from "@/components/AuthProvider";
import GoogleOneTap from "@/components/GoogleOneTap";
import "./globals.css";

// The site's code-block monospace font -- unrelated to the Font picker below,
// kept regardless of which prose typeface is selected there.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Roboto specifically (not a generic OS-varying system-font stack) -- the
// actual Google typeface, same one Android/ChromeOS show by default, so it
// looks the same everywhere rather than as Segoe UI on Windows, San
// Francisco on Mac, etc. Website only -- the native Android app has its
// own separate font handling and is untouched by this.
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const SITE_NAME = "ChatGiZa";
const SITE_DESCRIPTION =
  "ChatGiZa is a conversational AI assistant — chat, generate images and video, search the web, and get deep research reports, with an API for developers who want to build on it.";

// wellxai.world is the WellXAI *company* site, not the ChatGiZa product (see
// src/proxy.ts) -- the browser tab title and share-link previews need to say
// "WellXAI" there instead of "ChatGiZa". Matches the COMPANY_HOSTS set in
// proxy.ts / Navbar.tsx / Footer.tsx.
const COMPANY_HOSTS = new Set(["wellxai.world", "www.wellxai.world"]);
const COMPANY_SITE_NAME = "WellXAI";
const COMPANY_DESCRIPTION =
  "WellXAI is the company behind ChatGiZa, building AI closer to people everywhere.";
// support.wellxai.world is the Help Center and wx-6f44c8d2a535.wellxai.world
// (an unguessable name on purpose, matching its path -- see src/proxy.ts) is
// the admin dashboard -- each its own standalone site (see src/app/support,
// src/app/wx-6f44c8d2a535, and src/proxy.ts).
const HOST_METADATA: { hosts: Set<string>; siteName: string; description: string; url: string }[] = [
  {
    hosts: new Set(["support.wellxai.world"]),
    siteName: "WellXAI Support",
    description: "Answers to common questions about WellXAI and ChatGiZa.",
    url: "https://support.wellxai.world",
  },
  {
    hosts: new Set(["wx-6f44c8d2a535.wellxai.world"]),
    siteName: "WellXAI Admin",
    description: "WellXAI's internal admin dashboard.",
    url: "https://wx-6f44c8d2a535.wellxai.world",
  },
];

// Reinforces the site-name signal for Google's search-result header (the line
// shown above the URL, e.g. "ChatGiZa" instead of the bare domain) — Google's
// own docs recommend Organization/WebSite structured data for this rather
// than relying on `og:site_name` alone. Kept per-host (like HOST_METADATA
// above) since wellxai.world and support.wellxai.world are their own sites,
// not ChatGiZa, and shouldn't claim to be "ChatGiZa" to search engines.
const STRUCTURED_DATA = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: "https://chatgiza.com",
    logo: "https://chatgiza.com/icon.svg",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: "https://chatgiza.com",
  },
];

const COMPANY_STRUCTURED_DATA = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: COMPANY_SITE_NAME,
    url: "https://wellxai.world",
    logo: "https://wellxai.world/icon.png",
    sameAs: ["https://chatgiza.com"],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: COMPANY_SITE_NAME,
    url: "https://wellxai.world",
  },
];

const SUPPORT_STRUCTURED_DATA = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "WellXAI Support",
    url: "https://support.wellxai.world",
    isPartOf: { "@type": "Organization", name: COMPANY_SITE_NAME, url: "https://wellxai.world" },
  },
];

// Admin dashboard is unguessable on purpose and not meant to be indexed --
// it gets no structured data (see RootLayout below).
const ADMIN_HOSTS_FOR_SEO = new Set(["wx-6f44c8d2a535.wellxai.world"]);

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host")?.split(":")[0] ?? "";
  const matched = HOST_METADATA.find((m) => m.hosts.has(host));
  const isCompanyHost = COMPANY_HOSTS.has(host);
  const siteName = matched ? matched.siteName : isCompanyHost ? COMPANY_SITE_NAME : SITE_NAME;
  const description = matched ? matched.description : isCompanyHost ? COMPANY_DESCRIPTION : SITE_DESCRIPTION;
  const url = matched ? matched.url : isCompanyHost ? "https://wellxai.world" : "https://chatgiza.com";

  return {
    metadataBase: new URL(url),
    title: {
      default: siteName,
      template: `%s — ${siteName}`,
    },
    description,
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: siteName,
    },
    icons: {
      icon: "/icon.png",
      apple: "/icons/apple-touch-icon.png",
    },
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: siteName,
      description,
      siteName,
      url,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: siteName,
      description,
    },
  };
}

export const viewport = {
  themeColor: "#000000",
  // Without this, Android Chrome's on-screen keyboard overlays the page
  // instead of shrinking it -- the layout viewport (and so 100dvh) never
  // changes, so a bottom-anchored composer stays exactly where it was and
  // ends up hidden behind the keyboard instead of pushed up above it.
  // "resizes-content" makes the keyboard actually shrink the layout
  // viewport like it always has on iOS Safari.
  interactiveWidget: "resizes-content",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const host = (await headers()).get("host")?.split(":")[0] ?? "";
  const structuredData = ADMIN_HOSTS_FOR_SEO.has(host)
    ? null
    : host === "support.wellxai.world"
      ? SUPPORT_STRUCTURED_DATA
      : COMPANY_HOSTS.has(host)
        ? COMPANY_STRUCTURED_DATA
        : STRUCTURED_DATA;

  return (
    <html
      lang="en"
      className={`${geistMono.variable} ${roboto.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {structuredData && (
          <script
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />
        )}
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem("chatgiza:theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}var f=localStorage.getItem("chatgiza:font-size");if(f==="small"||f==="medium"||f==="large"||f==="xlarge"){document.documentElement.setAttribute("data-font-size",f);}var a=localStorage.getItem("chatgiza:assistant-color");if(a==="warm"){document.documentElement.setAttribute("data-assistant-color",a);}var c=localStorage.getItem("chatgiza:contrast");if(c==="medium"||c==="increased"){document.documentElement.setAttribute("data-contrast",c);}var cf=localStorage.getItem("chatgiza:chat-font");if(cf==="nova_regular"){document.documentElement.setAttribute("data-chat-font",cf);}}catch(e){}})();`}
        </Script>
        {/* Standard, well-known SW registration idiom (register on window load) —
            PWA analysis tools like PWABuilder/Lighthouse specifically look for
            this pattern; registering only from inside a React effect wasn't
            being detected by their crawler even though it worked in real browsers. */}
        <Script id="sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) { window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js'); }); }`}
        </Script>
        <AuthProvider>
          <GoogleOneTap />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
