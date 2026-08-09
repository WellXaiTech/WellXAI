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
const MAX_IMAGE_DIMENSION = 1080;
const MAX_IMAGES_PER_POST = 10;
const ALLOWED_VIDEO_MIME = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const BackIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
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
const CloseSmallIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
const TrashIcon = (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 3.5h6M5 5h10M7 5v10a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V5M8.5 8v5M11.5 8v5" />
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
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width, img.height));
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
  if (imageUrls.length === 0) return null;
  if (imageUrls.length === 1) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrls[0]} alt="" className="mt-3 aspect-[4/5] w-full rounded-xl object-cover" />;
  }
  return (
    <div className="relative mt-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrls[index]} alt="" className="aspect-[4/5] w-full rounded-xl object-cover" />
      <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
        {index + 1}/{imageUrls.length}
      </span>
      {index > 0 && (
        <button
          onClick={() => setIndex((i) => i - 1)}
          aria-label="Previous photo"
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
        >
          {ChevronLeftIcon}
        </button>
      )}
      {index < imageUrls.length - 1 && (
        <button
          onClick={() => setIndex((i) => i + 1)}
          aria-label="Next photo"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
        >
          {ChevronRightIcon}
        </button>
      )}
      <div className="mt-2 flex justify-center gap-1.5">
        {imageUrls.map((_, i) => (
          <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-foreground" : "bg-border"}`} />
        ))}
      </div>
    </div>
  );
}

function PostCard({ post, myId, onLike, onDelete }: {
  post: MediaPost;
  myId: string | undefined;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [following, setFollowing] = useState(false);
  const sentiment = SENTIMENTS.find((s) => s.key === post.sentiment);
  const isOwnPost = post.authorId === myId;

  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Avatar src={post.authorImage} name={post.authorName} />
          <div>
            <p className="text-sm font-medium">{post.authorName}</p>
            <p className="text-xs text-muted">{timeAgo(post.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sentiment && (
            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${sentiment.className}`}>{sentiment.label}</span>
          )}
          {isOwnPost ? (
            <button
              onClick={() => {
                if (confirm("Delete this post?")) onDelete(post.id);
              }}
              aria-label="Delete post"
              className="rounded-md p-1.5 text-muted transition-colors hover:text-[#b3413e]"
            >
              {TrashIcon}
            </button>
          ) : (
            <button
              onClick={() => setFollowing((v) => !v)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                following ? "bg-surface-2 text-muted" : "bg-foreground text-background"
              }`}
            >
              {following ? "Following" : "Follow"}
            </button>
          )}
        </div>
      </div>

      {post.text && <p className="mt-3 whitespace-pre-wrap break-words text-[15px]">{post.text}</p>}

      <MediaCarousel imageUrls={post.imageUrls} />
      {post.videoUrl && (
        <video src={post.videoUrl} controls className="mt-3 aspect-[4/5] w-full rounded-xl bg-black object-cover" />
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

export default function ChatGizaMediaFeed({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<MediaPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [posting, setPosting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  function loadFeed() {
    fetch("/api/media/posts")
      .then((r) => r.json())
      .then((data) => setPosts(data.posts ?? []))
      .catch(() => setError("Couldn't load ChatGiZa Media"));
  }

  useEffect(() => {
    loadFeed();
  }, []);

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
        body: JSON.stringify({ text: text.trim(), imageDataUrls: imagePreviews, videoUrl, sentiment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post");

      setPosts((prev) => [data.post, ...(prev ?? [])]);
      setText("");
      setImagePreviews([]);
      clearVideo();
      setSentiment(null);
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

  async function handleDelete(postId: string) {
    setPosts((prev) => prev?.filter((p) => p.id !== postId) ?? null);
    try {
      await fetch(`/api/media/posts/${postId}`, { method: "DELETE" });
    } catch {
      loadFeed();
    }
  }

  const canPost = (text.trim() || imagePreviews.length > 0 || videoFile) && !posting;

  return (
    // Permanently dark regardless of the site's light/dark theme setting --
    // matches the native app's Media feed/profile, which is also fixed
    // dark rather than theme-toggle-dependent. Overriding these CSS vars
    // here (instead of on every className below) cascades through every
    // bg-background/text-muted/border-border/etc. Tailwind class used
    // throughout this file and its child components for free.
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      style={{
        "--background": "#10141f",
        "--foreground": "#e5ebfa",
        "--surface": "#171d2f",
        "--surface-2": "#1c2333",
        "--border": "#262e3f",
        "--muted": "#9aa3b2",
      } as React.CSSProperties}
    >
      <div className="flex items-center gap-3 border-b border-border px-6 py-4 sm:px-10">
        <button
          onClick={onClose}
          aria-label="Close ChatGiZa Media"
          className="rounded-full p-2 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          {BackIcon}
        </button>
        <h1 className="font-serif text-2xl">ChatGiZa Media</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-10">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="rounded-2xl border border-border p-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share something with ChatGiZa Media…"
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
                      {CloseSmallIcon}
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
                  {CloseSmallIcon}
                </button>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {SENTIMENTS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSentiment((prev) => (prev === s.key ? null : s.key))}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    sentiment === s.key ? s.className : "border-border text-muted hover:text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
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
                disabled={!canPost}
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
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} myId={session?.user?.id} onLike={handleLike} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
