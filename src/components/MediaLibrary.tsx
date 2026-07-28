"use client";

import { useState } from "react";

type LibraryItem = {
  conversationId: string;
  messageId: string;
  kind: "image" | "video";
  url: string;
  title: string;
  createdAt?: number;
};

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

const ChevronDownIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const SortIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4 6h16M7 12h10M10 18h4" />
  </svg>
);

const GridIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const ListIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const ImageFileIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

const VideoFileIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="5" width="14" height="14" rx="2" />
    <path d="M17 9l4-2v10l-4-2Z" />
  </svg>
);

type ViewMode = "grid" | "list";
type SortMode = "modified" | "name";
type Tab = "all" | "image" | "video";

function formatModified(ts?: number) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function estimateSize(url: string) {
  if (!url.startsWith("data:")) return "—";
  const base64 = url.split(",")[1] ?? "";
  const bytes = Math.round((base64.length * 3) / 4);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaLibrary({
  items,
  onClose,
  onSelect,
  onNewChat,
}: {
  items: LibraryItem[];
  onClose: () => void;
  onSelect: (conversationId: string) => void;
  onNewChat: () => void;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortMode, setSortMode] = useState<SortMode>("modified");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);

  const filtered = items
    .filter((item) => tab === "all" || item.kind === tab)
    .filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) =>
      sortMode === "name" ? a.title.localeCompare(b.title) : (b.createdAt ?? 0) - (a.createdAt ?? 0)
    );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-6 py-4 sm:px-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            aria-label="Close library"
            className="rounded-full p-2 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            {BackIcon}
          </button>
          <h1 className="font-serif text-2xl">Library</h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-3 text-muted">{SearchIcon}</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-48 rounded-full border border-border bg-surface py-1.5 pl-9 pr-3 text-sm outline-none focus:border-foreground/40"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setNewMenuOpen((v) => !v)}
              className="btn-primary flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-semibold hover:opacity-85 transition-opacity"
            >
              New {ChevronDownIcon}
            </button>
            {newMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-xl border border-border bg-surface p-1 shadow-lg">
                <button
                  onClick={() => {
                    setNewMenuOpen(false);
                    onNewChat();
                  }}
                  className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-surface-2"
                >
                  New chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-border px-6 py-3 sm:px-10">
        <div className="flex items-center gap-1">
          {(["all", "image", "video"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {t === "all" ? "All" : t === "image" ? "Images" : "Videos"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <div className="relative">
            <button
              onClick={() => setSortMenuOpen((v) => !v)}
              aria-label="Sort"
              className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              {SortIcon}
            </button>
            {sortMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-xl border border-border bg-surface p-1 shadow-lg">
                {(["modified", "name"] as SortMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setSortMode(mode);
                      setSortMenuOpen(false);
                    }}
                    className={`flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-surface-2 ${
                      sortMode === mode ? "font-semibold text-foreground" : "text-muted"
                    }`}
                  >
                    {mode === "modified" ? "Last modified" : "Name"}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="mx-1 h-5 w-px bg-border" />
          <button
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
            className={`rounded-md p-1.5 transition-colors ${
              viewMode === "grid" ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {GridIcon}
          </button>
          <button
            onClick={() => setViewMode("list")}
            aria-label="List view"
            className={`rounded-md p-1.5 transition-colors ${
              viewMode === "list" ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {ListIcon}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-10">
        {filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">
            {query || tab !== "all"
              ? "No items match this view."
              : "Images and videos you generate with ChatGiZa will show up here."}
          </p>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((item) => (
              <button
                key={item.messageId}
                onClick={() => onSelect(item.conversationId)}
                className="group relative aspect-square overflow-hidden rounded-xl border border-border"
              >
                {item.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={item.title} className="h-full w-full object-cover" />
                ) : (
                  <video src={item.url} className="h-full w-full object-cover" muted />
                )}
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-2 py-1 text-left text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {item.title}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-4xl">
            <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-border px-2 pb-2 text-xs text-muted">
              <span>Name</span>
              <span className="w-32 text-right sm:text-left">Modified</span>
              <span className="w-20 text-right">Size</span>
            </div>
            <ul>
              {filtered.map((item) => (
                <li key={item.messageId}>
                  <button
                    onClick={() => onSelect(item.conversationId)}
                    className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-4 rounded-lg px-2 py-2.5 text-left text-sm transition-colors hover:bg-surface-2"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-2 text-foreground">
                        {item.kind === "image" ? ImageFileIcon : VideoFileIcon}
                      </span>
                      <span className="truncate">{item.title}</span>
                    </span>
                    <span className="w-32 text-right text-muted sm:text-left">{formatModified(item.createdAt)}</span>
                    <span className="w-20 text-right text-muted">{estimateSize(item.url)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
