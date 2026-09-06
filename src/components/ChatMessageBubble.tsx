"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Attachment } from "@/lib/attachments";
import { textToPdfBlob } from "@/lib/generatePdf";
import { extractPdfSection, stripPdfMarkers, normalizeSpacing, splitAroundPdfSection, splitTitleAndBody } from "@/lib/pdfMarkers";
import { extractSources, stripSourceMarkers, sourceDomain, type VerifiedSource } from "@/lib/sourceMarkers";
import { stripReminderMarkers } from "@/lib/reminderMarkers";
import { speakText, stopSpeaking } from "@/lib/speak";

const FileIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6" />
  </svg>
);

const PencilIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
    <path d="m15 5 4 4" />
  </svg>
);

const CopyIcon = (
  // Same glyph as the Android app's ic_copy.xml, so Copy looks identical on
  // both platforms -- filled, not stroked, so it needs the same
  // fill/stroke override as ShareUpIcon to survive the .icon wrapper.
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ fill: "currentColor", stroke: "none" }}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="m10.8624 1.99989c.0452.00003.0911.00005.1376.00005h5.2413c.805-.00001 1.4693-.00002 2.0105.0442.5621.04592 1.0788.14449 1.5642.39178.7526.38349 1.3645.99541 1.748 1.74806.2473.48534.3459 1.00204.3918 1.56414.0442.54119.0442 1.20554.0442 2.0105v5.24128c0 .0466 0 .0924.0001.1376.0004.7954.0007 1.3861-.1364 1.8977-.3699 1.3804-1.4481 2.4586-2.8284 2.8284-.3096.083-.648.1156-1.0433.1284-.0127.3952-.0454.7337-.1283 1.0432-.3699 1.3804-1.4481 2.4586-2.8284 2.8284-.5117.1371-1.1023.1368-1.8977.1364-.0452 0-.0911-.0001-.1376-.0001h-5.24132c-.80496.0001-1.46932.0001-2.01051-.0441-.56209-.046-1.0788-.1445-1.56413-.3918-.75265-.3835-1.36457-.9954-1.74807-1.7481-.24729-.4853-.34585-1.002-.39178-1.5641-.04421-.5412-.0442-1.2056-.04419-2.0106v-5.2413c0-.0465-.00002-.0923-.00005-.1375-.00043-.7954-.00075-1.38608.13635-1.89773.36987-1.38037 1.44806-2.45856 2.82842-2.82843.30955-.08294.64801-.11559 1.04323-.12834.01276-.39522.0454-.73369.12835-1.04323.36987-1.38037 1.44806-2.45856 2.82842-2.82843.51165-.1371 1.10228-.13678 1.89768-.13635zm-2.85254 4.00005h4.23144c.805-.00001 1.4693-.00002 2.0105.0442.5621.04592 1.0788.14449 1.5642.39178.7526.38349 1.3645.99541 1.748 1.74806.2473.48534.3459 1.00204.3918 1.56414.0442.54118.0442 1.20558.0442 2.01058v4.2314c.2576-.0092.3988-.0265.5176-.0583.6902-.1849 1.2293-.724 1.4143-1.4142.0595-.2223.0681-.5233.0681-1.5177v-5.19996c0-.85658-.0008-1.43887-.0376-1.88896-.0358-.43841-.1007-.66262-.1804-.81902-.1917-.37632-.4977-.68228-.874-.87403-.1564-.07969-.3806-.14461-.819-.18043-.4501-.03678-1.0324-.03756-1.889-.03756h-5.2c-.9944 0-1.29536.00859-1.51764.06815-.69018.18494-1.22928.72403-1.41421 1.41422-.03183.11879-.0491.26006-.05829.51763zm-1.00986 2c-.99435 0-1.29536.00859-1.51764.06815-.69018.18494-1.22928.72403-1.41421 1.41422-.05956.22227-.06815.52329-.06815 1.51759v5.2c0 .8566.00078 1.4389.03755 1.889.03582.4384.10075.6626.18044.819.19174.3763.4977.6823.87403.8741.1564.0796.3806.1446.81902.1804.45009.0368 1.03238.0375 1.88896.0375h5.2c.9944 0 1.2954-.0085 1.5176-.0681.6902-.1849 1.2293-.724 1.4143-1.4142.0595-.2223.0681-.5233.0681-1.5177v-5.2c0-.8565-.0008-1.4388-.0376-1.88892-.0358-.43841-.1007-.66262-.1804-.81902-.1917-.37632-.4977-.68228-.874-.87403-.1564-.07969-.3806-.14461-.819-.18043-.4501-.03678-1.0324-.03756-1.889-.03756z"
    />
  </svg>
);

