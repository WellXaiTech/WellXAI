"use client";

import { useState } from "react";

export const LANGUAGES = [
  "Afrikaans",
  "Albanian",
  "Amharic",
  "Arabic",
  "Armenian",
  "Azerbaijani",
  "Basque",
  "Bengali",
  "Bosnian",
  "Bulgarian",
  "Burmese",
  "Catalan",
  "Chinese (Simplified)",
  "Chinese (Traditional)",
  "Croatian",
  "Czech",
  "Danish",
  "Dutch",
  "English",
  "Estonian",
  "Filipino",
  "Finnish",
  "French",
  "Georgian",
  "German",
  "Greek",
  "Gujarati",
  "Hausa",
  "Hebrew",
  "Hindi",
  "Hungarian",
  "Icelandic",
  "Igbo",
  "Indonesian",
  "Irish",
  "Italian",
  "Japanese",
  "Kannada",
  "Kazakh",
  "Khmer",
  "Korean",
  "Kurdish",
  "Lao",
  "Latvian",
  "Lithuanian",
  "Luxembourgish",
  "Malay",
  "Malayalam",
  "Maltese",
  "Marathi",
  "Mongolian",
  "Nepali",
  "Norwegian",
  "Pashto",
  "Persian (Farsi)",
  "Polish",
  "Portuguese",
  "Punjabi",
  "Romanian",
  "Russian",
  "Serbian",
  "Sinhala",
  "Slovak",
  "Slovenian",
  "Somali",
  "Spanish",
  "Swahili",
  "Swedish",
  "Tamil",
  "Telugu",
  "Thai",
  "Turkish",
  "Ukrainian",
  "Urdu",
  "Uzbek",
  "Vietnamese",
  "Welsh",
  "Xhosa",
  "Yoruba",
  "Zulu",
] as const;

const SearchIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const CheckIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export default function LanguagePanel({
  language,
  onSelect,
  onClose,
}: {
  language: string;
  onSelect: (lang: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = LANGUAGES.filter((l) => l.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-6 sm:p-10" onClick={onClose}>
      <div
        className="card flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Language</h2>
          <button
            onClick={onClose}
            aria-label="Close language picker"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground transition-colors"
          >
            ×
          </button>
        </div>
        <p className="mb-3 text-xs text-muted">
          ChatGiZa will prefer this language for its replies, unless you write in a different one.
        </p>

        <div className="relative mb-3">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            {SearchIcon}
          </span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search languages…"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-foreground/40"
          />
        </div>

        <div className="max-h-96 flex-1 overflow-y-auto">
          <button
            onClick={() => {
              onSelect("Auto-detect");
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
          >
            Auto-detect (match the language I write in)
            {language === "Auto-detect" && <span className="text-foreground">{CheckIcon}</span>}
          </button>
          <div className="my-1 border-t border-border" />
          {filtered.map((lang) => (
            <button
              key={lang}
              onClick={() => {
                onSelect(lang);
                onClose();
              }}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
            >
              {lang}
              {language === lang && <span className="text-foreground">{CheckIcon}</span>}
            </button>
          ))}
          {filtered.length === 0 && <p className="py-6 text-center text-xs text-muted">No matches.</p>}
        </div>
      </div>
    </div>
  );
}
