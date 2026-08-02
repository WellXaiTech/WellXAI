import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
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

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_NAME = "ChatGiZa";
const HOME_TITLE = "ChatGiZa";
const SITE_DESCRIPTION =
  "ChatGiZa is a conversational AI assistant — chat, generate images and video, search the web, and get deep research reports, with an API for developers who want to build on it.";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://chatgiza.com"),
  title: {
    default: HOME_TITLE,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_NAME,
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: HOME_TITLE,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    url: "https://chatgiza.com",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: HOME_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem("chatgiza:theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}var f=localStorage.getItem("chatgiza:font-size");if(f==="small"||f==="medium"||f==="large"||f==="xlarge"){document.documentElement.setAttribute("data-font-size",f);}var a=localStorage.getItem("chatgiza:assistant-color");if(a==="warm"){document.documentElement.setAttribute("data-assistant-color",a);}var c=localStorage.getItem("chatgiza:contrast");if(c==="medium"||c==="increased"){document.documentElement.setAttribute("data-contrast",c);}}catch(e){}})();`}
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
