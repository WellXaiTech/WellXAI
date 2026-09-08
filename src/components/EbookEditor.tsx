"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { WritingSuggestion } from "@/lib/ai";
import { WritingIssues, writingIssuesKey, getWritingIssueRanges } from "@/lib/tiptapWritingIssues";
import { getLocalShop } from "@/lib/chackallLocalShop";

type Page = { id: string; position: number; content: string };
type EbookCover = { title?: string; subtitle?: string; author?: string; background?: string; imageUrl?: string };
type Ebook = { id: string; title: string; description: string | null; cover: EbookCover | null };

async function patchPage(ebookId: string, pageId: string, body: Record<string, unknown>) {
  await fetch(`/api/ebooks/${ebookId}/pages/${pageId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function patchEbook(ebookId: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/ebooks/${ebookId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

const BackIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
const UndoIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 010 11H11" />
  </svg>
);
const RedoIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M15 14l5-5-5-5" />
    <path d="M20 9H9.5a5.5 5.5 0 000 11H13" />
  </svg>
);
const BoldIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M6 4h7a3.5 3.5 0 010 7H6z" />
    <path d="M6 11h8a3.5 3.5 0 010 7H6z" />
  </svg>
);
const ItalicIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M11 4h6M7 20h6M14 4l-4 16" />
  </svg>
);
const UnderlineIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M6 4v6a6 6 0 0012 0V4" />
    <path d="M4 20h16" />
  </svg>
);
const StrikeIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M5 12h14" />
    <path d="M16 6.5c-.7-1-2-1.7-4-1.7-2.5 0-4.5 1-4.5 3 0 1.6 1.3 2.3 3 2.7" />
    <path d="M8 17.5c.7 1 2.2 1.7 4 1.7 2.5 0 4.5-1 4.5-3 0-1.5-1-2.2-2.5-2.7" />
  </svg>
);
const HighlightIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M9 11l6-6 4 4-6 6H9z" />
    <path d="M9 15l-4 4H3v-2l4-4" />
  </svg>
);
const QuoteIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M7 8a3 3 0 00-3 3v2a2 2 0 002 2h1a2 2 0 002-2v-2a3 3 0 00-3-3z" />
    <path d="M17 8a3 3 0 00-3 3v2a2 2 0 002 2h1a2 2 0 002-2v-2a3 3 0 00-3-3z" />
  </svg>
);
const LinkIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M9 15l6-6" />
    <path d="M11 6l1-1a3.5 3.5 0 015 5l-1 1" />
    <path d="M13 18l-1 1a3.5 3.5 0 01-5-5l1-1" />
  </svg>
);
const AlignLeftIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M4 6h16M4 12h10M4 18h13" />
  </svg>
);
const AlignCenterIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M4 6h16M7 12h10M5.5 18h13" />
  </svg>
);
const AlignRightIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M4 6h16M10 12h10M7 18h13" />
  </svg>
);
const AlignJustifyIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);
const BulletListIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none" />
    <path d="M9 6h11M9 12h11M9 18h11" />
  </svg>
);
const OrderedListIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M9 6h11M9 12h11M9 18h11" />
    <text x="1.5" y="8" fontSize="6.5" fill="currentColor" stroke="none">1</text>
    <text x="1.5" y="14" fontSize="6.5" fill="currentColor" stroke="none">2</text>
    <text x="1.5" y="20" fontSize="6.5" fill="currentColor" stroke="none">3</text>
  </svg>
);
const TaskListIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <rect x="3.5" y="4.5" width="5" height="5" rx="1" />
    <path d="M4.7 7l1 1 1.8-2" />
    <path d="M12 7h9M12 17h9" />
    <rect x="3.5" y="14.5" width="5" height="5" rx="1" />
  </svg>
);
const SpellcheckIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M4 15l3-8 3 8M5 12.5h4" />
    <path d="M14 6h6M14 6l3 9" />
    <path d="M20 15a3 3 0 11-6 0" />
  </svg>
);
const CoverIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <rect x="4" y="3" width="16" height="18" rx="1.5" />
    <path d="M8 8h8M8 12h5" />
  </svg>
);
const PlusIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const TrashIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6" />
  </svg>
);
const CloseIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
const SparkleIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
  </svg>
);
const UploadIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M12 3v12M7 8l5-5 5 5" />
    <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
  </svg>
);
const QuantaraIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M8 12h8M8 16h5M8 8h3" />
  </svg>
);
const ShopIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M3 9l1-5h16l1 5M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9M4 9h16M9 21v-6h6v6" />
  </svg>
);

// Fires a re-render on every editor transaction (selection move, formatting
// change) so the toolbar's active/disabled states -- and the heading
// dropdown's current value -- stay in sync. Tiptap's own editor.isActive()
// checks don't trigger React re-renders by themselves; this is what does.
function useEditorTick(editor: Editor | null) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const rerender = () => setTick((n) => n + 1);
    editor.on("transaction", rerender);
    return () => {
      editor.off("transaction", rerender);
    };
  }, [editor]);
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      // Keeps the editor's text selection from collapsing before onClick
      // runs -- without this, mousedown on the button steals focus first
      // and commands like toggleBold() apply to an empty/lost selection.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-30 ${
        active ? "bg-surface-2 text-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-5 w-px shrink-0 bg-border" />;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 50) return "text-amber-500";
  return "text-red-500";
}

function Toolbar({
  editor,
  onCheckWriting,
  reviewing,
  reviewScore,
}: {
  editor: Editor;
  onCheckWriting: () => void;
  reviewing: boolean;
  reviewScore: number | null;
}) {
  useEditorTick(editor);

  const headingValue = editor.isActive("heading", { level: 1 })
    ? "1"
    : editor.isActive("heading", { level: 2 })
      ? "2"
      : editor.isActive("heading", { level: 3 })
        ? "3"
        : "paragraph";

  return (
    <div className="no-scrollbar flex h-11 shrink-0 items-center gap-0.5 overflow-x-auto border-b border-border bg-surface px-3">
      <ToolbarButton title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
        {UndoIcon}
      </ToolbarButton>
      <ToolbarButton title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
        {RedoIcon}
      </ToolbarButton>

      <ToolbarDivider />

      <select
        value={headingValue}
        onChange={(e) => {
          const v = e.target.value;
          const chain = editor.chain().focus();
          if (v === "paragraph") chain.setParagraph().run();
          else chain.toggleHeading({ level: Number(v) as 1 | 2 | 3 }).run();
        }}
        title="Paragraph style"
        className="h-8 shrink-0 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none hover:bg-surface-2"
      >
        <option value="paragraph">Paragraph</option>
        <option value="1">Heading 1</option>
        <option value="2">Heading 2</option>
        <option value="3">Heading 3</option>
      </select>

      <ToolbarDivider />

      <ToolbarButton title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        {BoldIcon}
      </ToolbarButton>
      <ToolbarButton title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        {ItalicIcon}
      </ToolbarButton>
      <ToolbarButton title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        {UnderlineIcon}
      </ToolbarButton>
      <ToolbarButton title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        {StrikeIcon}
      </ToolbarButton>
      <ToolbarButton
        title="Highlight"
        active={editor.isActive("highlight")}
        onClick={() => editor.chain().focus().toggleHighlight({ color: "#fde68a" }).run()}
      >
        {HighlightIcon}
      </ToolbarButton>
      <label
        title="Text color"
        className="relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-foreground"
      >
        <span className="pointer-events-none text-sm font-semibold">A</span>
        <input
          type="color"
          onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>

      <ToolbarDivider />

      <ToolbarButton
        title="Align left"
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        {AlignLeftIcon}
      </ToolbarButton>
      <ToolbarButton
        title="Align center"
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        {AlignCenterIcon}
      </ToolbarButton>
      <ToolbarButton
        title="Align right"
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        {AlignRightIcon}
      </ToolbarButton>
      <ToolbarButton
        title="Justify"
        active={editor.isActive({ textAlign: "justify" })}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
      >
        {AlignJustifyIcon}
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        title="Bulleted list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        {BulletListIcon}
      </ToolbarButton>
      <ToolbarButton
        title="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        {OrderedListIcon}
      </ToolbarButton>
      <ToolbarButton title="Checklist" active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()}>
        {TaskListIcon}
      </ToolbarButton>
      <ToolbarButton title="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        {QuoteIcon}
      </ToolbarButton>
      <ToolbarButton
        title="Link"
        active={editor.isActive("link")}
        onClick={() => {
          if (editor.isActive("link")) {
            editor.chain().focus().unsetLink().run();
            return;
          }
          const url = window.prompt("Link URL");
          if (url) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }}
      >
        {LinkIcon}
      </ToolbarButton>

      <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
        {reviewScore !== null && <span className={`text-xs font-semibold ${scoreColor(reviewScore)}`}>{reviewScore}/100</span>}
        <ToolbarButton title="Check writing with AI" disabled={reviewing} onClick={onCheckWriting}>
          {SpellcheckIcon}
        </ToolbarButton>
      </div>
    </div>
  );
}

const COVER_BACKGROUNDS = ["#1c1c1c", "#2b2320", "#1e2a2e", "#26202f", "#f4ede1", "#ece7de"];

function CoverEditor({
  ebook,
  cover,
  onChange,
  onGenerate,
  onUpload,
  generating,
  uploading,
  saveStatus,
  error,
  onShareQuantara,
  sharingQuantara,
  quantaraResult,
  onSellChackall,
  sellingChackall,
  chackallResult,
}: {
  ebook: Ebook;
  cover: EbookCover;
  onChange: (patch: EbookCover) => void;
  onGenerate: () => void;
  onShareQuantara: () => void;
  sharingQuantara: boolean;
  quantaraResult: string | null;
  onSellChackall: () => void;
  sellingChackall: boolean;
  chackallResult: string | null;
  onUpload: (file: File) => void;
  generating: boolean;
  uploading: boolean;
  saveStatus: "idle" | "saving" | "saved";
  error: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const title = cover.title ?? ebook.title;
  const background = cover.background ?? COVER_BACKGROUNDS[0];
  const lightBg = background.toLowerCase() >= "#a" || ["#f4ede1", "#ece7de"].includes(background);

  return (
    <div className="no-scrollbar flex min-h-0 flex-1 flex-col items-center gap-6 overflow-y-auto bg-background px-4 py-8 lg:flex-row lg:items-start lg:justify-center lg:px-10">
      {/* Live cover preview -- same portrait ratio as the AI image request
          (1024x1536, i.e. 2:3) so an AI-generated cover always fills it
          exactly with no letterboxing. Stacked above the controls until
          `lg` (rather than the usual `sm`) -- this column sits next to the
          page/cover sidebar, so it has less room to work with than a
          typical full-width layout and needs a wider breakpoint before
          going side-by-side without the two overlapping. */}
      <div className="w-full max-w-[320px] shrink-0">
        <div
          className="relative flex aspect-[2/3] w-full flex-col justify-between overflow-hidden rounded-lg p-6 shadow-lg"
          style={{
            backgroundColor: background,
            backgroundImage: cover.imageUrl ? `url(${cover.imageUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            color: cover.imageUrl ? "#fff" : lightBg ? "#1c1c1c" : "#fff",
          }}
        >
          {cover.imageUrl && <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/40" />}
          <div className="relative">
            {cover.subtitle && <p className="text-xs uppercase tracking-wide opacity-80">{cover.subtitle}</p>}
          </div>
          <div className="relative">
            <p className="font-serif text-2xl font-semibold leading-tight">{title}</p>
            {cover.author && <p className="mt-2 text-sm opacity-90">{cover.author}</p>}
          </div>
        </div>
      </div>

      {/* Design controls */}
      <div className="w-full max-w-sm shrink-0 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Cover</h2>
          <span className="text-xs text-muted">{saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : ""}</span>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Title</span>
          <input
            value={cover.title ?? ""}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder={ebook.title}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Subtitle</span>
          <input
            value={cover.subtitle ?? ""}
            onChange={(e) => onChange({ subtitle: e.target.value })}
            placeholder="Optional"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Author</span>
          <input
            value={cover.author ?? ""}
            onChange={(e) => onChange({ author: e.target.value })}
            placeholder="Optional"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
          />
        </label>

        <div>
          <span className="mb-2 block text-xs font-medium text-muted">Background</span>
          <div className="flex flex-wrap gap-2">
            {COVER_BACKGROUNDS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChange({ background: c })}
                style={{ backgroundColor: c }}
                className={`h-7 w-7 rounded-full border transition-transform ${
                  background === c ? "scale-110 border-foreground" : "border-border"
                }`}
                aria-label={c}
              />
            ))}
            <label className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-dashed border-border text-muted hover:text-foreground">
              <span className="pointer-events-none text-sm">+</span>
              <input
                type="color"
                onInput={(e) => onChange({ background: (e.target as HTMLInputElement).value })}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="btn-primary flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            {SparkleIcon} {generating ? "Generating…" : "Generate with AI"}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-1.5 text-xs font-medium hover:bg-surface-2 disabled:opacity-50"
          >
            {UploadIcon} {uploading ? "Uploading…" : "Upload image"}
          </button>
          {cover.imageUrl && (
            <button
              type="button"
              onClick={() => onChange({ imageUrl: undefined })}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-1.5 text-xs font-medium text-muted hover:bg-surface-2"
            >
              Remove image
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <p className="text-xs text-muted">AI generates the artwork only -- title, subtitle, and author are drawn on top by this editor.</p>

        {/* Cross-posting into ChatGiZa's other two products -- Quantara
            (the media feed) and ChackAll (the link-aggregator storefront) --
            using the same cover this tab already builds, instead of asking
            the writer to redo it manually in either place. */}
        <div className="border-t border-border pt-5">
          <p className="mb-2 text-xs font-medium text-muted">Share &amp; sell</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onShareQuantara}
              disabled={sharingQuantara}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-1.5 text-xs font-medium hover:bg-surface-2 disabled:opacity-50"
            >
              {QuantaraIcon} {sharingQuantara ? "Sharing…" : "Share to Quantara"}
            </button>
            <button
              type="button"
              onClick={onSellChackall}
              disabled={sellingChackall}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-1.5 text-xs font-medium hover:bg-surface-2 disabled:opacity-50"
            >
              {ShopIcon} {sellingChackall ? "Listing…" : "Sell on ChackAll"}
            </button>
          </div>
          {quantaraResult && <p className="mt-2 text-xs text-muted">{quantaraResult}</p>}
          {chackallResult && <p className="mt-2 text-xs text-muted">{chackallResult}</p>}
        </div>
      </div>
    </div>
  );
}

