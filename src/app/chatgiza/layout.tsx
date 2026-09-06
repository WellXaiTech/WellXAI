import type { Metadata } from "next";
import InstallAppPrompt from "@/components/InstallAppPrompt";
import ChatGizaShell from "@/components/ChatGizaShell";

const TITLE = "ChatGiZa";
const DESCRIPTION =
  "ChatGiZa is your AI assistant — chat, generate images and video, search the web, and get deep research reports.";

export const metadata: Metadata = {
  // Overrides the root layout's "%s — ChatGiZa" template with an absolute
  // title — this page IS ChatGiZa, so appending "— ChatGiZa" a second time
  // would read as "ChatGiZa — ChatGiZa".
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/chatgiza" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    // Next.js replaces the root layout's whole `openGraph` object rather
    // than merging it per-field, so siteName has to be repeated here too --
    // otherwise this route's page ships with no og:site_name at all.
    siteName: TITLE,
    url: "https://chatgiza.com/chatgiza",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
  },
};

// SoftwareApplication structured data for the product page itself.
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ChatGiZa",
  applicationCategory: "BrowserApplication",
  operatingSystem: "Web, Android",
  url: "https://chatgiza.com/chatgiza",
  description: DESCRIPTION,
};

export default function ChatGizaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />
      <ChatGizaShell>{children}</ChatGizaShell>
      <InstallAppPrompt />
    </div>
  );
}
