"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Attachment } from "@/lib/attachments";
import { textToPdfBlob } from "@/lib/generatePdf";
import { extractPdfSection, stripPdfMarkers, splitAroundPdfSection, splitTitleAndBody } from "@/lib/pdfMarkers";
import { extractSources, stripSourceMarkers, sourceDomain, type VerifiedSource } from "@/lib/sourceMarkers";
import { speakText, stopSpeaking } from "@/lib/speak";

const FileIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6" />
  </svg>
);

const PencilIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

const CopyIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const ShareUpIcon = (
  // The shared ".icon" wrapper class forces fill:none/stroke:currentColor
  // for the site's stroke-based icon set -- this path is filled, not
  // stroked, so it needs an inline override to survive that wrapper.
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style={{ fill: "currentColor", stroke: "none" }}>
    <path d="M2.668 12.666V12.5a.665.665 0 0 1 1.33 0v.166c0 .711.001 1.205.033 1.588.03.376.087.587.167.745l.07.127c.177.288.43.522.732.676l.13.056c.144.051.333.089.615.112.384.031.877.031 1.588.031h5.333c.711 0 1.205 0 1.588-.031.376-.03.587-.088.745-.168l.127-.071c.288-.176.522-.43.676-.732l.056-.13c.051-.143.089-.333.112-.615.031-.383.031-.877.031-1.588V12.5a.665.665 0 0 1 1.33 0v.166c0 .69 0 1.246-.036 1.697-.033.4-.098.762-.242 1.098l-.066.143c-.266.52-.67.957-1.165 1.26l-.218.123c-.377.192-.783.27-1.241.308-.45.037-1.008.036-1.697.036H7.333c-.689 0-1.246.001-1.696-.036-.4-.033-.761-.097-1.098-.241l-.142-.067a3.17 3.17 0 0 1-1.262-1.165l-.122-.218c-.192-.377-.271-.783-.309-1.241-.036-.45-.036-1.008-.036-1.697m6.667-.166V4.94L7.137 7.137a.665.665 0 0 1-.94-.94L9.53 2.863l.101-.083a.666.666 0 0 1 .839.083l3.334 3.334a.666.666 0 0 1-.941.94L10.665 4.94v7.56a.666.666 0 0 1-1.33 0" />
  </svg>
);

const DownloadIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5" />
    <path d="M12 15V3" />
  </svg>
);

const PdfIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6" />
    <path d="M12 11v6" />
    <path d="M9 14.5 12 17.5 15 14.5" />
  </svg>
);

const RegenerateIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <path d="M8 16H3v5" />
  </svg>
);

const MoreDotsIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="19" cy="12" r="1.6" />
  </svg>
);

const SpeakerIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 5 6 9H2v6h4l5 4Z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
);

const SpeakerOffIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 5 6 9H2v6h4l5 4Z" />
    <path d="M23 9l-6 6" />
    <path d="M17 9l6 6" />
  </svg>
);

const CheckIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const TrashIcon = (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 3.5h6" />
    <path d="M5 5h10" />
    <path d="M7 5v10a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V5" />
    <path d="M8.5 8v5" />
    <path d="M11.5 8v5" />
  </svg>
);

const ThumbsUpIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
);

const ThumbsDownIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
  </svg>
);

function useOutsideClose(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);
  return ref;
}

function MoreMenu({
  items,
}: {
  items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} aria-label="More" className="tool-btn">
        <span className="icon">{MoreDotsIcon}</span>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-1 w-40 rounded-xl border border-border bg-surface p-1 shadow-lg">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className={`menu-item ${item.danger ? "delete" : ""}`}
            >
              <span className="icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MessageAttachments({ attachments }: { attachments: Attachment[] }) {
  const images = attachments.filter((a) => a.kind === "image");
  const files = attachments.filter((a) => a.kind === "text");

  return (
    <div className="mb-1.5 flex flex-wrap justify-end gap-2">
      {images.map((a) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={a.id} src={a.dataUrl} alt={a.name} className="h-24 w-24 rounded-lg object-cover" />
      ))}
      {files.map((a) => (
        <div
          key={a.id}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs"
        >
          <span className="text-muted">{FileIcon}</span>
          <span className="max-w-[160px] truncate">{a.name}</span>
        </div>
      ))}
    </div>
  );
}

