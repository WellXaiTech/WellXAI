"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export type Ebook = {
  id: string;
  title: string;
  description: string | null;
  source: "uploaded" | "written";
  status: "draft" | "ready";
  fileUrl: string | null;
  createdAt: number;
};

const UploadIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v12" />
    <path d="m7 8 5-5 5 5" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);
const BookGlyph = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
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

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

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

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="heading text-2xl">E-books</h1>
            <p className="mt-1 text-sm text-muted">Write a new book page by page with AI, or upload a PDF you already have.</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              {CloseIcon}
            </button>
          )}
        </div>

        {uploadError && <p className="mb-4 text-sm text-red-400">{uploadError}</p>}

        {/* Always visible (not just when the library is empty) -- "Create a
            Book" is the only way to start a new one now that it isn't a
            header button anymore, so it can't be hidden once you already
            have books. */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border p-6">
            <p className="text-sm font-medium">Before you start</p>
            <ul className="mt-3 space-y-1.5 text-sm text-muted">
              <li>Give your book a clear purpose before you start.</li>
              <li>Use &quot;Write with AI&quot; whenever you&apos;re stuck.</li>
              <li>Short chapters are easier to finish than long ones.</li>
            </ul>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mt-4 flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
            >
              {UploadIcon} {uploading ? "Uploading…" : "Or upload a PDF you already have"}
            </button>
            <p className="mt-1 text-xs text-muted">PDF files only, up to 20MB.</p>
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
          </div>

          <button
            onClick={handleNewBook}
            disabled={startingBook}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-6 text-center transition-colors hover:bg-surface-2 disabled:opacity-50"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted">{BookGlyph}</span>
            <span className="text-sm font-semibold">{startingBook ? "Starting…" : "Create a Book"}</span>
            <span className="text-xs text-muted">Write page by page with AI</span>
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : ebooks.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {ebooks.map((book) => (
              <div
                key={book.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface-2 transition-colors hover:bg-surface"
              >
                <button onClick={() => openBook(book)} className="flex flex-1 flex-col items-start gap-1 p-4 text-left">
                  <span className="line-clamp-2 text-sm font-medium">{book.title}</span>
                  <span className="mt-auto text-xs text-muted">
                    {book.source === "written" ? (book.status === "draft" ? "Draft" : "Written with AI") : "Uploaded"} ·{" "}
                    {new Date(book.createdAt).toLocaleDateString()}
                  </span>
                </button>
                <button
                  onClick={() => handleDelete(book.id)}
                  disabled={deletingId === book.id}
                  aria-label="Delete"
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-muted opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 disabled:opacity-50"
                >
                  {TrashIcon}
                </button>
              </div>
            ))}
          </div>
        ) : null}
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
