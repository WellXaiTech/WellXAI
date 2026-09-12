"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Sentiment = "bullish" | "neutral" | "bearish";

type MediaPost = {
  id: string;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  text: string;
  imageDataUrl: string | null;
  imageUrls: string[];
  videoUrl: string | null;
  sentiment: Sentiment | null;
  destination?: "post" | "status" | "both";
  createdAt: number;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
};

type Comment = {
  id: string;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  text: string;
  createdAt: number;
};

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
// Caps WIDTH specifically, not whichever side is longer -- posts always
// display images at full card width (see MediaCarousel), so width is what
// actually determines sharpness/gutters there. Capping by the longer side
// instead (as this used to) shrank a portrait phone screenshot's WIDTH way
// down to keep its height in check, which is exactly what left it too
// narrow to fill a feed card -- height is left alone here, however tall
// that makes a portrait photo.
const MAX_IMAGE_WIDTH = 1080;
const MAX_IMAGES_PER_POST = 10;
const ALLOWED_VIDEO_MIME = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const ImageIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);
const VideoIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="5" width="14" height="14" rx="2" />
    <path d="M17 9l4-2v10l-4-2Z" />
  </svg>
);
const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z" />
  </svg>
);
const CommentIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);
const RepostIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 1l4 4-4 4" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 23l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);
const SendIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
  </svg>
);
const BookmarkIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21 12 16l-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />
  </svg>
);
const ChevronLeftIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
const ChevronRightIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);
const CloseIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
const BriefcaseIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M3 12.5h18" />
  </svg>
);
const StarIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" />
  </svg>
);
const PeopleIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="4" />
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <path d="M16 3.128a4 4 0 0 1 0 7.744" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
  </svg>
);
const CalendarIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18" />
    <path d="M8 3v4" />
    <path d="M16 3v4" />
  </svg>
);
const PlusSmallIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

