"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type EbookCover = { title?: string; subtitle?: string; author?: string; background?: string; imageUrl?: string };

export type Ebook = {
  id: string;
  title: string;
  description: string | null;
  source: "uploaded" | "written";
  status: "draft" | "ready";
  fileUrl: string | null;
  cover: EbookCover | null;
  createdAt: number;
};

const UploadIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v12" />
    <path d="m7 8 5-5 5 5" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);
const PlusIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const SearchIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);
const CloseIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
const TrashIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
  </svg>
);
const ExternalIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </svg>
);
const DocIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2h9l5 5v15H6z" />
    <path d="M15 2v5h5" />
  </svg>
);
const PdfGlyph = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2h9l5 5v15H6z" />
    <path d="M15 2v5h5" />
  </svg>
);

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

type Filter = "all" | "written" | "uploaded";

function CoverThumb({ book }: { book: Ebook }) {
  const cover = book.cover;
  const light = cover?.background ? ["#f4ede1", "#ece7de"].includes(cover.background) : false;

  if (book.source === "uploaded") {
    return (
      <div className="flex aspect-[2/3] w-full flex-col items-center justify-center gap-2 rounded-md border border-border bg-surface text-muted">
        {PdfGlyph}
        <span className="text-[10px] font-semibold uppercase tracking-wide">PDF</span>
      </div>
    );
  }

  return (
    <div
      className="relative flex aspect-[2/3] w-full flex-col justify-end overflow-hidden rounded-md border border-border p-3"
      style={{
        backgroundColor: cover?.background ?? "#1c1c1c",
        backgroundImage: cover?.imageUrl ? `url(${cover.imageUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: cover?.imageUrl ? "#fff" : light ? "#1c1c1c" : "#fff",
      }}
    >
      {cover?.imageUrl && <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />}
      <p className="relative line-clamp-3 font-serif text-sm font-semibold leading-tight">{cover?.title || book.title}</p>
      {cover?.author && <p className="relative mt-1 text-[11px] opacity-85">{cover.author}</p>}
    </div>
  );
}

export default function EbookLibrary({
  onOpenBook,
  onClose,
}: {
  onOpenBook: (book: Ebook) => void;
  // Only shown embedded inside the chat shell (see chatgiza/page.tsx) --
  // the standalone /ebook route instead provides its own "Back to chat"
  // link in a page-level header, so it doesn't pass this.
  onClose?: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [startingBook, setStartingBook] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [readerBook, setReaderBook] = useState<Ebook | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/ebooks");
        const data = await res.json();
        if (res.ok) setEbooks(data.ebooks ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // "New book" jumps straight into the editor -- writing and AI assistance
  // both happen there, one page at a time, rather than in a title/brief
  // modal here.
  async function handleNewBook() {
    if (startingBook) return;
    setStartingBook(true);
    try {
      const res = await fetch("/api/ebooks/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled book" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to start the book");
      onOpenBook(data.ebook);
    } finally {
      setStartingBook(false);
    }
  }

  async function handleUploadFile(file: File) {
    if (file.type !== "application/pdf") {
      setUploadError("Please choose a PDF file.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError("That file is too large -- PDFs must be 20MB or smaller.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const slotRes = await fetch("/api/ebooks/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name }),
      });
      const slot = await slotRes.json();
      if (!slotRes.ok) throw new Error(slot?.error || "Failed to prepare upload");

      const { error } = await supabaseBrowser.storage.from("ebooks").uploadToSignedUrl(slot.path, slot.token, file);
      if (error) throw new Error(error.message);

      const saveRes = await fetch("/api/ebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: file.name.replace(/\.pdf$/i, ""), fileUrl: slot.publicUrl }),
      });
      const saved = await saveRes.json();
      if (!saveRes.ok) throw new Error(saved?.error || "Failed to save the book");
      setEbooks((prev) => [saved.ebook, ...prev]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload the book");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/ebooks/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setEbooks((prev) => prev.filter((b) => b.id !== id));
      setReaderBook((prev) => (prev?.id === id ? null : prev));
    } finally {
      setDeletingId(null);
    }
  }

  function openBook(book: Ebook) {
    // A 'written' book's pages stay editable however far along it is -- the
    // editor itself offers "View PDF" once it's been exported. Only a plain
    // uploaded PDF opens straight into the read-only viewer here.
    if (book.source === "written") {
      onOpenBook(book);
    } else {
      setReaderBook(book);
    }
  }

  const counts = useMemo(
    () => ({
      all: ebooks.length,
      written: ebooks.filter((b) => b.source === "written").length,
      uploaded: ebooks.filter((b) => b.source === "uploaded").length,
    }),
    [ebooks]
  );

  const visibleBooks = useMemo(() => {
    return ebooks
      .filter((b) => filter === "all" || b.source === filter)
      .filter((b) => !query.trim() || b.title.toLowerCase().includes(query.trim().toLowerCase()));
  }, [ebooks, filter, query]);

  return (
    <div className="flex h-full">
      {/* Library sidebar -- search, quick-create actions, and shelf filters,
          the same shape a real reading/writing app (Kindle, Apple Books,
          Notion) uses instead of everything crammed into the main column. */}
      <div className="flex w-60 shrink-0 flex-col gap-5 overflow-y-auto border-r border-border bg-surface px-4 py-6 sm:w-64">
        <div className="flex items-center justify-between">
          <h1 className="heading text-lg">E-books</h1>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              {CloseIcon}
            </button>
          )}
        </div>

        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">{SearchIcon}</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your books"
            className="w-full rounded-full border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-foreground/40"
          />
        </div>

        <div className="space-y-2">
          <button
            onClick={handleNewBook}
            disabled={startingBook}
            className="btn-primary flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {PlusIcon} {startingBook ? "Starting…" : "New book"}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-1.5 rounded-full border border-border py-2.5 text-sm font-medium hover:bg-surface-2 disabled:opacity-50"
          >
            {UploadIcon} {uploading ? "Uploading…" : "Upload a PDF"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadFile(file);
              e.target.value = "";
            }}
          />
          {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
        </div>

        <div className="min-h-0 flex-1">
          <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Shelf</p>
          {([
            ["all", "All books"],
            ["written", "Written with AI"],
            ["uploaded", "Uploaded PDFs"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
                filter === key ? "bg-surface-2 font-medium text-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              <span>{label}</span>
              <span className="text-xs text-muted">{counts[key]}</span>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-border p-3">
          <p className="text-xs font-medium">Before you start</p>
          <ul className="mt-1.5 space-y-1 text-[11px] leading-snug text-muted">
            <li>Give your book a clear purpose.</li>
            <li>Use &quot;Ask for a change&quot; whenever you&apos;re stuck.</li>
            <li>Short chapters finish faster than long ones.</li>
          </ul>
        </div>
      </div>

      {/* Shelf -- real cover thumbnails (background/image + title, from the
          editor's Cover tab) instead of plain text tiles, so a library with
          several books actually reads as a bookshelf. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8 sm:px-10">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-muted">
              {filter === "all" ? "All books" : filter === "written" ? "Written with AI" : "Uploaded PDFs"}
              <span className="ml-1.5 font-normal">({visibleBooks.length})</span>
            </h2>
          </div>

          {loading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : visibleBooks.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
              {visibleBooks.map((book) => (
                <div key={book.id} className="group relative flex flex-col">
                  <button
                    onClick={() => openBook(book)}
                    className="block w-full overflow-hidden rounded-md shadow-md ring-1 ring-black/5 transition-transform duration-150 group-hover:-translate-y-1 group-hover:shadow-xl"
                  >
                    <CoverThumb book={book} />
                  </button>
                  <button
                    onClick={() => handleDelete(book.id)}
                    disabled={deletingId === book.id}
                    aria-label="Delete"
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100 disabled:opacity-50"
                  >
                    {TrashIcon}
                  </button>
                  <p className="mt-2 line-clamp-1 text-sm font-medium">{book.title}</p>
                  <p className="flex items-center gap-1 text-xs text-muted">
                    {book.source === "uploaded" ? DocIcon : null}
                    {book.source === "written" ? (book.status === "draft" ? "Draft" : "Written with AI") : "Uploaded"} ·{" "}
                    {new Date(book.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
              <p className="text-sm font-medium">No books here yet</p>
              <p className="text-xs text-muted">{query ? "Try a different search." : "Start a new one from the sidebar."}</p>
            </div>
          )}
        </div>
      </div>

      {readerBook && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="truncate font-serif text-base">{readerBook.title}</h2>
              <div className="flex items-center gap-1">
                {readerBook.fileUrl && (
                  <a
                    href={readerBook.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open in new tab"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                  >
                    {ExternalIcon}
                  </a>
                )}
                <button
                  onClick={() => setReaderBook(null)}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  {CloseIcon}
                </button>
              </div>
            </div>
            {readerBook.fileUrl && <iframe src={readerBook.fileUrl} className="min-h-0 flex-1 bg-white" title={readerBook.title} />}
          </div>
        </div>
      )}
    </div>
  );
}
