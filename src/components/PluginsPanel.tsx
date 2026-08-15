"use client";

import { useState } from "react";

export type PluginKey =
  | "web_search"
  | "deep_research"
  | "deep_think"
  | "image"
  | "video"
  | "document_writer"
  | "sql_helper"
  | "python_helper"
  | "business_assistant"
  | "ai_agent"
  | "digital_twin";

const BackIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const SearchIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);

const PlusIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

const ChevronRightIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

// Third-party connectors, shown the same way ChatGPT's Plugins page shows
// them -- browsable, not yet wired to any backend. Tapping "+" is honest
// about that via the existing ComingSoonModal rather than doing nothing.
// Icons are simplified generic glyphs, not the real trademarked logos.
type ExternalPlugin = { title: string; description: string; color: string; icon: React.ReactNode };

const GitHubGlyph = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
  </svg>
);

const DriveGlyph = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 3h7l6 10.5-3.5 6h-12l-3.5-6Z" />
    <path d="M8.5 3l-6 10.5m13.5-3l3.5 6M9.5 19.5h9" />
  </svg>
);

const SlackGlyph = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
    <rect x="9" y="2" width="4" height="8" rx="2" />
    <rect x="9" y="14" width="4" height="8" rx="2" />
    <rect x="14" y="9" width="8" height="4" rx="2" />
    <rect x="2" y="9" width="8" height="4" rx="2" />
  </svg>
);

const NotionGlyph = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6" />
    <path d="M8 13l4 5 4-8" />
  </svg>
);

const CalendarGlyph = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const DropboxGlyph = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round">
    <path d="M6 3l6 4-6 4-6-4Z M18 3l6 4-6 4-6-4Z M0 15l6 4 6-4-6-4Z M12 15l6 4 6-4-6-4Z" transform="translate(0 -1)" />
  </svg>
);

const LinearGlyph = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
    <path d="M3 15L15 3M3 9L9 3M9 21l12-12" />
  </svg>
);

const ZapierGlyph = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none">
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
  </svg>
);

const SalesforceGlyph = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 17a4 4 0 0 1-1-7.9A5 5 0 0 1 14.5 7a4 4 0 0 1 4.9 5.1A3.5 3.5 0 0 1 18 19H6Z" />
  </svg>
);

const OutlookGlyph = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
    <path d="M8 14l3 2.2L14 14" />
  </svg>
);

const SharePointGlyph = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="3" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <circle cx="17" cy="6" r="2.4" />
    <path d="M14.8 8.5a5.2 5.2 0 0 1 6.7 5" />
  </svg>
);

const TrelloGlyph = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <rect x="6" y="6" width="5" height="9" rx="1" />
    <rect x="13" y="6" width="5" height="5" rx="1" />
  </svg>
);

const ShazamGlyph = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="2.5" fill="white" stroke="none" />
    <path d="M7 8a7 7 0 0 0 0 8" />
    <path d="M17 8a7 7 0 0 1 0 8" />
  </svg>
);

const PlaneGlyph = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12l19-9-9 19-2-8-8-2Z" />
  </svg>
);

const CompassGlyph = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M16 8l-3 6-6 3 3-6Z" />
  </svg>
);

const HouseGlyph = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11l9-8 9 8" />
    <path d="M5 10v10h14V10" />
  </svg>
);

const MusicNoteGlyph = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l11-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="17" cy="16" r="3" />
  </svg>
);

const DiamondGlyph = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="black" stroke="none">
    <path d="M12 3l3 3-3 3-3-3Z M12 15l3 3-3 3-3-3Z M3 12l3-3 3 3-3 3Z M15 12l3-3 3 3-3 3Z" />
  </svg>
);

const CandlestickGlyph = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
    <path d="M6 3v3M6 18v3M13 2v5M13 18v4M20 5v3M20 15v6" />
    <rect x="4" y="6" width="4" height="9" fill="white" stroke="none" />
    <rect x="11" y="7" width="4" height="11" fill="white" stroke="none" />
    <rect x="18" y="8" width="4" height="7" fill="white" stroke="none" />
  </svg>
);

const StripeGlyph = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
    <path d="M17 7c-1.5-1.3-3.5-2-5.5-2C8 5 6 6.8 6 9c0 5 11 3 11 8 0 2.2-2.5 4-6 4-2.3 0-4.5-.8-6-2" />
  </svg>
);

const TriangleGlyph = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none">
    <path d="M12 3l10 18H2Z" />
  </svg>
);

const BagGlyph = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8h12l-1 12H7Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);

const BoltGlyph = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none">
    <path d="M12 2 5 13h5l-1 9 9-13h-6Z" />
  </svg>
);

const PaletteGlyph = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5S14 15 15 15h3a3 3 0 0 0 3-3c0-5-4-9-9-9Z" />
    <circle cx="7.5" cy="10.5" r="1" fill="white" stroke="none" />
    <circle cx="12" cy="7.5" r="1" fill="white" stroke="none" />
    <circle cx="16.5" cy="10.5" r="1" fill="white" stroke="none" />
  </svg>
);

type PluginSection = { heading: string; items: ExternalPlugin[]; seeMore: string };