const ShareUpIcon = (
  // The shared ".icon" wrapper class forces fill:none/stroke:currentColor
  // for the site's stroke-based icon set -- this path is filled, not
  // stroked, so it needs an inline override to survive that wrapper. Sized
  // a couple px above the toolbar's 15px default -- it read visibly
  // smaller than its neighbors at that size.
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ fill: "currentColor", stroke: "none", width: "17px", height: "17px" }}>
    <path d="M0 0h24v24H0z" fill="none" />
    <path fill="currentColor" d="M18.414 9L12 2.586L5.586 9H11v7h2V9zM3 14v4a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-4h-2v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-4z" />
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
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M12 11h4" />
    <path d="M12 16h4" />
    <path d="M8 11h.01" />
    <path d="M8 16h.01" />
  </svg>
);

const ShareIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
    <path d="M6.015 15.809a3.265 3.265 0 1 0 0-6.53a3.265 3.265 0 0 0 0 6.53m11.97-6.529a3.265 3.265 0 1 0 0-6.53a3.265 3.265 0 0 0 0 6.53m0 11.97a3.265 3.265 0 1 0 0-6.53a3.265 3.265 0 0 0 0 6.53m-2.971-4.614l-6.028-2.742m6.126-6.312l-6.224 3.395" />
  </svg>
);

const RegenerateIcon = (
  // A few px below the toolbar's 18px default -- this glyph fills more of
  // its own box than its neighbors, so at the same box size it reads
  // visibly larger/bolder than the rest of the row.
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ fill: "currentColor", stroke: "none", width: "14px", height: "14px" }}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M7.32.029a8 8 0 0 1 7.18 3.307V1.75a.75.75 0 0 1 1.5 0V6h-4.25a.75.75 0 0 1 0-1.5h1.727A6.5 6.5 0 0 0 1.694 6.424A.75.75 0 1 1 .239 6.06A8 8 0 0 1 7.319.03Zm-3.4 14.852A8 8 0 0 0 15.76 9.94a.75.75 0 0 0-1.455-.364A6.5 6.5 0 0 1 2.523 11.5H4.25a.75.75 0 0 0 0-1.5H0v4.25a.75.75 0 0 0 1.5 0v-1.586a8 8 0 0 0 2.42 2.217"
    />
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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
    <path d="M2 14.959V9.04C2 8.466 2.448 8 3 8h3.586a.98.98 0 0 0 .707-.305l3-3.388c.63-.656 1.707-.191 1.707.736v13.914c0 .934-1.09 1.395-1.716.726l-2.99-3.369A.98.98 0 0 0 6.578 16H3c-.552 0-1-.466-1-1.041M16 8.5c1.333 1.778 1.333 5.222 0 7M19 5c3.988 3.808 4.012 10.217 0 14" />
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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="m19.5 5.5l-.62 10.025c-.158 2.561-.237 3.842-.88 4.763a4 4 0 0 1-1.2 1.128c-.957.584-2.24.584-4.806.584c-2.57 0-3.855 0-4.814-.585a4 4 0 0 1-1.2-1.13c-.642-.922-.72-2.205-.874-4.77L4.5 5.5M3 5.5h18m-4.944 0l-.683-1.408c-.453-.936-.68-1.403-1.071-1.695a2 2 0 0 0-.275-.172C13.594 2 13.074 2 12.035 2c-1.066 0-1.599 0-2.04.234a2 2 0 0 0-.278.18c-.395.303-.616.788-1.058 1.757L8.053 5.5m1.447 11v-6m5 6v-6" />
  </svg>
);

const ThumbsUpIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    <path d="M7 10v12" />
  </svg>
);

const ThumbsDownIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
    <path d="M17 14V2" />
  </svg>
);

