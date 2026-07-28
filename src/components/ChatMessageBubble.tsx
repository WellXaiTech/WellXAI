"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Attachment } from "@/lib/attachments";
import { textToPdfBlob } from "@/lib/generatePdf";

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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M17 8l-5-5-5 5" />
    <path d="M12 3v12" />
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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6" />
    <path d="M12 11v6" />
    <path d="M9.5 14.5 12 17l2.5-2.5" />
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

const TrashIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
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

function MoreMenu({ items }: { items: { label: string; icon: React.ReactNode; onClick: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="More"
        className="rounded-md p-1.5 text-muted transition-colors hover:text-foreground"
      >
        {MoreDotsIcon}
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
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-muted hover:bg-surface-2 hover:text-foreground transition-colors"
            >
              {item.icon}
              {item.label}
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

  const menuItems = [{ label: "Download", icon: ShareUpIcon, onClick: onDownload }];
  if (onDelete) menuItems.push({ label: "Delete", icon: TrashIcon, onClick: onDelete });

  return (
    <div className="mt-1 flex items-center gap-1 text-muted">
      <button
        onClick={handleCopyMedia}
        aria-label={`Copy ${kind}`}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:text-foreground transition-colors"
      >
        {CopyIcon}
        {copied ? "Copied" : ""}
      </button>
      <button
        onClick={() => setReaction((r) => (r === "up" ? null : "up"))}
        aria-label="Good response"
        className={`rounded-md p-1.5 transition-colors hover:text-foreground ${reaction === "up" ? "text-foreground" : ""}`}
      >
        {ThumbsUpIcon}
      </button>
      <button
        onClick={() => setReaction((r) => (r === "down" ? null : "down"))}
        aria-label="Bad response"
        className={`rounded-md p-1.5 transition-colors hover:text-foreground ${reaction === "down" ? "text-foreground" : ""}`}
      >
        {ThumbsDownIcon}
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

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = content;
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

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ text: content });
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
    a.click();
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
    const title = content.split("\n")[0].replace(/^#{1,6}\s+/, "").slice(0, 80) || "ChatGiZa reply";
    const blob = await textToPdfBlob(title, content);
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
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      )}
      {!isStreaming && content && !imageUrl && !videoUrl && (
        <div className="mt-1 flex items-center gap-1 text-muted">
          <button
            onClick={handleCopy}
            aria-label="Copy"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:text-foreground transition-colors"
          >
            {CopyIcon}
            {copied ? "Copied" : ""}
          </button>
          <ReactionButtons />
          <button
            onClick={handleShare}
            aria-label="Share"
            className="rounded-md p-1.5 transition-colors hover:text-foreground"
          >
            {ShareUpIcon}
          </button>
          <button
            onClick={handleDownloadPdf}
            aria-label="Download as PDF"
            className="rounded-md p-1.5 transition-colors hover:text-foreground"
          >
            {PdfIcon}
          </button>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              aria-label="Regenerate"
              className="rounded-md p-1.5 transition-colors hover:text-foreground"
            >
              {RegenerateIcon}
            </button>
          )}
          {onDelete && <MoreMenu items={[{ label: "Delete", icon: TrashIcon, onClick: onDelete }]} />}
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
        className={`rounded-md p-1.5 transition-colors hover:text-foreground ${reaction === "up" ? "text-foreground" : ""}`}
      >
        {ThumbsUpIcon}
      </button>
      <button
        onClick={() => setReaction((r) => (r === "down" ? null : "down"))}
        aria-label="Bad response"
        className={`rounded-md p-1.5 transition-colors hover:text-foreground ${reaction === "down" ? "text-foreground" : ""}`}
      >
        {ThumbsDownIcon}
      </button>
    </>
  );
}