function PdfFileCard({ title, onDownload }: { title: string; onDownload: () => void }) {
  return (
    <button
      type="button"
      onClick={onDownload}
      className="my-2 flex w-full max-w-sm items-center gap-3 rounded-xl border border-border bg-surface-2 p-3 text-left transition-colors hover:border-foreground/40"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-foreground">
        {PdfIcon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted">PDF document</span>
      </span>
      <span className="shrink-0 text-muted">{DownloadIcon}</span>
    </button>
  );
}

function PdfFileCardPending() {
  return (
    <div className="my-2 flex w-full max-w-sm items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
      <span className="shimmer-line flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted">
        {PdfIcon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="shimmer-line block h-3.5 w-2/3 rounded" />
        <span className="mt-1.5 block text-xs text-muted">Preparing PDF…</span>
      </span>
    </div>
  );
}

const VerifiedBadgeIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M9 12l2 2 4-4" />
    <circle cx="12" cy="12" r="9" />
  </svg>
);

// Idea #8, the creative part: instead of trusting the model's own prose
// links (which it can invent), this renders the real url_citation data
// OpenAI's search-preview models attach when they actually searched --
// a distinct, collapsible "trail" so a reader can tell "the model says
// so" apart from "this was independently confirmed by N live sources."
function SourceTrail({ sources }: { sources: VerifiedSource[] }) {
  const [expanded, setExpanded] = useState(sources.length <= 3);
  if (sources.length === 0) return null;
  const shown = expanded ? sources : sources.slice(0, 3);
  return (
    <div className="my-2 w-full max-w-sm rounded-xl border border-border bg-surface-2 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-foreground">
        <span className="text-muted">{VerifiedBadgeIcon}</span>
        Verified source trail
        <span className="ml-auto text-muted">
          {sources.length} {sources.length === 1 ? "source" : "sources"}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {shown.map((s, i) => (
          <a
            key={`${s.url}-${i}`}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-background"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://www.google.com/s2/favicons?sz=32&domain=${sourceDomain(s.url)}`}
              alt=""
              className="h-4 w-4 shrink-0 rounded-sm"
            />
            <span className="min-w-0 flex-1 truncate text-xs text-foreground group-hover:underline">{s.title}</span>
            <span className="shrink-0 text-[11px] text-muted">{sourceDomain(s.url)}</span>
          </a>
        ))}
      </div>
      {sources.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 w-full text-center text-[11px] text-muted hover:text-foreground"
        >
          {expanded ? "Show fewer" : `Show all ${sources.length}`}
        </button>
      )}
    </div>
  );
}

function slugifyFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
  return slug || "document";
}

function MediaActionRow({
  url,
  kind,
  onDownload,
  onDelete,
}: {
  url: string;
  kind: "image" | "video";
  onDownload: () => void;
  onDelete?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [reaction, setReaction] = useState<"up" | "down" | null>(null);

  async function handleCopyMedia() {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard image/video copy unsupported in this browser; ignore
    }
  }

  const menuItems: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[] = [
    { label: "Download", icon: ShareUpIcon, onClick: onDownload },
  ];
  if (onDelete) menuItems.push({ label: "Delete", icon: TrashIcon, onClick: onDelete, danger: true });

  return (
    <div className="toolbar mt-1">
      <button onClick={handleCopyMedia} aria-label={`Copy ${kind}`} className="tool-btn">
        <span className="icon">{copied ? CheckIcon : CopyIcon}</span>
      </button>
      <button
        onClick={() => setReaction((r) => (r === "up" ? null : "up"))}
        aria-label="Good response"
        className={`tool-btn ${reaction === "up" ? "is-active" : ""}`}
      >
        <span className="icon">{ThumbsUpIcon}</span>
      </button>
      <button
        onClick={() => setReaction((r) => (r === "down" ? null : "down"))}
        aria-label="Bad response"
        className={`tool-btn ${reaction === "down" ? "is-active" : ""}`}
      >
        <span className="icon">{ThumbsDownIcon}</span>
      </button>
      <MoreMenu items={menuItems} />
    </div>
  );
}

