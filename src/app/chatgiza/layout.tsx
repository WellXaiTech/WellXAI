import type { Metadata } from "next";

const TITLE = "ChatGiZa — Chat, Image & Video AI Assistant";
const DESCRIPTION =
  "Chat, generate images and video, search the web, and get deep research reports with ChatGiZa — the AI assistant built by WellX AI.";

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
    url: "https://chatgiza.com/chatgiza",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
  },
};

// Marks ChatGiZa as its own product, distinct from the WellX AI company site
// at "/", while still declaring WellX AI as the owning organization — this is
// the schema.org-recommended way to represent a product's own identity under
// a parent company (Google's docs cite this pattern for site-name signals).
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ChatGiZa",
  applicationCategory: "BrowserApplication",
  operatingSystem: "Web, Android",
  url: "https://chatgiza.com/chatgiza",
  description: DESCRIPTION,
  creator: {
    "@type": "Organization",
    name: "WellX AI",
    url: "https://chatgiza.com",
  },
};

export default function ChatGizaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />
      {children}
    </div>
  );
}
