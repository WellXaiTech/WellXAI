"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Attachment } from "@/lib/attachments";
import TypingPlaceholder from "@/components/TypingPlaceholder";

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
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
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
    <path d="M9.5 3a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3.5 3.5 0 0 0 1 6.5 3 3 0 0 0 3 3.5V6a3 3 0 0 0-1-3Z" />
    <path d="M14.5 3a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3.5 3.5 0 0 1-1 6.5 3 3 0 0 1-3 3.5V6a3 3 0 0 1 1-3Z" />
  </svg>
);

const ChevronDownIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const ArrowUpIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M12 19V5" />
    <path d="M5 12l7-7 7 7" />
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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
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
  onSubmit: (e: React.FormEvent) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
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

  const isHero = variant === "hero";

  // Jump straight to typing on the home screen — covers both first opening
  // the app and pressing "New chat" (which remounts this hero composer).
  useEffect(() => {
    if (isHero) messageInputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        className={`flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${
          isHero ? "h-10 w-10" : "h-8 w-8"
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

  const toolSelector = (
    <div className="relative shrink-0" ref={toolMenuRef}>
      <button
        type="button"
        onClick={() => {
          setToolMenuOpen((v) => {
            const next = !v;
            if (next) setToolMenuCoords(computeDropdownCoords(240));
            return next;
          });
        }}
        className={`flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2 ${
          isHero ? "h-10" : "h-8"
        }`}
      >
        {!activeTool && LightningIcon}
        {activeTool ? TOOL_LABELS[activeTool] : "GiZa 5.6"}
        {ChevronDownIcon}
      </button>

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
            className="z-50 w-72 rounded-2xl border border-border bg-surface p-1.5 shadow-lg"
          >
            <button
              type="button"
              onClick={() => {
                onSelectTool(null);
                setToolMenuOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2 ${
                !activeTool ? "bg-surface-2" : ""
              }`}
            >
              <span className="text-muted">{LightningIcon}</span>
              <span className="flex-1">
                <span className="block text-sm font-medium">GiZa 5.6</span>
                <span className="block text-xs text-muted">Reliable, efficient performance for daily business tasks</span>
              </span>
            </button>
            {modelOnlyItems.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => {
                  onSelectTool(item.tool === activeTool ? null : (item.tool as ComposerTool));
                  setToolMenuOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2 ${
                  item.tool === activeTool ? "bg-surface-2" : ""
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

  const micButton = (
    <button
      type="button"
      aria-label="Hold to talk"
      onPointerDown={startListening}
      onPointerUp={stopListening}
      onPointerLeave={stopListening}
      onPointerCancel={stopListening}
      disabled={disabled}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40 ${
        isListening ? "ring-2 ring-blue-300" : ""
      }`}
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
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
    >
      {MicIcon}
    </button>
  );

  const sendButton = (
    <button
      type="submit"
      aria-label="Send"
      disabled={disabled || (!value.trim() && attachments.length === 0)}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-500 disabled:opacity-40"
    >
      {ArrowUpIcon}
    </button>
  );

  const formEl = (
    <form onSubmit={onSubmit} className="inner flex flex-col justify-between gap-2 px-4 pt-3 pb-2">
      {fileInputEl}

      <div className="relative w-full">
        <input
          ref={messageInputRef}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          disabled={disabled}
          placeholder={isHero ? undefined : disabled ? "ChatGiZa is typing…" : "Ask anything"}
          autoComplete="off"
          className={`w-full bg-transparent px-1 py-1 text-sm outline-none disabled:cursor-not-allowed ${isHero ? "text-pure-black" : ""}`}
        />
        {isHero && !value && (
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
        {value.trim() || attachments.length > 0 ? sendButton : micButton}
      </div>
    </form>
  );

  return (
    <div
      ref={composerWrapperRef}
      className={isHero ? "w-full" : "mx-auto mb-6 w-full max-w-[var(--max-w-chat)] px-4"}
    >
      {(attachments.length > 0 || activeTool) && (
        <div className="mb-2 flex flex-wrap gap-2">
          {activeTool && (
            <div className="flex items-center gap-2 rounded-lg border border-foreground/30 bg-surface-2 px-2 py-1 text-xs">
              <span>{TOOL_LABELS[activeTool]}</span>
              <button
                type="button"
                onClick={() => onSelectTool(null)}
                aria-label={`Remove ${TOOL_LABELS[activeTool]}`}
                className="text-muted hover:text-foreground"
              >
                ×
              </button>
            </div>
          )}
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

      <div className="box mx-auto">{formEl}</div>

      {!isHero && (
        <p className="mt-2 text-center text-xs text-muted">ChatGiZa is AI and can make mistakes.</p>
      )}
    </div>
  );
}