function ImageEditForm({ onSubmit, onCancel }: { onSubmit: (instruction: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSubmit(value.trim());
      }}
      className="mb-1 flex w-full max-w-xs items-center gap-1.5"
    >
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Describe the change…"
        className="flex-1 rounded-full border border-border bg-surface px-3 py-1.5 text-xs outline-none focus:border-foreground/40"
      />
      <button type="submit" className="btn-primary rounded-full px-3 py-1.5 text-xs disabled:opacity-40" disabled={!value.trim()}>
        Apply
      </button>
      <button type="button" onClick={onCancel} className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-2">
        Cancel
      </button>
    </form>
  );
}

export default function ChatMessageBubble({
  role,
  content,
  attachments,
  imageUrl,
  videoUrl,
  isStreaming = false,
  onEdit,
  onEditImage,
  onRegenerate,
  onDelete,
}: {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  imageUrl?: string;
  videoUrl?: string;
  isStreaming?: boolean;
  onEdit?: (newContent: string) => void;
  onEditImage?: (instruction: string) => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingImage, setEditingImage] = useState(false);
  const [overlayCopied, setOverlayCopied] = useState(false);
  const [shareFallbackMsg, setShareFallbackMsg] = useState(false);
  const [pdfFile, setPdfFile] = useState<{ url: string; filename: string; title: string } | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const sources = extractSources(content);
  const contentSansSources = stripSourceMarkers(content);

  const { before: beforePdfText, after: afterPdfText, hasSection: hasPdfSection } = splitAroundPdfSection(contentSansSources);

  useEffect(() => {
    if (isStreaming || !hasPdfSection) return;
    let cancelled = false;
    (async () => {
      const { title, body } = splitTitleAndBody(extractPdfSection(contentSansSources), "Document");
      const blob = await textToPdfBlob(title, body);
      if (cancelled) return;
      setPdfFile((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { url: URL.createObjectURL(blob), filename: `${slugifyFilename(title)}.pdf`, title };
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming, hasPdfSection, content]);

  useEffect(() => {
    return () => {
      if (pdfFile) URL.revokeObjectURL(pdfFile.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCopy() {
    const cleanContent = stripPdfMarkers(contentSansSources);
    try {
      await navigator.clipboard.writeText(cleanContent);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = cleanContent;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
      } catch {
        // clipboard truly unavailable in this environment
      }
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleSpeak() {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    const plainText = stripPdfMarkers(contentSansSources)
      .replace(/```[\s\S]*?```/g, "")
      .replace(/[#*_`>~-]/g, "")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .trim();
    if (!plainText) return;
    setIsSpeaking(true);
    speakText(plainText, () => setIsSpeaking(false), () => setIsSpeaking(false));
  }

  useEffect(() => {
    return () => {
      if (isSpeaking) stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ text: stripPdfMarkers(contentSansSources) });
        return;
      } catch {
        // user cancelled or share failed; fall through to clipboard copy
      }
    }
    handleCopy();
  }

  function downloadUrl(url: string, filename: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function handleCopyImage(url: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setOverlayCopied(true);
      setTimeout(() => setOverlayCopied(false), 1500);
    } catch {
      // clipboard image copy unsupported in this browser; ignore
    }
  }

  async function handleShareImage(url: string, filename: string) {
    if (navigator.share) {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const file = new File([blob], filename, { type: blob.type });
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] });
          return;
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return; // user cancelled the share sheet
        // file sharing unsupported/failed; fall through to download
      }
    }
    downloadUrl(url, filename);
    setShareFallbackMsg(true);
    setTimeout(() => setShareFallbackMsg(false), 3000);
  }

  async function handleDownloadPdf() {
    if (pdfFile) {
      downloadUrl(pdfFile.url, pdfFile.filename);
      return;
    }
    const { title, body } = splitTitleAndBody(extractPdfSection(contentSansSources), "ChatGiZa reply");
    const blob = await textToPdfBlob(title, body);
    const url = URL.createObjectURL(blob);
    downloadUrl(url, "chatgiza-reply.pdf");
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (role === "user") {
    if (isEditing) {
      return (
        <div className="flex w-full flex-col items-end gap-2">
          {attachments && attachments.length > 0 && <MessageAttachments attachments={attachments} />}
          <textarea
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={3}
            className="w-full max-w-[80%] rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-foreground/40"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                onEdit?.(editValue);
              }}
              disabled={!editValue.trim()}
              className="btn-primary rounded-full px-3 py-1.5 text-xs disabled:opacity-40"
            >
              Save & submit
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="group flex flex-col items-end">
        {attachments && attachments.length > 0 && <MessageAttachments attachments={attachments} />}
        {content && (
          <div className="chat-text user-bubble max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3">
            {content}
          </div>
        )}
        {content && (
          <div className="mt-1 hidden items-center gap-1 group-hover:flex">
            <button
              onClick={handleCopy}
              aria-label="Copy"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:text-foreground transition-colors"
            >
              {CopyIcon}
              {copied ? "Copied" : ""}
            </button>
            {onEdit && (
              <button
                onClick={() => {
                  setEditValue(content);
                  setIsEditing(true);
                }}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:text-foreground transition-colors"
              >
                {PencilIcon}
                Edit
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start">
      {imageUrl && (
        <>
          <div className="group relative mb-1 w-fit">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="block cursor-pointer"
              aria-label="View larger"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={content || "Generated image"}
                className="max-w-xl rounded-2xl border border-border sm:max-w-2xl"
              />
            </button>
            <div
              className={`absolute right-2 top-2 flex gap-1.5 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100 ${
                editingImage ? "opacity-100" : "opacity-0"
              }`}
            >
              {onEditImage && (
                <button
                  type="button"
                  onClick={() => setEditingImage((v) => !v)}
                  aria-label="Edit"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                >
                  {PencilIcon}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleShareImage(imageUrl, "chatgiza-image.png")}
                aria-label="Share"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
              >
                {ShareUpIcon}
              </button>
              <button
                type="button"
                onClick={() => handleCopyImage(imageUrl)}
                aria-label="Copy image"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
              >
                {overlayCopied ? "✓" : CopyIcon}
              </button>
              <button
                type="button"
                onClick={() => downloadUrl(imageUrl, "chatgiza-image.png")}
                aria-label="Download"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
              >
                {DownloadIcon}
              </button>
            </div>
            {shareFallbackMsg && (
              <div className="absolute right-2 top-12 z-10 max-w-[220px] rounded-lg bg-black/80 px-3 py-2 text-xs text-white shadow-lg">
                Direct share isn&apos;t supported in this browser — image downloaded instead. You can attach it manually in TikTok, Instagram, etc.
              </div>
            )}
          </div>
          {editingImage && onEditImage && (
            <ImageEditForm
              onSubmit={(instruction) => {
                setEditingImage(false);
                onEditImage(instruction);
              }}
              onCancel={() => setEditingImage(false)}
            />
          )}
          <MediaActionRow
            url={imageUrl}
            kind="image"
            onDownload={() => downloadUrl(imageUrl, "chatgiza-image.png")}
            onDelete={onDelete}
          />
        </>
      )}
      {previewOpen && imageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setPreviewOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={content || "Generated image"}
            className="max-h-full max-w-full rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setPreviewOpen(false)}
            aria-label="Close preview"
            className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg text-white hover:bg-white/20"
          >
            👆
          </button>
        </div>
      )}
      {videoUrl && (
        <>
          <div className="group relative mb-1 w-fit">
            <video src={videoUrl} controls className="max-w-xl rounded-2xl border border-border sm:max-w-2xl" />
            <button
              type="button"
              onClick={() => downloadUrl(videoUrl, "chatgiza-video.mp4")}
              aria-label="Download"
              className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity duration-150 hover:bg-black/70 group-hover:opacity-100 focus-within:opacity-100"
            >
              {ShareUpIcon}
            </button>
          </div>
          <MediaActionRow
            url={videoUrl}
            kind="video"
            onDownload={() => downloadUrl(videoUrl, "chatgiza-video.mp4")}
            onDelete={onDelete}
          />
        </>
      )}
      {content && (
        <div className="markdown assistant-reply chat-text w-full max-w-none">
          {hasPdfSection ? (
            <>
              {beforePdfText.trim() && (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{stripPdfMarkers(beforePdfText)}</ReactMarkdown>
              )}
              {pdfFile ? (
                <PdfFileCard title={pdfFile.title} onDownload={() => downloadUrl(pdfFile.url, pdfFile.filename)} />
              ) : (
                <PdfFileCardPending />
              )}
              {afterPdfText.trim() && (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{stripPdfMarkers(afterPdfText)}</ReactMarkdown>
              )}
            </>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{stripPdfMarkers(contentSansSources)}</ReactMarkdown>
          )}
        </div>
      )}
      {!isStreaming && sources.length > 0 && <SourceTrail sources={sources} />}
      {!isStreaming && content && !imageUrl && !videoUrl && (
        <div className="toolbar mt-1">
          <button onClick={handleCopy} aria-label="Copy" className="tool-btn">
            <span className="icon">{copied ? CheckIcon : CopyIcon}</span>
          </button>
          <ReactionButtons />
          <button onClick={handleShare} aria-label="Share" className="tool-btn">
            <span className="icon">{ShareUpIcon}</span>
          </button>
          <button onClick={handleDownloadPdf} aria-label="Download as PDF" className="tool-btn">
            <span className="icon">{PdfIcon}</span>
          </button>
          <button
            onClick={handleSpeak}
            aria-label={isSpeaking ? "Stop reading aloud" : "Read aloud"}
            className={`tool-btn ${isSpeaking ? "is-active" : ""}`}
          >
            <span className="icon">{isSpeaking ? SpeakerOffIcon : SpeakerIcon}</span>
          </button>
          {onRegenerate && (
            <button onClick={onRegenerate} aria-label="Regenerate" className="tool-btn">
              <span className="icon">{RegenerateIcon}</span>
            </button>
          )}
          {onDelete && (
            <MoreMenu items={[{ label: "Delete", icon: TrashIcon, onClick: onDelete, danger: true }]} />
          )}
        </div>
      )}
    </div>
  );
}

function ReactionButtons() {
  const [reaction, setReaction] = useState<"up" | "down" | null>(null);
  return (
    <>
      <button
        onClick={() => setReaction((r) => (r === "up" ? null : "up"))}
        aria-label="Good response"
        className={`tool-btn ${reaction === "up" ? "is-active" : ""}`}
      >
        <span className="icon">{ThumbsUpIcon}</span>
      </button>
      <button
        onClick={() => setReaction((r) => (r === "down" ? null : "down"))}
        aria-label="Bad response"
        className={`tool-btn ${reaction === "down" ? "is-active" : ""}`}
      >
        <span className="icon">{ThumbsDownIcon}</span>
      </button>
    </>
  );
}
