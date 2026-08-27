import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Manrope, Geist_Mono, Cascadia_Code, Cascadia_Mono } from "next/font/google";
import localFont from "next/font/local";
import { headers } from "next/headers";
import Script from "next/script";
import AuthProvider from "@/components/AuthProvider";
import GoogleOneTap from "@/components/GoogleOneTap";
import "./globals.css";

// Free stand-in for "Ginto" (a licensed commercial typeface we don't have files
// for) — chosen as the closest free geometric sans-serif available on Google
// Fonts. Swap this import if real Ginto font files become available.
const bodyFont = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

// Second option in the Font picker (Settings > General > Chat font) --
// loaded here (not per-component) since next/font/google fonts have to be
// instantiated at module scope to generate their CSS variable correctly.
const manropeFont = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The Font picker's Microsoft options -- the only two Microsoft-made
// typefaces actually released under a free/open license (SIL OFL). Segoe
// UI itself is NOT free: it ships only under a Windows/Office license, so
// it can't be offered here. Both are on Google Fonts as variable fonts.
const cascadiaCodeFont = Cascadia_Code({
  variable: "--font-cascadia-code",
  subsets: ["latin"],
});

const cascadiaMonoFont = Cascadia_Mono({
  variable: "--font-cascadia-mono",
  subsets: ["latin"],
});

// Selawik isn't on Google Fonts, so it's self-hosted here instead of via
// next/font/google -- files are Microsoft's own official 1.01 release
// (github.com/microsoft/Selawik, SIL Open Font License 1.1), just Regular
// and Bold since that's all chat text ever actually renders (body copy +
// markdown "**bold**"), not the full five-weight family from the release.
const selawikFont = localFont({
  variable: "--font-selawik",
  src: [
    { path: "../fonts/selawik/selawik-regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/selawik/selawik-bold.woff2", weight: "700", style: "normal" },
  ],
});

// User-supplied font file (Fontshare's Clash Display), self-hosted the same
// way as Selawik above -- a single variable-weight file covers the whole
// 200-700 range instead of separate per-weight files.
const clashDisplayFont = localFont({
  variable: "--font-clash-display",
  src: [{ path: "../fonts/clash-display/ClashDisplay-Variable.ttf", weight: "200 700", style: "normal" }],
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
// support.wellxai.world is the Help Center -- its own standalone site (see
// src/app/support/page.tsx and src/proxy.ts).
const SUPPORT_HOSTS = new Set(["support.wellxai.world"]);
const SUPPORT_SITE_NAME = "WellXAI Support";
const SUPPORT_DESCRIPTION = "Answers to common questions about WellXAI and ChatGiZa.";

// Reinforces the site-name signal for Google's search-result header (the line
// shown above the URL, e.g. "ChatGiZa" instead of the bare domain) — Google's
// own docs recommend Organization/WebSite structured data for this rather
// than relying on `og:site_name` alone.
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

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host")?.split(":")[0] ?? "";
  const isCompanyHost = COMPANY_HOSTS.has(host);
  const isSupportHost = SUPPORT_HOSTS.has(host);
  const siteName = isSupportHost ? SUPPORT_SITE_NAME : isCompanyHost ? COMPANY_SITE_NAME : SITE_NAME;
  const description = isSupportHost
    ? SUPPORT_DESCRIPTION
    : isCompanyHost
      ? COMPANY_DESCRIPTION
      : SITE_DESCRIPTION;
  const url = isSupportHost
    ? "https://support.wellxai.world"
    : isCompanyHost
      ? "https://wellxai.world"
      : "https://chatgiza.com";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${manropeFont.variable} ${geistMono.variable} ${cascadiaCodeFont.variable} ${cascadiaMonoFont.variable} ${selawikFont.variable} ${clashDisplayFont.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem("chatgiza:theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}var f=localStorage.getItem("chatgiza:font-size");if(f==="small"||f==="medium"||f==="large"||f==="xlarge"){document.documentElement.setAttribute("data-font-size",f);}var a=localStorage.getItem("chatgiza:assistant-color");if(a==="warm"){document.documentElement.setAttribute("data-assistant-color",a);}var c=localStorage.getItem("chatgiza:contrast");if(c==="medium"||c==="increased"){document.documentElement.setAttribute("data-contrast",c);}var cf=localStorage.getItem("chatgiza:chat-font");if(cf==="manrope"||cf==="system"){document.documentElement.setAttribute("data-chat-font",cf);}}catch(e){}})();`}
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
