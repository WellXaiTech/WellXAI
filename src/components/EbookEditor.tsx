"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";

type Page = { id: string; content: string };
type Ebook = { id: string; title: string };

async function patchPage(ebookId: string, pageId: string, body: Record<string, unknown>) {
  await fetch(`/api/ebooks/${ebookId}/pages/${pageId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// The "Review suggestions" and "Write with AI" panel that lived in a right
// sidebar here has been pulled out again (per explicit request) -- the
// backing pieces (reviewWriting() in ai.ts, /api/ebooks/review, and the
// per-page /generate route) are untouched and still work, just not wired
// into this screen right now. They're meant to land somewhere else later.
export default function EbookEditor({ ebookId, onBack }: { ebookId: string; onBack: () => void }) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  const [ebook, setEbook] = useState<Ebook | null>(null);
  const [titleValue, setTitleValue] = useState("");
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  function scheduleSave(pageId: string, value: string) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      patchPage(ebookId, pageId, { content: value });
    }, 800);
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Write this page…" }),
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "tiptap-editor w-full text-sm" },
    },
    onUpdate: ({ editor }) => {
      const pageId = pageIdRef.current;
      if (pageId) scheduleSave(pageId, editor.getHTML());
    },
  });

  useEffect(() => {
    (async () => {
      try {
        const [ebookRes, pagesRes] = await Promise.all([
          fetch(`/api/ebooks/${ebookId}`),
          fetch(`/api/ebooks/${ebookId}/pages`),
        ]);
        const ebookData = await ebookRes.json();
        const pagesData = await pagesRes.json();
        if (!ebookRes.ok) throw new Error(ebookData?.error || "Book not found");
        const firstPage = pagesData.pages?.[0];
        if (!firstPage) throw new Error("Book not found");
        setEbook(ebookData.ebook);
        setTitleValue(ebookData.ebook.title);
        setPage(firstPage);
        pageIdRef.current = firstPage.id;
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Book not found");
      } finally {
        setLoading(false);
      }
    })();
  }, [ebookId]);

  // Same "only once both are ready" guard as before -- editor is null on
  // the first render (immediatelyRender:false), and this must not re-fire
  // on unrelated re-renders once content has been loaded.
  useEffect(() => {
    if (!editor || initializedRef.current || !page) return;
    initializedRef.current = true;
    editor.commands.setContent(page.content ?? "", { emitUpdate: false });
  }, [editor, page]);

  async function handleTitleBlur() {
    const trimmed = titleValue.trim();
    if (!ebook || !trimmed || trimmed === ebook.title) {
      setTitleValue(ebook?.title ?? "");
      return;
    }
    await fetch(`/api/ebooks/${ebookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
    setEbook((prev) => (prev ? { ...prev, title: trimmed } : prev));
  }

  if (loading) {
    return <div className="h-full bg-background" />;
  }

  if (loadError || !page || !ebook) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-background px-6 text-center text-foreground">
        <p className="text-sm text-muted">{loadError ?? "Book not found"}</p>
        <button onClick={onBack} className="text-sm font-medium underline">
          Back to E-books
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-background px-4 py-6 sm:px-10" onClick={() => editor?.commands.focus()}>
        <div className="mx-auto w-full max-w-[860px]">
          <input
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleBlur}
            onClick={(e) => e.stopPropagation()}
            placeholder="Untitled book"
            className="mb-4 w-full bg-transparent font-serif text-2xl outline-none"
          />
          {/* True A4 proportions (210x297mm) -- width capped at 794px (A4's
              width at the standard 96dpi CSS reference), aspect-ratio
              derives the matching height. Content longer than one page
              still grows the box taller naturally. */}
          <div className="mx-auto w-full max-w-[794px] rounded-lg bg-surface-2 p-10 shadow-lg sm:p-14" style={{ aspectRatio: "210 / 297" }}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
}