// The combined-thumbs trigger for the rating popup -- a single glyph
// instead of switching between ThumbsUpIcon/ThumbsDownIcon depending on
// which way (if either) the user already rated.
const ThumbsUpDownIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path
      strokeMiterlimit="10"
      d="m4.92 20.28 1.77 1.37c.23.23.74.34 1.09.34h2.17c.69 0 1.43-.51 1.6-1.2l1.37-4.17c.29-.8-.23-1.49-1.09-1.49H9.54a.58.58 0 0 1-.57-.69l.29-1.83c.11-.51-.23-1.09-.74-1.26c-.46-.17-1.03.06-1.26.4l-2.34 3.49"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2 20.28v-5.6c0-.8.34-1.09 1.14-1.09h.57c.8 0 1.14.29 1.14 1.09v5.6c0 .8-.34 1.09-1.14 1.09h-.57c-.8 0-1.14-.28-1.14-1.09" />
    <path
      strokeMiterlimit="10"
      d="m19.08 3.72-1.77-1.37c-.23-.23-.74-.34-1.09-.34h-2.17c-.69 0-1.43.51-1.6 1.2l-1.37 4.17c-.29.8.23 1.49 1.09 1.49h2.29c.34 0 .63.29.57.69l-.29 1.83c-.11.51.23 1.09.74 1.26c.46.17 1.03-.06 1.26-.4l2.34-3.49"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M22 3.72v5.6c0 .8-.34 1.09-1.14 1.09h-.57c-.8 0-1.14-.29-1.14-1.09v-5.6c0-.8.34-1.09 1.14-1.09h.57c.8 0 1.14.28 1.14 1.09" />
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

// The backend splices [[CITE:i]] (or [[CITE:i,j]] when several sources land
// at the same point) markers into the raw text right after the claim they
// back -- ai.ts's streamOpenAi does this using the real end_index offsets
// OpenAI's url_citation annotations carry. react-markdown has no concept of
// that token, so it's rewritten into an ordinary markdown link pointing at
// a `#cite:` fragment first; the `a` component override below recognizes
// that scheme and swaps in the actual citation badge instead of a link.
function citeTokensToMarkdownLinks(text: string): string {
  return text.replace(/\[\[CITE:([0-9]+(?:,[0-9]+)*)\]\]/g, (_, ids: string) => `[cite](#cite:${ids})`);
}

function CiteBadge({ ids, sources }: { ids: number[]; sources: VerifiedSource[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const matched = ids.map((i) => sources[i]).filter((s): s is VerifiedSource => !!s);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  if (matched.length === 0) return null;

  return (
    <span ref={ref} className="relative inline-flex align-middle not-prose">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          if (matched.length === 1) {
            window.open(matched[0].url, "_blank", "noopener,noreferrer");
          } else {
            setOpen((v) => !v);
          }
        }}
        className="mx-0.5 inline-flex items-center gap-0.5 rounded-full bg-surface-2 px-1 py-0.5 align-middle hover:bg-border"
        aria-label={matched.length === 1 ? `Open source: ${matched[0].title}` : `${matched.length} sources -- choose one`}
      >
        {matched.slice(0, 2).map((s, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${s.url}-${i}`}
            src={`https://www.google.com/s2/favicons?sz=32&domain=${sourceDomain(s.url)}`}
            alt=""
            className="h-3.5 w-3.5 rounded-full ring-1 ring-background"
            style={i > 0 ? { marginLeft: "-6px" } : undefined}
          />
        ))}
        {matched.length > 2 && <span className="pl-0.5 text-[9px] text-muted">+{matched.length - 2}</span>}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-border bg-background p-1 shadow-lg">
          {matched.map((s, i) => (
            <a
              key={`${s.url}-${i}`}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-surface-2"
              onClick={() => setOpen(false)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://www.google.com/s2/favicons?sz=32&domain=${sourceDomain(s.url)}`}
                alt=""
                className="h-3.5 w-3.5 shrink-0 rounded-sm"
              />
              <span className="min-w-0 flex-1 truncate">{s.title}</span>
            </a>
          ))}
        </div>
      )}
    </span>
  );
}

