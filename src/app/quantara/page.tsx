import type { Metadata } from "next";
import ChatGizaMediaFeed from "@/components/ChatGizaMediaFeed";

// Quantara's own standalone page (chatgiza.com/quantara) -- same feed
// component the Ask chat docks as a side panel (see chatgiza/page.tsx),
// just in "standalone" mode: a normal full page instead of a
// fixed/resizable floating panel. Reachable directly, without opening Ask
// first.
export const metadata: Metadata = {
  title: "Quantara",
  description: "ChatGiZa's media feed -- share and discover posts from the community.",
};

export default function QuantaraPage() {
  return <ChatGizaMediaFeed standalone />;
}
