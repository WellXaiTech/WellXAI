"use client";

import { useEffect, useRef, useState } from "react";
import type { Attachment } from "@/lib/attachments";
import TypingPlaceholder from "@/components/TypingPlaceholder";

export type ComposerTool = "web_search" | "deep_research" | "image" | "video" | null;

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
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

const PaperclipIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.49-8.48" />
  </svg>
);

const PaperclipStandingIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 6.5v10a3.5 3.5 0 0 1-7 0v-9a2 2 0 0 1 4 0v8.5a.5 .5 0 0 1-1 0v-8" />
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

const WaveformIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <rect x="2" y="9" width="2" height="6" rx="1" />
    <rect x="5.6" y="6" width="2" height="12" rx="1" />
    <rect x="9.2" y="3" width="2" height="18" rx="1" />
    <rect x="12.8" y="2" width="2" height="20" rx="1" />
    <rect x="16.4" y="5" width="2" height="14" rx="1" />
    <rect x="20" y="8" width="2" height="8" rx="1" />
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

const TOOL_LABELS: Record<Exclude<ComposerTool, null>, string> = {
  image: "Create image",
  video: "Create video",
  web_search: "Web search",
  deep_research: "Deep research",
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
  const menuRef = useRef<HTMLDivElement>(null);
  const toolMenuRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const [menuOpen, setMenuOpen] = useState(false);
  const [toolMenuOpen, setToolMenuOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const isHero = variant === "hero";

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (!toolMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (toolMenuRef.current && !toolMenuRef.current.contains(e.target as Node)) {
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
  ];

  const visibleMenuItems = menuItems.filter((item) => !item.tool || enabledTools?.[item.tool] !== false);
  const toolOnlyItems = visibleMenuItems.filter((item) => item.tool);

  return (
    <div className={isHero ? "w-full" : "mx-auto mb-6 w-full max-w-3xl px-4"}>
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

      <form
        onSubmit={onSubmit}
        className={
          isHero
            ? "card flex items-center gap-2 rounded-full px-3 py-2"
            : "card flex items-center gap-1 rounded-full px-2 py-1.5"
        }
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.md,text/plain,application/pdf"
          className="hidden"
          onChange={(e) => {
            onAddFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            aria-label="Add"
            disabled={disabled}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            {isHero ? PlusIcon : PaperclipStandingIcon}
          </button>

          {menuOpen && (
            <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-2xl border border-border bg-surface p-1.5 shadow-lg">
              {visibleMenuItems.map((item) => (
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
            </div>
          )}
        </div>

        {isHero ? (
          <div className="relative flex-1">
            <input
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              disabled={disabled}
              autoComplete="off"
              className="w-full bg-transparent px-2 py-1.5 text-sm outline-none disabled:cursor-not-allowed"
            />
            {!value && (
              <div className="pointer-events-none absolute inset-0 flex items-center px-2 text-sm text-muted">
                <TypingPlaceholder />
              </div>
            )}
          </div>
        ) : (
          <input
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            disabled={disabled}
            placeholder={disabled ? "ChatGiZa is typing…" : "Ask anything"}
            autoComplete="off"
            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none disabled:cursor-not-allowed"
          />
        )}

        {!isHero && (
          <div className="relative shrink-0" ref={toolMenuRef}>
            <button
              type="button"
              onClick={() => setToolMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2"
            >
              {!activeTool && LightningIcon}
              {activeTool ? TOOL_LABELS[activeTool] : "Fast"}
              {ChevronDownIcon}
            </button>

            {toolMenuOpen && (
              <div className="absolute bottom-full right-0 z-50 mb-2 w-56 rounded-2xl border border-border bg-surface p-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    onSelectTool(null);
                    setToolMenuOpen(false);
                  }}
                  className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-surface-2 ${
                    !activeTool ? "bg-surface-2" : ""
                  }`}
                >
                  Fast
                </button>
                {toolOnlyItems.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => {
                      onSelectTool(item.tool === activeTool ? null : (item.tool as ComposerTool));
                      setToolMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-surface-2 ${
                      item.tool === activeTool ? "bg-surface-2" : ""
                    }`}
                  >
                    <span className="text-muted">{item.icon}</span>
                    {item.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {isHero ? (
          <>
            <button
              type="button"
              aria-label="Hold to talk"
              onPointerDown={startListening}
              onPointerUp={stopListening}
              onPointerLeave={stopListening}
              onPointerCancel={stopListening}
              disabled={disabled}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${
                isListening ? "btn-primary" : "text-muted hover:text-foreground hover:bg-surface-2"
              }`}
            >
              {WaveformIcon}
            </button>
            <button
              type="submit"
              aria-label="Send"
              disabled={disabled || (!value.trim() && attachments.length === 0)}
              className="btn-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:opacity-85 disabled:opacity-40"
            >
              {ArrowUpIcon}
            </button>
          </>
        ) : value.trim() || attachments.length > 0 ? (
          <button
            type="submit"
            aria-label="Send"
            disabled={disabled}
            className="btn-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-85 disabled:opacity-40"
          >
            {ArrowUpIcon}
          </button>
        ) : (
          <button
            type="button"
            aria-label="Hold to talk"
            onPointerDown={startListening}
            onPointerUp={stopListening}
            onPointerLeave={stopListening}
            onPointerCancel={stopListening}
            disabled={disabled}
            className={`btn-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-opacity disabled:cursor-not-allowed disabled:opacity-40 ${
              isListening ? "animate-pulse" : "hover:opacity-85"
            }`}
          >
            {WaveformIcon}
          </button>
        )}
      </form>

      {!isHero && (
        <p className="mt-2 text-center text-xs text-muted">ChatGiZa is AI and can make mistakes.</p>
      )}
    </div>
  );
}