// Top nav bar icons -- LinkedIn-style structure requested as a visual
// reference; these tabs are decorative placeholders for now (showComingSoon
// on click), not wired to real features yet.
const NavSearchIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);
const NavHomeIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10v10h14V10" />
  </svg>
);
const NavNetworkIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="3" />
    <circle cx="17" cy="6" r="2.3" />
    <path d="M2.5 20a5.5 5.5 0 0 1 11 0" />
    <path d="M14.5 20a4.2 4.2 0 0 1 7.8-2.2" />
  </svg>
);
const NavJobsIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M3 12.5h18" />
  </svg>
);
const NavBellIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 4.5 1.5 6 2 6.5H4c.5-.5 2-2 2-6.5Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </svg>
);
const NavGridIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="5" r="1.6" />
    <circle cx="12" cy="5" r="1.6" />
    <circle cx="19" cy="5" r="1.6" />
    <circle cx="5" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="19" cy="12" r="1.6" />
    <circle cx="5" cy="19" r="1.6" />
    <circle cx="12" cy="19" r="1.6" />
    <circle cx="19" cy="19" r="1.6" />
  </svg>
);
const NavChevronDownIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const SENTIMENTS: { key: Sentiment; label: string; className: string }[] = [
  { key: "bullish", label: "Bullish", className: "text-green-500 border-green-500/40 bg-green-500/10" },
  { key: "neutral", label: "Neutral", className: "text-muted border-border bg-surface-2" },
  { key: "bearish", label: "Bearish", className: "text-red-500 border-red-500/40 bg-red-500/10" },
];

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Downscales + re-encodes as JPEG so a phone camera photo doesn't blow past
// the post size cap -- same maxDim/quality approach as the Android app's
// uriToPostImageDataUrl.
async function compressImageFile(file: File): Promise<string> {
  const original = await readFileAsDataUrl(file);
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = original;
  });
  const scale = Math.min(1, MAX_IMAGE_WIDTH / img.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return original;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function Avatar({ src, name }: { src: string | null; name: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-sm">
      {name?.[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

// Left/right sidebar cards -- LinkedIn's 3-column layout, requested as a
// visual reference. Real where Quantara actually has the data (name,
// avatar); everywhere else (Connections count, Premium, Saved
// items/Groups/Newsletters/Events, puzzles, suggested pages) is a decorative
// placeholder that shows a "coming soon" toast on click rather than
// claiming a feature -- or specific real people/pages -- that don't exist.
function ProfileSidebarCard({
  name,
  image,
  onAction,
}: {
  name: string;
  image: string | null;
  onAction: (label: string) => void;
}) {
  return (
    <div className="w-[240px] shrink-0 space-y-2">
      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="h-2 bg-gradient-to-r from-amber-300 to-orange-500" />
        <div className="px-2 pb-3 pt-2">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-lg font-semibold">
              {name[0]?.toUpperCase() ?? "?"}
            </span>
          )}
          <p className="mt-2 truncate text-[15px] font-semibold">{name}</p>
          <p className="text-xs text-muted">On Quantara</p>
          <button
            type="button"
            onClick={() => onAction("Experience")}
            className="mt-3 flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted transition-colors hover:text-foreground"
          >
            {BriefcaseIcon}
            Experience
          </button>
        </div>
        <button
          type="button"
          onClick={() => onAction("Connections")}
          className="flex w-full items-center justify-between border-t border-border px-2 py-2 text-xs transition-colors hover:bg-surface-2"
        >
          <span className="text-muted">Connections</span>
          <span className="font-semibold">0</span>
        </button>
      </div>

      <button
        type="button"
        onClick={() => onAction("Premium")}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-2 py-2.5 text-left text-xs text-muted transition-colors hover:text-foreground"
      >
        {StarIcon}
        <span>Access exclusive tools &amp; insights</span>
      </button>

      <div className="rounded-lg border border-border bg-background py-1">
        {[
          { icon: BookmarkIcon, label: "Saved items" },
          { icon: PeopleIcon, label: "Groups" },
          { icon: CommentIcon, label: "Newsletters" },
          { icon: CalendarIcon, label: "Events" },
        ].map((row) => (
          <button
            key={row.label}
            type="button"
            onClick={() => onAction(row.label)}
            className="flex w-full items-center gap-3 px-2 py-2 text-left text-sm transition-colors hover:bg-surface-2"
          >
            <span className="text-muted">{row.icon}</span>
            {row.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SuggestionsSidebarCard({ onAction }: { onAction: (label: string) => void }) {
  return (
    <div className="w-[240px] shrink-0 space-y-2">
      <div className="rounded-lg border border-border bg-background px-2 py-3">
        <p className="mb-1.5 text-sm font-semibold">Today&apos;s puzzles</p>
        <div className="space-y-1">
          {[
            { emoji: "🧩", label: "Quantara Quiz" },
            { emoji: "🔤", label: "Word Chain" },
            { emoji: "🎯", label: "Daily Pick" },
          ].map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onAction(p.label)}
              className="flex w-full items-center gap-3 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-surface-2"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-base">{p.emoji}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{p.label}</span>
              <span className="text-muted">{ChevronRightIcon}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background px-2 py-3">
        <p className="mb-2 text-sm font-semibold">Add to your feed</p>
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-sm font-semibold text-muted">
                P{n}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">Suggested Page {n}</p>
                <p className="text-xs text-muted">Suggested for you</p>
              </div>
              <button
                type="button"
                onClick={() => onAction(`Suggested Page ${n}`)}
                aria-label="Follow"
                className="shrink-0 rounded-full border border-border p-1.5 text-muted transition-colors hover:text-foreground"
              >
                {PlusSmallIcon}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CommentsPanel({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/media/posts/${postId}/comments`)
      .then((r) => r.json())
      .then((data) => setComments(data.comments ?? []))
      .catch(() => setComments([]));
  }, [postId]);

  async function send() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/media/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await res.json();
      if (res.ok) {
        setComments((prev) => [...(prev ?? []), data.comment]);
        setText("");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      {comments === null ? (
        <p className="text-xs text-muted">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted">No comments yet — be the first.</p>
      ) : (
        comments.map((c) => (
          <div key={c.id} className="flex items-start gap-2.5">
            <Avatar src={c.authorImage} name={c.authorName} />
            <div className="min-w-0 flex-1 rounded-2xl bg-surface-2 px-3 py-2">
              <div className="flex items-baseline gap-2">
                <span className="truncate text-xs font-medium">{c.authorName}</span>
                <span className="shrink-0 text-[11px] text-muted">{timeAgo(c.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm">{c.text}</p>
            </div>
          </div>
        ))
      )}
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder="Write a comment…"
          className="flex-1 rounded-full border border-border bg-background px-3.5 py-2 text-sm outline-none focus:border-foreground/40"
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="shrink-0 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function MediaCarousel({ imageUrls }: { imageUrls: string[] }) {
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  if (imageUrls.length === 0) return null;
  const multi = imageUrls.length > 1;

  return (
    <>
      <div className="relative mt-3 flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrls[index]}
          alt=""
          onClick={() => setLightboxOpen(true)}
          // Cropping to a fixed frame (tried, reverted) loses real content
          // on phone-screenshot-shaped photos -- a portrait photo like a
          // receipt or a chat screenshot needs to actually be readable, not
          // sliced. So instead: no cropping, no forced/capped height --
          // max-w-full lets the browser scale the photo down only as much
          // as needed to fit the card's width (real camera/screenshot
          // photos always have far more native pixels than any card width,
          // so this reliably fills the full width with zero gutters), and
          // the resulting height is whatever that photo's own aspect ratio
          // needs -- tall for a portrait screenshot, short for a landscape
          // photo. A tall card for a tall photo is expected, not a bug.
          className="max-w-full cursor-zoom-in rounded-xl"
        />
        {multi && (
          <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
            {index + 1}/{imageUrls.length}
          </span>
        )}
        {multi && index > 0 && (
          <button
            onClick={() => setIndex((i) => i - 1)}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
          >
            {ChevronLeftIcon}
          </button>
        )}
        {multi && index < imageUrls.length - 1 && (
          <button
            onClick={() => setIndex((i) => i + 1)}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
          >
            {ChevronRightIcon}
          </button>
        )}
      </div>
      {multi && (
        <div className="mt-2 flex justify-center gap-1.5">
          {imageUrls.map((_, i) => (
            <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-foreground" : "bg-border"}`} />
          ))}
        </div>
      )}

      {lightboxOpen && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-6"
        >
          <button
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          >
            {CloseIcon}
          </button>
          {multi && index > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIndex((i) => i - 1);
              }}
              aria-label="Previous photo"
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            >
              {ChevronLeftIcon}
            </button>
          )}
          {multi && index < imageUrls.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIndex((i) => i + 1);
              }}
              aria-label="Next photo"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            >
              {ChevronRightIcon}
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrls[index]}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
          />
        </div>
      )}
    </>
  );
}

