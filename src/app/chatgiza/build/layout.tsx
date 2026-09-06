import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Build",
  description: "Chat with ChatGiZa to build a real website with a live preview, then push it to GitHub or deploy it to Vercel.",
  alternates: { canonical: "/chatgiza/build" },
  // Overrides the root layout's /manifest.json -- Build gets its own
  // installable app (separate id/scope/start_url) so installing it opens
  // straight into the builder, not the main chat.
  manifest: "/build-manifest.json",
};

export default function BuildLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
