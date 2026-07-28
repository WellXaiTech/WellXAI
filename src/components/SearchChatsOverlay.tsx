"use client";

import { useState } from "react";

export type ConversationSummary = { id: string; title: string };

const SearchIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export default function SearchChatsOverlay({
  conversations,
  onSelect,
  onClose,
}: {
  conversations: ConversationSummary[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const results = query.trim()
    ? conversations.filter((c) => c.title.toLowerCase().includes(query.trim().toLowerCase()))
    : conversations;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-6 sm:pt-24" onClick={onClose}>
      <div
        className="card w-full max-w-md overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="text-muted">{SearchIcon}</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats…"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No chats found.</p>
          ) : (
            <ul className="space-y-0.5">
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => {
                      onSelect(c.id);
                      onClose();
                    }}
                    className="block w-full truncate rounded-lg px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                  >
                    {c.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