function PostCard({ post, onLike }: {
  post: MediaPost;
  onLike: (id: string) => void;
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const sentiment = SENTIMENTS.find((s) => s.key === post.sentiment);

  return (
    <div className="rounded-2xl border border-border bg-background px-3 py-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Avatar src={post.authorImage} name={post.authorName} />
          <div>
            <p className="text-sm font-medium">{post.authorName}</p>
            <p className="text-xs text-muted">{timeAgo(post.createdAt)}</p>
          </div>
        </div>
        {sentiment && (
          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${sentiment.className}`}>{sentiment.label}</span>
        )}
      </div>

      {post.text && <p className="mt-3 whitespace-pre-wrap break-words text-[15px]">{post.text}</p>}

      <MediaCarousel imageUrls={post.imageUrls} />
      {post.videoUrl && (
        // preload="metadata" -- without it, every video in the feed (not
        // just the one actually being watched) starts fetching its full
        // file the moment it's rendered, so scrolling past several posts
        // means several full videos competing for bandwidth at once. That
        // reads as "spinning a lot" regardless of how fast the connection
        // is, since it's simultaneous-download contention, not throughput.
        <video src={post.videoUrl} controls preload="metadata" className="mt-3 max-h-[80vh] w-full rounded-xl bg-black object-contain" />
      )}

      <div className="mt-3 flex items-center gap-4 border-t border-border pt-3">
        <button
          onClick={() => onLike(post.id)}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            post.likedByMe ? "text-[#b3413e]" : "text-muted hover:text-foreground"
          }`}
        >
          <HeartIcon filled={post.likedByMe} /> {post.likeCount}
        </button>
        <button
          onClick={() => setCommentsOpen((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          {CommentIcon} {post.commentCount}
        </button>
        <span className="flex items-center gap-1.5 text-sm text-muted">{RepostIcon} 0</span>
        <span className="flex items-center gap-1.5 text-sm text-muted">{SendIcon}</span>
        <span className="ml-auto text-muted">{BookmarkIcon}</span>
      </div>

      {commentsOpen && <CommentsPanel postId={post.id} />}
    </div>
  );
}

export default function ChatGizaMediaFeed({
  onWidthChange,
  standalone,
}: {
  // Reports how much horizontal space this panel actually occupies (0 when
  // it isn't docked, e.g. below the dock breakpoint) so the chat column in
  // page.tsx can push over by exactly that much instead of
  // covering/being covered by it. Not used in standalone mode.
  onWidthChange?: (width: number) => void;
  // Renders as a normal full page (chatgiza.com/quantara) instead of the
  // docked/resizable floating panel used inside the Ask chat -- no fixed
  // positioning, no drag-to-resize, sidebars follow the real viewport width
  // instead of a panel width someone dragged.
  standalone?: boolean;
}) {
  const { data: session } = useSession();
  // Docked-mode width is user-resizable (drag the left edge) and remembered
  // per-device, same as quantaraDark below -- null means "use the default
  // xl:/2xl: Tailwind width" until the user drags it at least once.
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [panelWidth, setPanelWidth] = useState<number | null>(null);
  // Only docks (and so is only resizable) at xl+ -- below that the panel is
  // always full-width, same breakpoint the Tailwind classes below use.
  const [canDock, setCanDock] = useState(true);
  const [is2xl, setIs2xl] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("chatgiza:quantara-panel-width");
    const n = stored ? Number(stored) : NaN;
    if (!Number.isNaN(n)) setPanelWidth(n);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const update = () => setCanDock(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1536px)");
    const update = () => setIs2xl(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Wider defaults -- this panel is where photos/videos on posts actually
  // get seen and posted, so it needs real room, not a cramped strip.
  const dockedWidth = panelWidth ?? (is2xl ? 1000 : 800);
  useEffect(() => {
    onWidthChange?.(canDock ? dockedWidth : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDock, dockedWidth]);
  // The 3-column LinkedIn-style layout needs real room for both side cards
  // plus a usable feed in the middle -- below this, drop to the single feed
  // column instead of cramming everything. Standalone has no panel-width
  // concept (dockedWidth is a docked-panel thing) -- it just follows the
  // real viewport width via canDock.
  const showSidebars = standalone ? canDock : canDock && dockedWidth >= 900;

  function onResizeMove(e: PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    // Right-docked panel -- dragging the left edge further left (smaller
    // clientX) should widen it.
    const next = Math.min(1400, Math.max(420, drag.startWidth + (drag.startX - e.clientX)));
    setPanelWidth(next);
  }

  function endResize() {
    dragRef.current = null;
    document.body.style.userSelect = "";
    window.removeEventListener("pointermove", onResizeMove);
    window.removeEventListener("pointerup", endResize);
    setPanelWidth((w) => {
      if (w != null) localStorage.setItem("chatgiza:quantara-panel-width", String(w));
      return w;
    });
  }

  function beginResize(e: React.PointerEvent) {
    if (!panelRef.current) return;
    dragRef.current = { startX: e.clientX, startWidth: panelRef.current.getBoundingClientRect().width };
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onResizeMove);
    window.addEventListener("pointerup", endResize);
  }

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onResizeMove);
      window.removeEventListener("pointerup", endResize);
      document.body.style.userSelect = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Quantara's own light/dark toggle, independent of the main site's theme.
  // Defaults to light/white now (still toggleable, and still overridden by
  // any previously-stored per-device preference below).
  const [quantaraDark, setQuantaraDark] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [posts, setPosts] = useState<MediaPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  function loadFeed() {
    fetch("/api/media/posts")
      .then((r) => r.json())
      .then((data) => setPosts(data.posts ?? []))
      .catch(() => setError("Couldn't load Quantara"));
  }

  useEffect(() => {
    loadFeed();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("chatgiza:quantara-dark");
    if (stored !== null) setQuantaraDark(stored === "true");
  }, []);

  function showComingSoon(label: string) {
    setToast(`${label} — coming soon`);
    setTimeout(() => setToast(null), 2000);
  }

  async function handlePickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_IMAGES_PER_POST - imagePreviews.length);
    e.target.value = "";
    if (files.length === 0) return;
    clearVideo();
    try {
      const compressed = await Promise.all(files.map(compressImageFile));
      setImagePreviews((prev) => [...prev, ...compressed].slice(0, MAX_IMAGES_PER_POST));
    } catch {
      setError("Couldn't read one of those photos");
    }
  }

  function removeImageAt(index: number) {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function handlePickVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ALLOWED_VIDEO_MIME.has(file.type)) {
      setError("Video must be MP4, WebM, or MOV");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError("Video must be under 50MB");
      return;
    }
    setImagePreviews([]);
    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
  }

  function clearVideo() {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoFile(null);
    setVideoPreviewUrl(null);
  }

  async function uploadVideoAndGetUrl(file: File): Promise<string | null> {
    setUploadStatus("Uploading video…");
    const slotRes = await fetch("/api/media/video-upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mime: file.type }),
    });
    if (!slotRes.ok) return null;
    const slot = await slotRes.json();

    const { error } = await supabaseBrowser.storage.from("media-video").uploadToSignedUrl(slot.path, slot.token, file);
    if (error) {
      console.error("video upload error:", error);
      return null;
    }
    return slot.publicUrl as string;
  }

  async function handlePost() {
    if (!text.trim() && imagePreviews.length === 0 && !videoFile) return;
    setPosting(true);
    setError(null);
    try {
      let videoUrl: string | null = null;
      if (videoFile) {
        videoUrl = await uploadVideoAndGetUrl(videoFile);
        if (!videoUrl) {
          setError("Couldn't upload that video, try again");
          setPosting(false);
          setUploadStatus(null);
          return;
        }
      }
      setUploadStatus(null);

      const res = await fetch("/api/media/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), imageDataUrls: imagePreviews, videoUrl, sentiment: null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post");

      setPosts((prev) => [data.post, ...(prev ?? [])]);
      setText("");
      setImagePreviews([]);
      clearVideo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setPosting(false);
      setUploadStatus(null);
    }
  }

  async function handleLike(postId: string) {
    setPosts((prev) =>
      prev?.map((p) =>
        p.id === postId ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) } : p
      ) ?? null
    );
    try {
      const res = await fetch(`/api/media/posts/${postId}/like`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setPosts((prev) => prev?.map((p) => (p.id === postId ? { ...p, likedByMe: data.liked, likeCount: data.likeCount } : p)) ?? null);
      }
    } catch {
      // best-effort -- optimistic update stays if the request fails silently
    }
  }

  return (
    // Independent of the site's light/dark theme setting -- quantaraDark
    // above controls this instead. Overriding these CSS vars here (instead
    // of on every className below) cascades through every
    // bg-background/text-muted/border-border/etc. Tailwind class used
    // throughout this file and its child components for free.
    <div
      ref={panelRef}
      // Side-panel mode only docks once the viewport is wide enough to
      // leave the chat genuinely usable next to it (see the matching
      // reported width read by page.tsx) -- below that it falls through to
      // full-width, since there's no room to dock. Standalone (its own real
      // page at chatgiza.com/quantara) is never fixed/floating or
      // resizable -- it's just a normal page filling the viewport.
      // text-foreground here (not just on individual elements) matters:
      // color is inherited, but only elements that re-declare it actually
      // re-resolve --foreground at this scope -- without this, any text
      // below that doesn't set its own text color falls back to the outer
      // app's (dark-mode) --foreground instead of Quantara's own, showing
      // up as near-invisible light-gray text on these light cards.
      className={
        standalone
          ? "relative flex min-h-screen w-full flex-col bg-background text-foreground"
          : "fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-background text-foreground shadow-2xl xl:w-[800px] 2xl:w-[1000px]"
      }
      style={{
        ...(quantaraDark
          ? ({
              "--background": "#10141f",
              "--foreground": "#e5ebfa",
              "--surface": "#171d2f",
              "--surface-2": "#1c2333",
              "--border": "#262e3f",
              "--muted": "#9aa3b2",
            } as React.CSSProperties)
          : ({
              "--background": "#ffffff",
              "--foreground": "#0f1420",
              "--surface": "#f4f5f8",
              "--surface-2": "#eaecf1",
              "--border": "#dde0e8",
              "--muted": "#6b7280",
            } as React.CSSProperties)),
        ...(!standalone && canDock && panelWidth ? { width: panelWidth } : {}),
      }}
    >
      {!standalone && canDock && (
        <div
          onPointerDown={beginResize}
          aria-hidden="true"
          className="absolute left-0 top-0 z-10 h-full w-1.5 cursor-ew-resize touch-none hover:bg-foreground/10 active:bg-foreground/20"
        />
      )}
      {/* Top nav bar, LinkedIn-style layout requested as a visual reference.
          Decorative placeholder for now -- every tab besides Home (which
          already has a real destination: back to the feed) shows a
          "coming soon" toast rather than claiming a feature that doesn't
          exist yet. Close/settings/expand -- previously their own separate
          header row -- now live in the compact cluster at the far right of
          this same bar instead, the standard spot for panel controls. */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-3 pb-2 pt-3">
        <button
          type="button"
          onClick={() => showComingSoon("Search")}
          className="flex h-9 min-w-0 max-w-[360px] flex-1 items-center gap-2 rounded-full border border-border bg-background px-3 text-sm text-muted transition-colors hover:border-foreground/30"
        >
          {NavSearchIcon}
          <span className="truncate">Search</span>
        </button>
        <div className="flex items-center gap-3 overflow-x-auto sm:gap-4">
          <button
            type="button"
            className="flex shrink-0 flex-col items-center gap-0.5 border-b-2 border-transparent px-1 pb-1.5 pt-1 text-foreground"
          >
            {NavHomeIcon}
            <span className="text-[11px] font-medium">Home</span>
          </button>
          <button
            type="button"
            onClick={() => showComingSoon("My Network")}
            className="flex shrink-0 flex-col items-center gap-0.5 border-b-2 border-transparent px-1 pb-1.5 pt-1 text-muted transition-colors hover:text-foreground"
          >
            {NavNetworkIcon}
            <span className="text-[11px]">My Network</span>
          </button>
          <button
            type="button"
            onClick={() => showComingSoon("Jobs")}
            className="flex shrink-0 flex-col items-center gap-0.5 border-b-2 border-transparent px-1 pb-1.5 pt-1 text-muted transition-colors hover:text-foreground"
          >
            {NavJobsIcon}
            <span className="text-[11px]">Jobs</span>
          </button>
          <button
            type="button"
            onClick={() => showComingSoon("Messaging")}
            className="flex shrink-0 flex-col items-center gap-0.5 border-b-2 border-transparent px-1 pb-1.5 pt-1 text-muted transition-colors hover:text-foreground"
          >
            {CommentIcon}
            <span className="text-[11px]">Messaging</span>
          </button>
          <button
            type="button"
            onClick={() => showComingSoon("Notifications")}
            className="flex shrink-0 flex-col items-center gap-0.5 border-b-2 border-transparent px-1 pb-1.5 pt-1 text-muted transition-colors hover:text-foreground"
          >
            {NavBellIcon}
            <span className="text-[11px]">Notifications</span>
          </button>
          <button
            type="button"
            onClick={() => showComingSoon("Me")}
            className="flex shrink-0 flex-col items-center gap-0.5 border-b-2 border-transparent px-1 pb-1.5 pt-1 text-muted transition-colors hover:text-foreground"
          >
            <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-[10px] font-semibold text-foreground">
              {session?.user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.user.image} alt="" className="h-5 w-5 object-cover" />
              ) : (
                (session?.user?.name?.[0] ?? "?")
              )}
            </span>
            <span className="flex items-center gap-0.5 text-[11px]">
              Me
              {NavChevronDownIcon}
            </span>
          </button>
          <span className="h-8 w-px shrink-0 bg-border" />
          <button
            type="button"
            onClick={() => showComingSoon("For Business")}
            className="flex shrink-0 flex-col items-center gap-0.5 border-b-2 border-transparent px-1 pb-1.5 pt-1 text-muted transition-colors hover:text-foreground"
          >
            {NavGridIcon}
            <span className="flex items-center gap-0.5 text-[11px]">
              For Business
              {NavChevronDownIcon}
            </span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-surface-2 px-3 py-6">
        {/* No max-width cap -- the feed (and the photos/videos in it) should
            use the panel's full real width, not sit in a narrow
            reading-width column with dead space on either side. */}
        <div className="mx-auto flex items-start gap-2">
          {showSidebars && (
            <ProfileSidebarCard
              name={session?.user?.name ?? "Guest"}
              image={session?.user?.image ?? null}
              onAction={showComingSoon}
            />
          )}
          <div className="min-w-0 flex-1 space-y-2">
          <div className="rounded-2xl border border-border bg-background px-3 py-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                // Enter posts, Shift+Enter still inserts a newline.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handlePost();
                }
              }}
              placeholder="Share something with Quantara…"
              rows={3}
              className="w-full resize-none bg-transparent text-[15px] outline-none placeholder:text-muted"
            />

            {imagePreviews.length > 0 && (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {imagePreviews.map((src, i) => (
                  <div key={i} className="relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-24 w-24 rounded-xl object-cover" />
                    <button
                      onClick={() => removeImageAt(i)}
                      aria-label="Remove photo"
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                    >
                      {CloseIcon}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {videoPreviewUrl && (
              <div className="relative mt-2 inline-block">
                <video src={videoPreviewUrl} controls className="max-h-64 rounded-xl bg-black" />
                <button
                  onClick={clearVideo}
                  aria-label="Remove video"
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                >
                  {CloseIcon}
                </button>
              </div>
            )}

            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <div className="flex items-center gap-1">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePickImages}
                />
                <button
                  onClick={() => imageInputRef.current?.click()}
                  aria-label="Attach photos"
                  disabled={imagePreviews.length >= MAX_IMAGES_PER_POST}
                  className="rounded-full p-2 text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
                >
                  {ImageIcon}
                </button>
                <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={handlePickVideo} />
                <button
                  onClick={() => videoInputRef.current?.click()}
                  aria-label="Attach video"
                  className="rounded-full p-2 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  {VideoIcon}
                </button>
                {uploadStatus && <span className="ml-1 text-xs text-muted">{uploadStatus}</span>}
              </div>
              <button
                onClick={handlePost}
                disabled={(!text.trim() && imagePreviews.length === 0 && !videoFile) || posting}
                className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {posting ? "Posting…" : "Post"}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {posts === null ? (
            <p className="py-16 text-center text-sm text-muted">Loading…</p>
          ) : posts.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">No posts yet — be the first to share something.</p>
          ) : (
            <div className="space-y-2">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} onLike={handleLike} />
              ))}
            </div>
          )}
          </div>
          {showSidebars && <SuggestionsSidebarCard onAction={showComingSoon} />}
        </div>
      </div>

      {toast && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-surface-2 px-4 py-2 text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
