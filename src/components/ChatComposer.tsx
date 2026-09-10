"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Attachment } from "@/lib/attachments";
import TypingPlaceholder from "@/components/TypingPlaceholder";
import { openExternalQuery } from "@/lib/addressBar";

// The composer scrolls internally past this height rather than continuing
// to grow -- otherwise a very long pasted message could push the send
// button (and, on the hero composer, everything below it) off-screen.
const MAX_COMPOSER_HEIGHT = 240;

export type ComposerTool =
  | "web_search"
  | "deep_research"
  | "deep_think"
  | "image"
  | "video"
  | "document_writer"
  | "sql_helper"
  | "python_helper"
  | "business_assistant"
  | "ai_agent"
  | "digital_twin"
  | null;

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

const PlusIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

const PaperclipIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.49-8.48" />
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
    <rect x="2" y="5" width="15" height="14" rx="2" />
    <path d="M17 9.5l5-3v11l-5-3" />
  </svg>
);

const ExternalSearchIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
  </svg>
);

const GlobeIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" />
  </svg>
);

const ResearchIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 11a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" transform="translate(0 3)" />
    <path d="M14 14l6 6" />
  </svg>
);

const BrainIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 18V5" />
    <path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4" />
    <path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5" />
    <path d="M17.997 5.125a4 4 0 0 1 2.526 5.77" />
    <path d="M18 18a4 4 0 0 0 2-7.464" />
    <path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517" />
    <path d="M6 18a4 4 0 0 1-2-7.464" />
    <path d="M6.003 5.125a4 4 0 0 0-2.526 5.77" />
  </svg>
);

const ChevronDownIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

// Model-selector sheet: current pick gets this instead of the row's own icon.
const ModelCheckIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const ModelCloseIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const ArrowUpIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <path d="M0 0h24v24H0z" fill="none" />
    <path
      fill="currentColor"
      d="M21.25 4a.75.75 0 0 1 .75.75v6.5A3.75 3.75 0 0 1 18.25 15H4.587l3.72 3.72a.75.75 0 0 1 .072.976l-.072.084a.75.75 0 0 1-.977.073l-.084-.073l-5-5a.75.75 0 0 1-.073-.976l.073-.084l5-5a.75.75 0 0 1 1.133.976l-.072.084l-3.72 3.72h13.665a2.25 2.25 0 0 0 2.244-2.096l.006-.154v-6.5a.75.75 0 0 1 .75-.75"
    />
  </svg>
);

const StopIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" />
  </svg>
);

const MicIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 19v2m0-2a7 7 0 0 1-6.93-6M12 19a7 7 0 0 0 6.929-6M12 16a4 4 0 0 1-4-4V7a4 4 0 1 1 8 0v5a4 4 0 0 1-4 4Z" />
  </svg>
);

const WaveformIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <rect x="1.4" y="9" width="2.6" height="6" rx="1.3" />
    <rect x="5" y="6" width="2.6" height="12" rx="1.3" />
    <rect x="8.6" y="3" width="2.6" height="18" rx="1.3" />
    <rect x="12.2" y="2" width="2.6" height="20" rx="1.3" />
    <rect x="15.8" y="5" width="2.6" height="14" rx="1.3" />
    <rect x="19.4" y="8" width="2.6" height="8" rx="1.3" />
  </svg>
);

const LightningIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 16a3 3 0 0 1 2.24 5" />
    <path d="M18 12h.01" />
    <path d="M18 21h-8a4 4 0 0 1-4-4 7 7 0 0 1 7-7h.2L9.6 6.4a1 1 0 1 1 2.8-2.8L15.8 7h.2c3.3 0 6 2.7 6 6v1a2 2 0 0 1-2 2h-1a3 3 0 0 0-3 3" />
    <path d="M20 8.54V4a2 2 0 1 0-4 0v3" />
    <path d="M7.612 12.524a3 3 0 1 0-1.6 4.3" />
  </svg>
);

const FileIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6" />
  </svg>
);

const DocumentIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h8" />
    <path d="M8 17h8" />
  </svg>
);

const DatabaseIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
    <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
  </svg>
);

const CodeBracketIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18l-6-6 6-6" />
    <path d="M15 6l6 6-6 6" />
  </svg>
);

const BriefcaseIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const AgentIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="8" width="16" height="12" rx="2" />
    <path d="M12 8V4" />
    <circle cx="12" cy="3" r="1" />
    <circle cx="9" cy="13" r="1" fill="currentColor" />
    <circle cx="15" cy="13" r="1" fill="currentColor" />
    <path d="M9 17h6" />
  </svg>
);

// Two overlapping people -- "you" and your synthesized twin -- rather than
// a single-person icon, so it reads as a second self, not just a profile.
const TwinIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <circle cx="16" cy="7" r="2.6" strokeDasharray="3 2" />
    <path d="M13.2 19a5.3 5.3 0 0 1 7.3-4.9" strokeDasharray="3 2" />
  </svg>
);

const TOOL_LABELS: Record<Exclude<ComposerTool, null>, string> = {
  image: "Create image",
  video: "Create video",
  web_search: "Web search",
  deep_research: "Deep research",
  deep_think: "Deep Think",
  document_writer: "Document Writer",
  sql_helper: "SQL Helper",
  python_helper: "Python Helper",
  business_assistant: "Business Assistant",
  ai_agent: "AI Agent",
  digital_twin: "Digital Twin",
};