const SECTIONS: PluginSection[] = [
  {
    heading: "Featured",
    seeMore: "See Gmail, Jira, and more",
    items: [
      { title: "GitHub", description: "Triage PRs, issues, and open pull requests", color: "#24292e", icon: GitHubGlyph },
      { title: "Google Drive", description: "Work across Drive, Docs, Sheets, and Slides", color: "#1a73e8", icon: DriveGlyph },
      { title: "Slack", description: "Summarize channels and draft replies", color: "#4a154b", icon: SlackGlyph },
      { title: "Linear", description: "Plan and track issues without leaving chat", color: "#5e6ad2", icon: LinearGlyph },
      { title: "Zapier", description: "Trigger automations across thousands of apps", color: "#ff4a00", icon: ZapierGlyph },
      { title: "Salesforce", description: "Look up and update CRM records", color: "#00a1e0", icon: SalesforceGlyph },
    ],
  },
  {
    heading: "Productivity",
    seeMore: "See ClickUp, Asana, and more",
    items: [
      { title: "Notion", description: "Notion workflows for specs and research", color: "#000000", icon: NotionGlyph },
      { title: "Google Calendar", description: "Manage events and scheduling", color: "#1a73e8", icon: CalendarGlyph },
      { title: "Dropbox", description: "Search and summarize your files", color: "#0061fe", icon: DropboxGlyph },
      { title: "Outlook Calendar", description: "Manage Microsoft Outlook schedules and events", color: "#0078d4", icon: OutlookGlyph },
      { title: "SharePoint", description: "Summarize Microsoft SharePoint sites and files", color: "#038387", icon: SharePointGlyph },
      { title: "Trello", description: "Create and update cards on your boards", color: "#0079bf", icon: TrelloGlyph },
      { title: "Canva", description: "Generate and edit designs from a prompt", color: "#00c4cc", icon: PaletteGlyph },
    ],
  },
  {
    heading: "Travel",
    seeMore: "See Booking.com, Airbnb, and more",
    items: [
      { title: "Trip.com", description: "Search flights, hotels, and book trips", color: "#2a7de1", icon: PlaneGlyph },
      { title: "Skyscanner", description: "Compare flight prices across airlines", color: "#00a698", icon: CompassGlyph },
    ],
  },
  {
    heading: "Finance",
    seeMore: "See Coinbase, PayPal, and more",
    items: [
      { title: "Binance", description: "Check prices and your portfolio", color: "#b8860b", icon: DiamondGlyph },
      { title: "Bybit", description: "Check markets and your positions", color: "#181a20", icon: CandlestickGlyph },
      { title: "Stripe", description: "Look up payments, invoices, and payouts", color: "#635bff", icon: StripeGlyph },
    ],
  },
  {
    heading: "Developer tools",
    seeMore: "See Netlify, Railway, and more",
    items: [
      { title: "Vercel", description: "Check deployments and project status", color: "#000000", icon: TriangleGlyph },
      { title: "Supabase", description: "Query your database and manage tables", color: "#3ecf8e", icon: BoltGlyph },
      { title: "Shopify", description: "Manage orders, products, and inventory", color: "#95bf47", icon: BagGlyph },
    ],
  },
  {
    heading: "Entertainment & Home",
    seeMore: "See Spotify, Google Home, and more",
    items: [
      { title: "Shazam", description: "Identify songs and browse what you've found", color: "#0088ff", icon: ShazamGlyph },
      { title: "Apple Music", description: "Find and queue up songs and playlists", color: "#fa243c", icon: MusicNoteGlyph },
      { title: "Homey", description: "Control smart home devices and routines", color: "#6236ff", icon: HouseGlyph },
    ],
  },
];

function ExternalPluginCard({ plugin, onAdd }: { plugin: ExternalPlugin; onAdd: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: plugin.color }}
      >
        {plugin.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{plugin.title}</p>
        <p className="truncate text-xs text-muted">{plugin.description}</p>
      </div>
      <button
        onClick={onAdd}
        aria-label={`Add ${plugin.title}`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        {PlusIcon}
      </button>
    </div>
  );
}

export default function PluginsPanel({
  onClose,
  onOpenComingSoon,
}: {
  onClose: () => void;
  onOpenComingSoon: (title: string) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const sections = SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((p) => !q || p.title.toLowerCase().includes(q)),
  })).filter((s) => s.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-6 py-4 sm:px-10">
        <div className="flex items-start gap-3">
          <button
            onClick={onClose}
            aria-label="Close plugins"
            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground transition-colors"
          >
            {BackIcon}
          </button>
          <div>
            <h1 className="font-serif text-2xl">Plugins</h1>
            <p className="mt-1 text-sm text-muted">Work with ChatGiZa across your favorite tools.</p>
          </div>
        </div>

        <div className="relative flex items-center">
          <span className="pointer-events-none absolute left-3 text-muted">{SearchIcon}</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search plugins"
            className="w-56 rounded-full border border-border bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-foreground/40"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-10">
        <div className="mx-auto max-w-3xl">
          {sections.map((s) => (
            <section key={s.heading} className="mb-8">
              <h2 className="mb-3 text-sm font-semibold">{s.heading}</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {s.items.map((p) => (
                  <ExternalPluginCard key={p.title} plugin={p} onAdd={() => onOpenComingSoon(p.title)} />
                ))}
              </div>
              <button
                onClick={() => onOpenComingSoon("More connectors")}
                className="mt-2 flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
              >
                {s.seeMore} {ChevronRightIcon}
              </button>
            </section>
          ))}

          {sections.length === 0 && <p className="text-sm text-muted">No plugins match &quot;{query}&quot;.</p>}
        </div>
      </div>
    </div>
  );
}