export default function EbookEditor({ ebookId, onBack }: { ebookId: string; onBack: () => void }) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coverSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  const [ebook, setEbook] = useState<Ebook | null>(null);
  const [titleValue, setTitleValue] = useState("");
  const [pages, setPages] = useState<Page[]>([]);
  const [activeView, setActiveView] = useState<"cover" | string>("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const [coverDraft, setCoverDraft] = useState<EbookCover>({});
  const [coverSaveStatus, setCoverSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [generatingCover, setGeneratingCover] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [sharingQuantara, setSharingQuantara] = useState(false);
  const [quantaraResult, setQuantaraResult] = useState<string | null>(null);
  const [sellingChackall, setSellingChackall] = useState(false);
  const [chackallResult, setChackallResult] = useState<string | null>(null);

  const [reviewing, setReviewing] = useState(false);
  const [reviewScore, setReviewScore] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<WritingSuggestion[]>([]);
  const [activeIssue, setActiveIssue] = useState<{ suggestion: WritingSuggestion; rect: DOMRect } | null>(null);

  function scheduleSave(pageId: string, value: string) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus("saving");
    saveTimeoutRef.current = setTimeout(async () => {
      await patchPage(ebookId, pageId, { content: value });
      setSaveStatus("saved");
    }, 800);
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Write this page…" }),
      WritingIssues,
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "tiptap-editor w-full text-sm" },
    },
    onUpdate: ({ editor }) => {
      const pageId = pageIdRef.current;
      if (pageId) scheduleSave(pageId, editor.getHTML());
      // Any edit invalidates whatever was reviewed before -- stale
      // suggestions pointing at text that's since changed would be
      // confusing (or, worse, replace the wrong thing).
      if (suggestions.length > 0) {
        setSuggestions([]);
        setReviewScore(null);
      }
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
        const loadedPages: Page[] = pagesData.pages ?? [];
        const firstPage = loadedPages[0];
        if (!firstPage) throw new Error("Book not found");
        setEbook(ebookData.ebook);
        setTitleValue(ebookData.ebook.title);
        setCoverDraft(ebookData.ebook.cover ?? {});
        setPages(loadedPages);
        setActiveView(firstPage.id);
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
    if (!editor || initializedRef.current || pages.length === 0) return;
    initializedRef.current = true;
    editor.commands.setContent(pages[0].content ?? "", { emitUpdate: false });
  }, [editor, pages]);

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

  function switchToPage(p: Page) {
    if (!editor || activeView === p.id) return;
    pageIdRef.current = p.id;
    setActiveView(p.id);
    setSuggestions([]);
    setReviewScore(null);
    setActiveIssue(null);
    editor.commands.setContent(p.content ?? "", { emitUpdate: false });
  }

  async function addPage() {
    const res = await fetch(`/api/ebooks/${ebookId}/pages`, { method: "POST" });
    const data = await res.json();
    if (!res.ok || !data.page) return;
    setPages((prev) => [...prev, data.page]);
    switchToPage(data.page);
  }

  async function deletePage(p: Page) {
    if (pages.length <= 1) return;
    await fetch(`/api/ebooks/${ebookId}/pages/${p.id}`, { method: "DELETE" });
    setPages((prev) => {
      const next = prev.filter((x) => x.id !== p.id);
      if (activeView === p.id) {
        const fallback = next[0];
        if (fallback && editor) {
          pageIdRef.current = fallback.id;
          setActiveView(fallback.id);
          editor.commands.setContent(fallback.content ?? "", { emitUpdate: false });
        }
      }
      return next;
    });
  }

  function saveCover(patch: EbookCover) {
    setCoverDraft((prev) => ({ ...prev, ...patch }));
    setEbook((prev) => (prev ? { ...prev, cover: { ...(prev.cover ?? {}), ...patch } } : prev));
    if (coverSaveTimeoutRef.current) clearTimeout(coverSaveTimeoutRef.current);
    setCoverSaveStatus("saving");
    coverSaveTimeoutRef.current = setTimeout(async () => {
      await patchEbook(ebookId, { cover: patch });
      setCoverSaveStatus("saved");
    }, 800);
  }

  async function generateCover() {
    if (!ebook) return;
    setGeneratingCover(true);
    setCoverError(null);
    try {
      const res = await fetch(`/api/ebooks/${ebookId}/cover/generate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to generate a cover");
      setCoverDraft(data.cover ?? {});
      setEbook((prev) => (prev ? { ...prev, cover: data.cover ?? null } : prev));
    } catch (err) {
      setCoverError(err instanceof Error ? err.message : "Failed to generate a cover");
    } finally {
      setGeneratingCover(false);
    }
  }

  async function uploadCoverImage(file: File) {
    setUploadingCover(true);
    setCoverError(null);
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
      saveCover({ imageUrl: slot.publicUrl });
    } catch (err) {
      setCoverError(err instanceof Error ? err.message : "Failed to upload the image");
    } finally {
      setUploadingCover(false);
    }
  }

  // Fetches the cover image (a remote Storage URL) and re-encodes it as a
  // data: URL -- /api/media/posts only accepts inline image data (same as
  // a normal Quantara post composed from a file picker), not arbitrary
  // remote URLs.
  async function imageUrlToDataUrl(url: string): Promise<string> {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function shareToQuantara() {
    if (!ebook) return;
    setSharingQuantara(true);
    setQuantaraResult(null);
    try {
      const text = [ebook.title, ebook.description].filter(Boolean).join("\n\n");
      const imageDataUrls = coverDraft.imageUrl ? [await imageUrlToDataUrl(coverDraft.imageUrl)] : [];
      const res = await fetch("/api/media/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, imageDataUrls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to share");
      setQuantaraResult("Shared to Quantara.");
    } catch (err) {
      setQuantaraResult(err instanceof Error ? err.message : "Failed to share to Quantara");
    } finally {
      setSharingQuantara(false);
    }
  }

  async function sellOnChackall() {
    if (!ebook) return;
    const shop = getLocalShop();
    if (!shop) {
      setChackallResult("You don't have a ChackAll shop on this browser yet -- create one first at /store.");
      return;
    }
    const price = window.prompt(`Price for "${ebook.title}" (e.g. 10000 TZS)`);
    if (!price) return;
    setSellingChackall(true);
    setChackallResult(null);
    try {
      const res = await fetch(`/api/store/shops/${shop.slug}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: shop.editToken,
          name: coverDraft.title || ebook.title,
          price,
          image: coverDraft.imageUrl || null,
          description: ebook.description,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to list on ChackAll");
      setChackallResult(`Listed on your ChackAll shop "${shop.name}".`);
    } catch (err) {
      setChackallResult(err instanceof Error ? err.message : "Failed to list on ChackAll");
    } finally {
      setSellingChackall(false);
    }
  }

  async function checkWriting() {
    if (!editor) return;
    const text = editor.getText();
    if (!text.trim()) return;
    setReviewing(true);
    setActiveIssue(null);
    try {
      const res = await fetch("/api/ebooks/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);
      setReviewScore(data.score);
      setSuggestions(data.suggestions ?? []);
      editor.view.dispatch(editor.view.state.tr.setMeta(writingIssuesKey, { suggestions: data.suggestions ?? [] }));
    } catch {
      // best-effort -- the button just stops spinning.
    } finally {
      setReviewing(false);
    }
  }

  function dismissIssue(id: string) {
    const next = suggestions.filter((s) => s.id !== id);
    setSuggestions(next);
    setActiveIssue(null);
    editor?.view.dispatch(editor.view.state.tr.setMeta(writingIssuesKey, { suggestions: next }));
  }

  function acceptIssue(id: string) {
    if (!editor) return;
    const range = getWritingIssueRanges(editor.state).find((r) => r.id === id);
    const suggestion = suggestions.find((s) => s.id === id);
    const next = suggestions.filter((s) => s.id !== id);
    if (range && suggestion) {
      // One transaction, not two -- replacing the text and updating the
      // plugin's suggestion list together means the decorations plugin
      // recomputes against the NEW doc using the ALREADY-trimmed list in a
      // single step, rather than briefly recomputing the old (soon to be
      // stale) list against the new doc first, which could otherwise let a
      // now-irrelevant suggestion coincidentally match leftover text.
      // onUpdate (which schedules the autosave) still fires for this --
      // Tiptap wires its own dispatchTransaction handler into
      // editor.view.dispatch regardless of whether the transaction came
      // from a .chain() or, as here, straight off editor.state.tr.
      const tr = editor.state.tr
        .insertText(suggestion.replacement, range.from, range.to)
        .setMeta(writingIssuesKey, { suggestions: next });
      editor.view.dispatch(tr);
    }
    setSuggestions(next);
    setActiveIssue(null);
  }

  // Event delegation on the page canvas -- decorated spans are plain DOM
  // elements ProseMirror renders, not React components, so a single click
  // handler here (checking the clicked element for the decoration's
  // data-suggestion-id) is simpler than trying to attach a handler per span.
  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-suggestion-id]");
    if (!target) {
      editor?.commands.focus();
      return;
    }
    const id = target.getAttribute("data-suggestion-id");
    const suggestion = suggestions.find((s) => s.id === id);
    if (suggestion) setActiveIssue({ suggestion, rect: target.getBoundingClientRect() });
  }

  if (loading) {
    return <div className="h-full bg-background" />;
  }

  if (loadError || pages.length === 0 || !ebook) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-background px-6 text-center text-foreground">
        <p className="text-sm text-muted">{loadError ?? "Book not found"}</p>
        <button onClick={onBack} className="text-sm font-medium underline">
          Back to E-books
        </button>
      </div>
    );
  }

  const activePage = pages.find((p) => p.id === activeView) ?? null;

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      {/* Window-title-bar row -- Back + document title + save status live
          here, like a real word processor's title bar, instead of inside
          the page itself. */}
      <div className="flex h-14 shrink-0 items-center gap-2 bg-background px-3 sm:px-4">
        <button
          onClick={onBack}
          title="Back to E-books"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground"
        >
          {BackIcon}
        </button>
        <input
          value={titleValue}
          onChange={(e) => setTitleValue(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder="Untitled book"
          className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none sm:text-base"
        />
        <span className="w-14 shrink-0 text-right text-xs text-muted">
          {activePage && (saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "")}
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Book navigation -- Cover, then every page in order, matching a
            real word processor's page thumbnails/outline pane. */}
        <div className="flex w-60 shrink-0 flex-col bg-surface py-2 sm:w-72">
          <button
            onClick={() => setActiveView("cover")}
            className={`mx-2 mb-1 flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
              activeView === "cover" ? "bg-surface-2 font-medium text-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            {CoverIcon} Cover
          </button>
          <div className="mx-2 my-1 h-px bg-border" />
          <div className="min-h-0 flex-1 overflow-y-auto px-2">
            {pages.map((p, i) => (
              <div
                key={p.id}
                className={`group mb-1 flex items-center rounded-md ${
                  activeView === p.id ? "bg-surface-2" : "hover:bg-surface-2"
                }`}
              >
                <button
                  onClick={() => switchToPage(p)}
                  className={`flex-1 truncate px-2.5 py-2 text-left text-sm ${
                    activeView === p.id ? "font-medium text-foreground" : "text-muted group-hover:text-foreground"
                  }`}
                >
                  Page {i + 1}
                </button>
                {pages.length > 1 && (
                  <button
                    onClick={() => deletePage(p)}
                    title="Delete page"
                    className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted opacity-0 hover:text-red-500 group-hover:opacity-100"
                  >
                    {TrashIcon}
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addPage}
            className="mx-2 mt-1 flex items-center gap-1.5 rounded-md px-2.5 py-2 text-left text-xs font-medium text-muted hover:bg-surface-2 hover:text-foreground"
          >
            {PlusIcon} Add page
          </button>
        </div>

        {activeView === "cover" ? (
          <CoverEditor
            ebook={ebook}
            cover={coverDraft}
            onChange={saveCover}
            onGenerate={generateCover}
            onUpload={uploadCoverImage}
            generating={generatingCover}
            uploading={uploadingCover}
            saveStatus={coverSaveStatus}
            error={coverError}
            onShareQuantara={shareToQuantara}
            sharingQuantara={sharingQuantara}
            quantaraResult={quantaraResult}
            onSellChackall={sellOnChackall}
            sellingChackall={sellingChackall}
            chackallResult={chackallResult}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            {editor && <Toolbar editor={editor} onCheckWriting={checkWriting} reviewing={reviewing} reviewScore={reviewScore} />}

            {/* Document canvas (matches Word/Docs online) with the page
                itself as a distinct, elevated sheet on top of it --
                bg-surface-2 is this app's own convention for an element
                that needs to read as raised above bg-background, in both
                themes (e.g. chat bubbles). */}
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-background px-4 py-8 sm:px-10" onClick={handleCanvasClick}>
              <div className="mx-auto w-full max-w-[860px]">
                {/* True A4 proportions (210x297mm) -- width capped at 794px
                    (A4's width at the standard 96dpi CSS reference),
                    aspect-ratio derives the matching height. Content longer
                    than one page still grows the box taller naturally. */}
                <div
                  className="mx-auto w-full max-w-[794px] rounded-sm border border-border bg-surface-2 p-10 shadow-lg sm:p-14"
                  style={{ aspectRatio: "210 / 297" }}
                >
                  <EditorContent editor={editor} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {activeIssue && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setActiveIssue(null)} />
          <div
            className="fixed z-50 w-72 rounded-xl border border-border bg-surface p-3 shadow-2xl"
            style={{ top: activeIssue.rect.bottom + 8, left: Math.min(activeIssue.rect.left, window.innerWidth - 300) }}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">{activeIssue.suggestion.category}</span>
              <button onClick={() => setActiveIssue(null)} className="text-muted hover:text-foreground">
                {CloseIcon}
              </button>
            </div>
            <p className="text-sm font-medium">{activeIssue.suggestion.title}</p>
            <p className="mt-1 text-xs text-muted">{activeIssue.suggestion.explanation}</p>
            <div className="mt-2 rounded-lg bg-surface-2 p-2 text-xs">
              <span className="text-red-400 line-through">{activeIssue.suggestion.original}</span>
              <span className="mx-1 text-muted">→</span>
              <span className="text-emerald-500">{activeIssue.suggestion.replacement}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => acceptIssue(activeIssue.suggestion.id)}
                className="btn-primary flex-1 rounded-full py-1.5 text-xs font-medium"
              >
                Replace
              </button>
              <button
                onClick={() => dismissIssue(activeIssue.suggestion.id)}
                className="flex-1 rounded-full border border-border py-1.5 text-xs font-medium hover:bg-surface-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