function MarkdownCiteOrLink({
  href,
  children,
  sources,
  ...rest
}: { href?: string; children?: React.ReactNode; sources: VerifiedSource[] } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (href?.startsWith("#cite:")) {
    const ids = href
      .slice("#cite:".length)
      .split(",")
      .map((n) => parseInt(n, 10))
      .filter((n) => !Number.isNaN(n));
    return <CiteBadge ids={ids} sources={sources} />;
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
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
  id,
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
  qid,
}: {
  id?: string;
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
  // "Q-4F2A19" -- shared by this question/answer pair, shown so the
  // user can actually reference it later the way the system prompt has
  // always claimed they could.
  qid?: string;
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
  const markdownComponents = { a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <MarkdownCiteOrLink {...props} sources={sources} /> };
  // Reminder markers are pure plumbing (the actual reminder gets created
  // as a side effect elsewhere, in page.tsx, the moment a reply finishes
  // streaming) -- they must never render here as literal `[[REMINDER_...`
  // JSON text, which is exactly what was happening before this existed.
  const contentSansSources = stripReminderMarkers(stripSourceMarkers(content));

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
        {content && qid && !isStreaming && (
          <p
            className="mt-0.5 select-text text-[10px] text-muted/60"
            title="Mention this ID later (in any chat) to bring this exact exchange back up"
          >
            {qid}
          </p>
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
                aria-label="Edit"
                className="flex items-center justify-center rounded-md p-1.5 text-muted hover:text-foreground transition-colors"
              >
                {PencilIcon}
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
        <div className="markdown markdown-tight assistant-reply chat-text w-full max-w-none">
          {hasPdfSection ? (
            <>
              {beforePdfText.trim() && (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {citeTokensToMarkdownLinks(normalizeSpacing(stripPdfMarkers(beforePdfText)))}
                </ReactMarkdown>
              )}
              {pdfFile ? (
                <PdfFileCard title={pdfFile.title} onDownload={() => downloadUrl(pdfFile.url, pdfFile.filename)} />
              ) : (
                <PdfFileCardPending />
              )}
              {afterPdfText.trim() && (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {citeTokensToMarkdownLinks(normalizeSpacing(stripPdfMarkers(afterPdfText)))}
                </ReactMarkdown>
              )}
            </>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {citeTokensToMarkdownLinks(normalizeSpacing(stripPdfMarkers(contentSansSources)))}
            </ReactMarkdown>
          )}
        </div>
      )}
      {content && qid && !isStreaming && (
        <p
          className="mt-0.5 select-text text-[10px] text-muted/60"
          title="Mention this ID later (in any chat) to bring this exact exchange back up"
        >
          {qid}
        </p>
      )}
      {!isStreaming && sources.length > 0 && <SourceTrail sources={sources} />}
      {!isStreaming && content && !imageUrl && !videoUrl && (
        <div className="toolbar mt-1">
          <button onClick={handleCopy} aria-label="Copy" className="tool-btn">
            <span className="icon">{copied ? CheckIcon : CopyIcon}</span>
          </button>
          <button onClick={handleDownloadPdf} aria-label="Download as PDF" className="tool-btn">
            <span className="icon">{PdfIcon}</span>
          </button>
          <ReactionButtons />
          {onRegenerate && (
            <button onClick={onRegenerate} aria-label="Regenerate" className="tool-btn">
              <span className="icon">{RegenerateIcon}</span>
            </button>
          )}
          <button
            onClick={handleSpeak}
            aria-label={isSpeaking ? "Stop reading aloud" : "Read aloud"}
            className={`tool-btn ${isSpeaking ? "is-active" : ""}`}
          >
            <span className="icon">{isSpeaking ? SpeakerOffIcon : SpeakerIcon}</span>
          </button>
          {onDelete && (
            <MoreMenu
              items={[
                { label: "Share", icon: ShareIcon, onClick: handleShare },
                { label: "Delete", icon: TrashIcon, onClick: onDelete, danger: true },
              ]}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ReactionButtons() {
  const [reaction, setReaction] = useState<"up" | "down" | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));

  function choose(value: "up" | "down") {
    setReaction((r) => (r === value ? null : value));
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Rate this response"
        className={`tool-btn ${reaction ? "is-active" : ""}`}
      >
        <span className="icon">{ThumbsUpDownIcon}</span>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-1 w-max min-w-40 rounded-xl border border-border bg-surface p-1 shadow-lg">
          <button onClick={() => choose("up")} className="menu-item whitespace-nowrap">
            <span className="icon">{ThumbsUpIcon}</span>
            <span>Good response</span>
          </button>
          <button onClick={() => choose("down")} className="menu-item whitespace-nowrap">
            <span className="icon">{ThumbsDownIcon}</span>
            <span>Bad response</span>
          </button>
        </div>
      )}
    </div>
  );
}