export default function ChatComposer({
  variant,
  value,
  onValueChange,
  attachments,
  onAddFiles,
  onRemoveAttachment,
  activeTool,
  onSelectTool,
  enabledTools,
  error,
  disabled,
  onStop,
  temporaryMode,
  onToggleTemporary,
  onSubmit,
}: {
  variant: "hero" | "bar";
  value: string;
  onValueChange: (v: string) => void;
  attachments: Attachment[];
  onAddFiles: (files: FileList | null) => void;
  onRemoveAttachment: (id: string) => void;
  activeTool: ComposerTool;
  onSelectTool: (tool: ComposerTool) => void;
  enabledTools?: Record<string, boolean>;
  error: string | null;
  disabled: boolean;
  onStop?: () => void;
  // Temporary Chat toggle -- optional since not every composer instance
  // needs to expose it (e.g. a share-preview render); both real call
  // sites (hero + bar) pass it.
  temporaryMode?: boolean;
  onToggleTemporary?: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const toolMenuRef = useRef<HTMLDivElement>(null);
  const toolMenuPanelRef = useRef<HTMLDivElement>(null);
  const composerWrapperRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const [menuOpen, setMenuOpen] = useState(false);
  const [toolMenuOpen, setToolMenuOpen] = useState(false);
  type DropdownCoords = { left: number; top?: number; bottom?: number };
  const [menuCoords, setMenuCoords] = useState<DropdownCoords | null>(null);
  const [toolMenuCoords, setToolMenuCoords] = useState<DropdownCoords | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  // Real navigation, not a chat message -- kept as its own tiny prompt
  // instead of hijacking the main input, since most URL-looking text
  // someone types there is meant to be discussed with the AI (e.g. "sum up
  // https://..."), not visited directly.
  const [externalSearchOpen, setExternalSearchOpen] = useState(false);
  const [externalSearchInput, setExternalSearchInput] = useState("");

  const isHero = variant === "hero";

  // Jump straight to typing on the home screen — covers both first opening
  // the app and pressing "New chat" (which remounts this hero composer).
  useEffect(() => {
    if (isHero) messageInputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Grows the composer upward as the message wraps to more lines, instead
  // of staying a single fixed-height row and just scrolling long text
  // sideways inside it (a plain <input> can't wrap at all, which is what
  // this replaced). Re-measured on every keystroke: reset to "auto" first
  // so a shrinking message (e.g. after deleting a line) actually shrinks
  // back down, not just grows -- scrollHeight alone never reports a
  // smaller number than whatever height is already set.
  useEffect(() => {
    const el = messageInputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_COMPOSER_HEIGHT)}px`;
  }, [value]);

  // Dropdowns are portaled to document.body with position:fixed, anchored to
  // the WHOLE composer wrapper (not the trigger button) — portaling escapes a
  // real stacking-context bug where an unrelated ancestor div intercepted
  // clicks even though the dropdown was visually on top (verified via
  // elementFromPoint). They open downward below the composer by default; if
  // there isn't enough room below (the bar composer sits near the bottom of
  // the screen), they flip to opening upward instead so they never render
  // partly off-screen.
  function computeDropdownCoords(estimatedHeight = 260): DropdownCoords | null {
    const rect = composerWrapperRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow >= estimatedHeight + 16) {
      return { left: rect.left, top: rect.bottom + 8 };
    }
    return { left: rect.left, bottom: window.innerHeight - rect.top + 8 };
  }

  function openToolMenu() {
    setToolMenuOpen((v) => {
      const next = !v;
      if (next) setToolMenuCoords(computeDropdownCoords(240));
      return next;
    });
  }

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        menuPanelRef.current &&
        !menuPanelRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (!toolMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        toolMenuRef.current &&
        !toolMenuRef.current.contains(target) &&
        toolMenuPanelRef.current &&
        !toolMenuPanelRef.current.contains(target)
      ) {
        setToolMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [toolMenuOpen]);

  function startListening() {
    if (recognitionRef.current) return;
    const win = window as SpeechWindow;
    const SpeechRecognitionCtor = win.SpeechRecognition ?? win.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setVoiceError("Voice input isn't supported in this browser");
      return;
    }

    setVoiceError(null);
    const recognition = new SpeechRecognitionCtor();
    recognition.interimResults = false;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(" ");
      onValueChange(valueRef.current ? `${valueRef.current} ${transcript}` : transcript);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognition.onerror = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  function stopListening() {
    recognitionRef.current?.stop();
  }

  const menuItems: {
    title: string;
    description: string;
    icon: React.ReactNode;
    tool?: Exclude<ComposerTool, null>;
    onClick?: () => void;
  }[] = [
    {
      title: "Add photos & files",
      description: "Upload from computer",
      icon: PaperclipIcon,
      onClick: () => fileInputRef.current?.click(),
    },
    {
      title: "Create image",
      description: "Generate a picture or logo",
      icon: ImageIcon,
      tool: "image",
    },
    {
      title: "Create video",
      description: "Generate a short video clip",
      icon: VideoIcon,
      tool: "video",
    },
    {
      title: "Web search",
      description: "Find real-time news and info",
      icon: GlobeIcon,
      tool: "web_search",
    },
    {
      title: "Open a website",
      description: "Search Google or go straight to a URL",
      icon: ExternalSearchIcon,
      onClick: () => setExternalSearchOpen(true),
    },
    {
      title: "Deep research",
      description: "Get a detailed, cited report",
      icon: ResearchIcon,
      tool: "deep_research",
    },
    {
      title: "Deep Think",
      description: "Rigorous analysis and reasoning for high-stakes decisions",
      icon: BrainIcon,
      tool: "deep_think",
    },
    {
      title: "Document Writer",
      description: "Draft a finished report, letter, or proposal",
      icon: DocumentIcon,
      tool: "document_writer",
    },
    {
      title: "SQL Helper",
      description: "Write, fix, and explain SQL queries",
      icon: DatabaseIcon,
      tool: "sql_helper",
    },
    {
      title: "Python Helper",
      description: "Write and debug Python code",
      icon: CodeBracketIcon,
      tool: "python_helper",
    },
    {
      title: "Business Assistant",
      description: "Emails, proposals, and everyday business tasks",
      icon: BriefcaseIcon,
      tool: "business_assistant",
    },
    {
      title: "AI Agent",
      description: "Researches autonomously, searching multiple times before answering",
      icon: AgentIcon,
      tool: "ai_agent",
    },
    {
      title: "Digital Twin",
      description: "Answers as you, in your own voice, from your synthesized profile",
      icon: TwinIcon,
      tool: "digital_twin",
    },
  ];

  const visibleMenuItems = menuItems.filter((item) => !item.tool || enabledTools?.[item.tool] !== false);
  // Deep Think is a response mode, not an attach-menu action — it only
  // belongs in the GiZa 5.6 model-selector dropdown, not the "+" menu.
  const attachMenuItems = visibleMenuItems.filter((item) => item.tool !== "deep_think");
  const modelOnlyItems = visibleMenuItems.filter((item) => item.tool === "deep_think");

  const fileInputEl = (
    <input
      ref={fileInputRef}
      type="file"
      multiple
      accept="image/*,.pdf,.txt,.md,text/plain,application/pdf,.xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,video/*,.mp4,.mov,.webm,.m4v"
      className="hidden"
      onChange={(e) => {
        onAddFiles(e.target.files);
        e.target.value = "";
      }}
    />
  );

  const attachMenu = (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        aria-label="Add"
        disabled={disabled}
        onClick={() => {
          setMenuOpen((v) => {
            const next = !v;
            if (next) setMenuCoords(computeDropdownCoords(280));
            return next;
          });
        }}
        className={`flex items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent ${
          isHero ? "h-10 w-10 border border-white/10 bg-white/5" : "h-8 w-8"
        }`}
      >
        {PlusIcon}
      </button>

      {menuOpen &&
        menuCoords &&
        createPortal(
          <div
            ref={menuPanelRef}
            style={{
              position: "fixed",
              left: menuCoords.left,
              ...(menuCoords.top !== undefined ? { top: menuCoords.top } : { bottom: menuCoords.bottom }),
            }}
            className="z-50 w-72 rounded-2xl border border-border bg-surface p-1.5 shadow-lg"
          >
            {attachMenuItems.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => {
                  item.onClick?.();
                  if (item.tool) onSelectTool(item.tool === activeTool ? null : item.tool);
                  setMenuOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2 ${
                  item.tool && item.tool === activeTool ? "bg-surface-2" : ""
                }`}
              >
                <span className="text-muted">{item.icon}</span>
                <span className="flex-1">
                  <span className="block text-sm font-medium">{item.title}</span>
                  <span className="block text-xs text-muted">{item.description}</span>
                </span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );

  // Hero keeps the full pill (icon + name + chevron, in the row next to the
  // "+" button). The bar composer -- once a chat is actually under way --
  // drops that pill from the row entirely and shows just the model name as
  // small muted text underneath the box instead, mirroring how Claude
  // Code's own composer tucks "Opus 5 High" below the input rather than
  // giving it a button of its own inline. Same trigger/dropdown either way,
  // just a different button so the row it belongs in doesn't shift.
  const toolSelector = (
    <div className="relative shrink-0" ref={toolMenuRef}>
      {isHero ? (
        <button
          type="button"
          onClick={openToolMenu}
          className="flex h-10 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2"
        >
          {!activeTool && LightningIcon}
          {activeTool === "deep_think" && BrainIcon}
          {activeTool ? TOOL_LABELS[activeTool] : "GiZa 5.6"}
          {ChevronDownIcon}
        </button>
      ) : (
        <button
          type="button"
          onClick={openToolMenu}
          className="text-xs font-medium text-muted transition-colors hover:text-foreground"
        >
          {activeTool ? TOOL_LABELS[activeTool] : "GiZa 5.6"}
        </button>
      )}

      {toolMenuOpen &&
        toolMenuCoords &&
        createPortal(
          <div
            ref={toolMenuPanelRef}
            style={{
              position: "fixed",
              left: toolMenuCoords.left,
              ...(toolMenuCoords.top !== undefined
                ? { top: toolMenuCoords.top }
                : { bottom: toolMenuCoords.bottom }),
            }}
            className="z-50 w-80 overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
          >
            <div className="relative flex items-center justify-center border-b border-border px-3 py-3">
              <button
                type="button"
                aria-label="Close"
                onClick={() => setToolMenuOpen(false)}
                className="absolute left-2 flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                {ModelCloseIcon}
              </button>
              <span className="text-sm font-semibold">Select model</span>
            </div>

            <div className="p-1.5">
              {/* Not wired to anything real yet -- billing/upgrade flow is
                  being rebuilt elsewhere; this is just the entry point so
                  it has a home in the redesigned sheet, matching the rest
                  of this list's style instead of a bare "Coming soon" line. */}
              <button
                type="button"
                onClick={() => setToolMenuOpen(false)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
              >
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium">GiZa Pro</span>
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-muted">
                      Coming soon
                    </span>
                  </span>
                  <span className="block text-xs text-muted">For your toughest challenges</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectTool(null);
                  setToolMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
              >
                <span className="flex-1">
                  <span className="block text-sm font-medium">GiZa 5.6</span>
                  <span className="block text-xs text-muted">Reliable, efficient performance for daily business tasks</span>
                </span>
                {!activeTool && <span className="text-foreground">{ModelCheckIcon}</span>}
              </button>
              {modelOnlyItems.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => {
                    onSelectTool(item.tool === activeTool ? null : (item.tool as ComposerTool));
                    setToolMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
                >
                  <span className="flex-1">
                    <span className="block text-sm font-medium">{item.title}</span>
                    <span className="block text-xs text-muted">{item.description}</span>
                  </span>
                  {item.tool === activeTool && <span className="text-foreground">{ModelCheckIcon}</span>}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );

  const micButton = (
    <button
      type="button"
      aria-label="Hold to talk"
      onPointerDown={startListening}
      onPointerUp={stopListening}
      onPointerLeave={stopListening}
      onPointerCancel={stopListening}
      disabled={disabled}
      className={
        isHero
          ? `flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-500 disabled:opacity-40 ${
              isListening ? "ring-2 ring-blue-300" : ""
            }`
          // No blue fill in the bar composer -- per feedback, only the
          // hero's own hold-to-talk button keeps it; here it's just
          // another plain muted icon like the rest of the row.
          : `flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-40 ${
              isListening ? "ring-2 ring-blue-300" : ""
            }`
      }
    >
      {WaveformIcon}
    </button>
  );

  // A second, separate mic entry point sitting right next to the blue
  // waveform button -- not replacing it, per feedback.
  const secondaryMicButton = (
    <button
      type="button"
      aria-label="Hold to talk"
      onPointerDown={startListening}
      onPointerUp={stopListening}
      onPointerLeave={stopListening}
      onPointerCancel={stopListening}
      disabled={disabled}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-40 ${
        isHero ? "border border-white/10 bg-white/5" : ""
      }`}
    >
      {MicIcon}
    </button>
  );

  const sendButton = (
    <button
      type="submit"
      aria-label="Send"
      disabled={disabled || (!value.trim() && attachments.length === 0)}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
        isHero ? "bg-blue-600 text-white hover:bg-blue-500" : "text-muted hover:bg-surface-2 hover:text-foreground"
      }`}
    >
      {ArrowUpIcon}
    </button>
  );

  const stopButton = (
    <button
      type="button"
      aria-label="Stop generating"
      onClick={onStop}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
        isHero ? "text-blue-600 hover:text-blue-500" : "text-muted hover:text-foreground"
      }`}
    >
      {StopIcon}
    </button>
  );

  const messageTextarea = (
    <textarea
      ref={messageInputRef}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      onKeyDown={(e) => {
        // Enter sends, same as the <input> this replaced -- Shift+Enter
        // (or any IME composition, e.g. typing in Japanese/Chinese)
        // still inserts a real newline instead, which a plain <input>
        // could never do at all. Calls the same onSubmit the Send
        // button's own type="submit" triggers, directly -- rather than
        // form.requestSubmit(), which (at least in some embedded/
        // automated contexts) can dispatch a submit event that never
        // actually reaches this form's onSubmit handler.
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault();
          onSubmit(e as unknown as React.FormEvent);
        }
      }}
      placeholder={isHero ? undefined : disabled ? "ChatGiZa is typing…" : "Write a message…"}
      autoComplete="off"
      rows={1}
      style={{ maxHeight: MAX_COMPOSER_HEIGHT }}
      className="sidebar-scroll w-full resize-none overflow-y-auto bg-transparent px-1 py-1 text-sm text-foreground outline-none"
    />
  );

  const actionButton = disabled && onStop ? stopButton : value.trim() || attachments.length > 0 ? sendButton : micButton;

  // The hero composer keeps its own two-row shell (.box/.inner, from
  // globals.css) -- message on top, icon row below -- since that's the
  // large landing-page composer. The bar composer (once a chat is
  // actually under way) instead mirrors Build's single-row composer
  // exactly (same rounded-2xl/border-composer-border/bg-composer/px-4
  // py-2 box, everything -- attach, textarea, mic, send -- inline in one
  // slim row) rather than the taller two-row shell, which read as
  // needlessly thick next to a reference like Claude Code's own composer.
  const formEl = isHero ? (
    <form onSubmit={onSubmit} className="inner flex flex-col justify-between gap-2 px-4 pt-3 pb-2">
      {fileInputEl}

      <div className="relative w-full">
        {messageTextarea}
        {!value && (
          <div className="pointer-events-none absolute inset-0 flex items-center px-1 text-sm font-bold text-muted">
            <TypingPlaceholder />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {attachMenu}
        {toolSelector}
        <div className="flex-1" />
        {secondaryMicButton}
        {actionButton}
      </div>
    </form>
  ) : (
    <form
      onSubmit={onSubmit}
      className="relative flex items-end gap-2 rounded-2xl border border-composer-border bg-composer px-4 py-2 shadow-sm"
    >
      {fileInputEl}
      {attachMenu}
      {messageTextarea}
      {secondaryMicButton}
      {actionButton}
    </form>
  );

  return (
    <div
      ref={composerWrapperRef}
      className={isHero ? "w-full" : "mx-auto mb-6 w-full max-w-[var(--max-w-chat)] px-4"}
    >
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs"
            >
              {a.kind === "image" && a.dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.dataUrl} alt={a.name} className="h-6 w-6 rounded object-cover" />
              ) : (
                <span className="text-muted">{FileIcon}</span>
              )}
              <span className="max-w-[140px] truncate">{a.name}</span>
              <button
                type="button"
                onClick={() => onRemoveAttachment(a.id)}
                aria-label={`Remove ${a.name}`}
                className="text-muted hover:text-foreground"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {(error || voiceError) && (
        <p className="mb-2 text-xs text-red-500">{error ?? voiceError}</p>
      )}

      <div className={isHero ? "box mx-auto" : "mx-auto"}>{formEl}</div>

      {!isHero && (
        <div className="mt-1.5 flex justify-end px-1">{toolSelector}</div>
      )}

      {externalSearchOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setExternalSearchOpen(false)}
          >
            <form
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault();
                openExternalQuery(externalSearchInput);
                setExternalSearchOpen(false);
                setExternalSearchInput("");
              }}
              className="w-full max-w-md rounded-2xl border border-border bg-surface p-4 shadow-lg"
            >
              <p className="mb-2 text-sm font-medium">Search Google or open a website</p>
              <p className="mb-3 text-xs text-muted">Opens in a new tab -- leaves ChatGiZa, since the real page can&apos;t be shown inside it.</p>
              <input
                autoFocus
                value={externalSearchInput}
                onChange={(e) => setExternalSearchInput(e.target.value)}
                placeholder="Search or enter a URL"
                className="w-full rounded-full border border-border bg-background px-4 py-2 text-sm outline-none"
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExternalSearchOpen(false)}
                  className="rounded-full px-4 py-2 text-sm text-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!externalSearchInput.trim()}
                  className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                  Go
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}
    </div>
  );
}
