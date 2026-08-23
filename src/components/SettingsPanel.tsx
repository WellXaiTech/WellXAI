"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { chatgizaSignOut } from "@/lib/signOutHelper";
import VoiceOrb from "@/components/VoiceOrb";
import type { Theme } from "@/lib/theme";
import type { Contrast } from "@/lib/contrast";
import type { ChatFontSize } from "@/lib/fontSize";
import type { AssistantColor } from "@/lib/assistantColor";
import type { ChatFont } from "@/lib/chatFont";
import type { ReduceMotion } from "@/lib/reduceMotion";
import { COUNTRIES } from "@/lib/countries";
import { checkBirthDate, getMaxBirthDate } from "@/lib/ageGate";
import {
  getStoredVoiceURI,
  setStoredVoiceURI,
  getStoredVoiceSpeed,
  setStoredVoiceSpeed,
  getStoredVoiceLang,
  setStoredVoiceLang,
  getPremiumVoiceEnabled,
  setPremiumVoiceEnabled,
  getStoredPremiumVoiceName,
  setStoredPremiumVoiceName,
  type VoiceSpeed,
  type PremiumVoiceName,
} from "@/lib/voice";

export type Profile = {
  nickname: string;
  about: string;
  role?: string;
  fullName?: string;
  birthDate?: string;
  country?: string;
  // Public-facing (shown on the ChatGiZa Media profile page).
  link?: string;
};

export type PrivacyPrefs = {
  improveModel: boolean;
  includeAudioRecordings: boolean;
  includeVideoRecordings: boolean;
  marketingMeasurement: boolean;
  personalizedMarketing: boolean;
};

type ConversationLite = {
  id: string;
  title: string;
  shared?: boolean;
  archived?: boolean;
  messages?: {
    id?: string;
    role?: string;
    content?: string;
    createdAt?: number;
    attachments?: {
      id?: string;
      name?: string;
      kind: string;
      dataUrl?: string;
      text?: string;
      pages?: string[];
      sizeBytes?: number;
    }[];
    imageUrl?: string;
    videoUrl?: string;
  }[];
};

type StorageItem = {
  id: string;
  label: string;
  conversationTitle: string;
  bytes?: number;
  thumbnailUrl?: string;
  createdAt?: number;
};

type DeviceSession = { id: string; device: string; os: string; signedInAt: number; ip?: string; location?: string };

const TABS_GROUP_1 = ["Overview", "General", "Preference", "Security"] as const;
const TABS_GROUP_2 = ["Account", "Dashboard", "Storage Management", "Subaccount"] as const;
export type Tab = (typeof TABS_GROUP_1)[number] | (typeof TABS_GROUP_2)[number];

const TAB_DESCRIPTIONS: Record<Tab, string> = {
  Overview: "Your profile at a glance",
  General: "Appearance, language, and behavior",
  Preference: "Voice, connectors, automations, and data",
  Security: "Password, sessions, and login",
  Account: "Profile and personal info",
  Dashboard: "Your usage stats and data, in one place",
  "Storage Management": "Files, images, memory, and space used",
  Subaccount: "Extra accounts that live under yours",
};

const DataControlsIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3Z" />
  </svg>
);

const SecurityLockIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

const AccountIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
  </svg>
);

const StorageIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </svg>
);

// Idea #10: a personal data dashboard -- three bars, not a generic
// gear/chart glyph, so it reads distinctly as "your stats" in the tab list.
const DashboardIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="12" width="4" height="8" rx="1" />
    <rect x="10" y="7" width="4" height="13" rx="1" />
    <rect x="16" y="3" width="4" height="17" rx="1" />
  </svg>
);

const ChevronDownIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const SearchIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const GearIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

const OverviewIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.557 2.75H4.682A1.93 1.93 0 0 0 2.75 4.682v3.875a1.94 1.94 0 0 0 1.932 1.942h3.875a1.94 1.94 0 0 0 1.942-1.942V4.682A1.94 1.94 0 0 0 8.557 2.75m10.761 0h-3.875a1.94 1.94 0 0 0-1.942 1.932v3.875a1.943 1.943 0 0 0 1.942 1.942h3.875a1.94 1.94 0 0 0 1.932-1.942V4.682a1.93 1.93 0 0 0-1.932-1.932M8.557 13.5H4.682a1.943 1.943 0 0 0-1.932 1.943v3.875a1.93 1.93 0 0 0 1.932 1.932h3.875a1.94 1.94 0 0 0 1.942-1.932v-3.875a1.94 1.94 0 0 0-1.942-1.942m8.818-.001a3.875 3.875 0 1 0 0 7.75a3.875 3.875 0 0 0 0-7.75" />
  </svg>
);

const SubaccountIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="9" cy="7" r="3.5" />
    <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
    <circle cx="18" cy="7" r="2.5" strokeDasharray="3 2" />
    <path d="M22 15.5a4.7 4.7 0 0 0-3.5-1.5" strokeDasharray="3 2" />
  </svg>
);

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  Overview: OverviewIcon,
  General: GearIcon,
  Preference: DataControlsIcon,
  Security: SecurityLockIcon,
  Account: AccountIcon,
  Dashboard: DashboardIcon,
  "Storage Management": StorageIcon,
  Subaccount: SubaccountIcon,
};

const SystemIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="13" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);

const SunIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const MoonIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
);

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label?: string; icon?: React.ReactNode; ariaLabel?: string }[];
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-label={opt.ariaLabel ?? opt.label}
          aria-pressed={value === opt.value}
          className={`flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            value === opt.value ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"
          }`}
        >
          {opt.icon ?? opt.label}
        </button>
      ))}
    </div>
  );
}

function SettingsSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full appearance-none rounded-xl border border-border bg-surface px-3 py-2.5 pr-9 text-sm text-foreground outline-none transition-colors hover:bg-surface-2 focus:border-foreground/40"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
        {ChevronDownIcon}
      </span>
    </div>
  );
}

const TrashIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="m19.5 5.5l-.62 10.025c-.158 2.561-.237 3.842-.88 4.763a4 4 0 0 1-1.2 1.128c-.957.584-2.24.584-4.806.584c-2.57 0-3.855 0-4.814-.585a4 4 0 0 1-1.2-1.13c-.642-.922-.72-2.205-.874-4.77L4.5 5.5M3 5.5h18m-4.944 0l-.683-1.408c-.453-.936-.68-1.403-1.071-1.695a2 2 0 0 0-.275-.172C13.594 2 13.074 2 12.035 2c-1.066 0-1.599 0-2.04.234a2 2 0 0 0-.278.18c-.395.303-.616.788-1.058 1.757L8.053 5.5m1.447 11v-6m5 6v-6" />
  </svg>
);

const ChevronLeftIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const CloseIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18" />
    <path d="M6 6l12 12" />
  </svg>
);

const ChevronRightIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const CheckIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

// Same voice picker as the app's own "Voice Library" screen (see
// VOICE_OPTIONS in MainActivity.kt) -- friendly name + one-line
// description per card, id is the actual OpenAI Realtime voice name.
const VOICE_OPTIONS = [
  { id: "cedar" as const, name: "Orin", description: "Wise Male" },
  { id: "alloy" as const, name: "Lyra", description: "Calm Female" },
  { id: "ballad" as const, name: "Kael", description: "Bold Male" },
  { id: "coral" as const, name: "Elia", description: "Warm Female" },
  { id: "sage" as const, name: "Leo", description: "Smart Male" },
  { id: "marin" as const, name: "GiZa", description: "Playful" },
];

const FontIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 6h16M4 12h10M4 18h13" />
  </svg>
);

const LanguageIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.7 3.8 6 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-6-3.8-9s1.3-6.3 3.8-9Z" />
  </svg>
);

const CommunityIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="9" cy="8" r="3" />
    <path d="M2 20c0-3.3 3.1-5 7-5s7 1.7 7 5" />
    <circle cx="17" cy="7" r="2.3" />
    <path d="M22 20c0-2.7-2-4.2-4.5-4.6" />
  </svg>
);

const VoiceIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v4M9 22h6" />
  </svg>
);

const ConnectorsIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 2v4M15 2v4M9 18v4M15 18v4" />
    <rect x="6" y="6" width="12" height="12" rx="3" />
  </svg>
);

const AutomationsIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l3 2M9 2h6" />
  </svg>
);

const LibraryIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="14" height="14" rx="2" />
    <path d="M7 21h14a2 2 0 0 0 2-2V7" />
  </svg>
);

const ProjectsIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </svg>
);

const EmailIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="m3 6 9 7 9-7" />
  </svg>
);

// Sizes are in explicit pixel numbers (not Tailwind arbitrary classes) so the
// thumb's sliding `transform` is set as an inline style — Tailwind's
// `translate-x-*` utilities weren't emitting any `transform` at all here
// (computed style came back `transform: none`), leaving the thumb stuck in
// place instead of sliding between the off/on positions.
const TOGGLE_TRACK_W = 40;
const TOGGLE_TRACK_H = 24;
const TOGGLE_THUMB = 20;
const TOGGLE_INSET = 2;

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  const thumbX = checked ? TOGGLE_TRACK_W - TOGGLE_THUMB - TOGGLE_INSET : TOGGLE_INSET;
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      aria-pressed={checked}
      style={{ width: TOGGLE_TRACK_W, height: TOGGLE_TRACK_H }}
      className={`relative shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40 ${
        checked ? "bg-[#0a84ff]" : "border border-border bg-surface-2"
      }`}
    >
      <span
        style={{
          width: TOGGLE_THUMB,
          height: TOGGLE_THUMB,
          top: TOGGLE_INSET - 1,
          left: 0,
          transform: `translateX(${thumbX}px)`,
        }}
        className="absolute rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform duration-200"
      />
    </button>
  );
}

function Row({
  title,
  description,
  control,
  border = true,
}: {
  title: string;
  description?: string;
  control: React.ReactNode;
  border?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3.5 ${border ? "border-b border-border" : ""}`}>
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mt-0.5 max-w-sm text-xs text-muted">{description}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

type CommunityMsg = { id: string; authorId: string; authorName: string; content: string; createdAt: number };

// One global room every ChatGiZa user lands in via "Join Our Community" --
// same feature and same /api/community endpoint as the Android app's
// Community screen, just a minimal web equivalent (poll + post) since
// there was no web frontend for it yet.
function CommunityModal({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<CommunityMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/community");
        const data = await res.json();
        if (!cancelled && Array.isArray(data.messages)) setMessages(data.messages);
      } catch {
        // ignore -- next poll will retry
      }
      if (!cancelled) setLoading(false);
    }
    load();
    const interval = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (Array.isArray(data.messages)) setMessages(data.messages);
    } catch {
      // ignore -- the input already cleared, next poll reconciles
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-[70vh] w-full max-w-md flex-col rounded-2xl border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Join Our Community</h3>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-foreground">
            {ChevronLeftIcon}
          </button>
        </div>
        <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {loading ? (
            <p className="text-center text-xs text-muted">Loading…</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-xs text-muted">No messages yet — say hello!</p>
          ) : (
            messages.map((m) => (
              <div key={m.id}>
                <p className="text-xs font-semibold text-muted">{m.authorName}</p>
                <p className="whitespace-pre-wrap text-sm">{m.content}</p>
              </div>
            ))
          )}
        </div>
        <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Say something…"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="btn-primary rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

function ComingSoonNote({ text }: { text?: string }) {
  return (
    <p className="mt-1 text-xs text-muted">
      {text ?? "This isn't built yet — coming soon."}
    </p>
  );
}

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function SettingsPanel({
  onClose,
  theme,
  onThemeChange,
  contrast,
  onContrastChange,
  fontSize,
  onFontSizeChange,
  assistantColor,
  onAssistantColorChange,
  chatFont,
  onChatFontChange,
  reduceMotion,
  onReduceMotionChange,
  notifyOnComplete,
  onToggleNotifyOnComplete,
  notifyImageGen,
  onToggleNotifyImageGen,
  allNotificationsEnabled,
  onToggleAllNotifications,
  privacyPrefs,
  onPrivacyPrefsChange,
  feedbackEmailsOptIn,
  onToggleFeedbackEmailsOptIn,
  onOpenSupport,
  onOpenPlugins,
  onOpenScheduled,
  onOpenLibrary,
  onOpenProjects,
  onDeleteAccount,
  profile,
  onProfileChange,
  memoryEnabled,
  onToggleMemoryEnabled,
  memory,
  onAddMemory,
  onRemoveMemory,
  digitalTwin,
  digitalTwinUpdatedAt,
  digitalTwinRegenerating,
  onChangeDigitalTwin,
  onRegenerateDigitalTwin,
  historyEnabled,
  onToggleHistoryEnabled,
  onClearHistory,
  conversations,
  onShareConversation,
  onUnshareConversation,
  onUnarchiveConversation,
  onDeleteConversation,
  onExportData,
  onArchiveAllConversations,
  location,
  locationError,
  onRequestLocation,
  onClearLocation,
  initialTab,
}: {
  onClose: () => void;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
  contrast: Contrast;
  onContrastChange: (c: Contrast) => void;
  fontSize: ChatFontSize;
  onFontSizeChange: (s: ChatFontSize) => void;
  assistantColor: AssistantColor;
  onAssistantColorChange: (c: AssistantColor) => void;
  chatFont: ChatFont;
  onChatFontChange: (f: ChatFont) => void;
  reduceMotion: ReduceMotion;
  onReduceMotionChange: (m: ReduceMotion) => void;
  notifyOnComplete: boolean;
  onToggleNotifyOnComplete: () => void;
  notifyImageGen: boolean;
  onToggleNotifyImageGen: () => void;
  allNotificationsEnabled: boolean;
  onToggleAllNotifications: () => void;
  privacyPrefs: PrivacyPrefs;
  onPrivacyPrefsChange: (p: PrivacyPrefs) => void;
  feedbackEmailsOptIn: boolean;
  onToggleFeedbackEmailsOptIn: () => void;
  onOpenSupport: () => void;
  onOpenPlugins: () => void;
  onOpenScheduled: () => void;
  onOpenLibrary: () => void;
  onOpenProjects: () => void;
  onDeleteAccount: () => void;
  profile: Profile;
  onProfileChange: (p: Profile) => void;
  memoryEnabled: boolean;
  onToggleMemoryEnabled: () => void;
  memory: string[];
  onAddMemory: (fact: string) => void;
  onRemoveMemory: (index: number) => void;
  digitalTwin: string;
  digitalTwinUpdatedAt: number;
  digitalTwinRegenerating: boolean;
  onChangeDigitalTwin: (summary: string) => void;
  onRegenerateDigitalTwin: () => void;
  historyEnabled: boolean;
  onToggleHistoryEnabled: () => void;
  onClearHistory: () => void;
  conversations: ConversationLite[];
  onShareConversation: (id: string) => void;
  onUnshareConversation: (id: string) => void;
  onUnarchiveConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onExportData: () => void;
  onArchiveAllConversations: () => void;
  location: string;
  locationError: string | null;
  onRequestLocation: () => void;
  onClearLocation: () => void;
  initialTab?: Tab;
}) {
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<Tab>(initialTab ?? "General");
  const [mobileShowContent, setMobileShowContent] = useState(false);

  function selectTab(t: Tab) {
    setTab(t);
    setMobileShowContent(true);
  }
  const [nickname, setNickname] = useState(profile.nickname);
  const [about, setAbout] = useState(profile.about);
  const [role, setRole] = useState(profile.role ?? "");
  const [fullName, setFullName] = useState(profile.fullName ?? session?.user?.name ?? "");
  const [birthDate, setBirthDate] = useState(profile.birthDate ?? "");
  const [country, setCountry] = useState(profile.country ?? "");
  const [link, setLink] = useState(profile.link ?? "");
  const [newFact, setNewFact] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmArchiveAll, setConfirmArchiveAll] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const [dataView, setDataView] = useState<"root" | "shared" | "archived">("root");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [subaccounts, setSubaccounts] = useState<{ id: string; name: string; avatar_preset_id: string | null; created_at: string }[]>([]);
  const [subaccountsLoaded, setSubaccountsLoaded] = useState(false);
  const [subaccountsLoading, setSubaccountsLoading] = useState(false);
  const [subaccountError, setSubaccountError] = useState<string | null>(null);
  const [newSubaccountName, setNewSubaccountName] = useState("");
  const [creatingSubaccount, setCreatingSubaccount] = useState(false);
  const [renamingSubaccountId, setRenamingSubaccountId] = useState<string | null>(null);
  const [renameSubaccountValue, setRenameSubaccountValue] = useState("");
  const [confirmDeleteSubaccountId, setConfirmDeleteSubaccountId] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "Subaccount" || subaccountsLoaded) return;
    setSubaccountsLoading(true);
    fetch("/api/subaccounts")
      .then((r) => r.json())
      .then((d) => setSubaccounts(Array.isArray(d.subaccounts) ? d.subaccounts : []))
      .catch(() => setSubaccountError("Failed to load subaccounts."))
      .finally(() => {
        setSubaccountsLoading(false);
        setSubaccountsLoaded(true);
      });
  }, [tab, subaccountsLoaded]);

  async function createSubaccount(e: React.FormEvent) {
    e.preventDefault();
    const name = newSubaccountName.trim();
    if (!name || creatingSubaccount) return;
    setCreatingSubaccount(true);
    setSubaccountError(null);
    try {
      const res = await fetch("/api/subaccounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubaccountError(data.error ?? "Failed to create subaccount.");
        return;
      }
      setSubaccounts((prev) => [...prev, { id: data.id, name: data.name, avatar_preset_id: data.avatarPresetId ?? null, created_at: new Date().toISOString() }]);
      setNewSubaccountName("");
    } catch {
      setSubaccountError("Failed to create subaccount.");
    } finally {
      setCreatingSubaccount(false);
    }
  }

  async function renameSubaccount(id: string) {
    const name = renameSubaccountValue.trim();
    if (!name) return;
    try {
      const res = await fetch(`/api/subaccounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubaccountError(data.error ?? "Failed to rename subaccount.");
        return;
      }
      setSubaccounts((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
      setRenamingSubaccountId(null);
    } catch {
      setSubaccountError("Failed to rename subaccount.");
    }
  }

  async function deleteSubaccount(id: string) {
    try {
      const res = await fetch(`/api/subaccounts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubaccountError(data.error ?? "Failed to delete subaccount.");
        return;
      }
      setSubaccounts((prev) => prev.filter((s) => s.id !== id));
      setConfirmDeleteSubaccountId(null);
    } catch {
      setSubaccountError("Failed to delete subaccount.");
    }
  }
  const [storageView, setStorageView] = useState<"root" | "files" | "images">("root");
  const [colorThemeOpen, setColorThemeOpen] = useState(false);
  const [chatFontOpen, setChatFontOpen] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [tabSearch, setTabSearch] = useState("");
  const tabQuery = tabSearch.trim().toLowerCase();
  const visibleTabsGroup1 = TABS_GROUP_1.filter((t) => t.toLowerCase().includes(tabQuery));
  const visibleTabsGroup2 = TABS_GROUP_2.filter((t) => t.toLowerCase().includes(tabQuery));
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [voiceSpeed, setVoiceSpeed] = useState<VoiceSpeed>("normal");
  const [voiceLang, setVoiceLang] = useState("");
  const [premiumVoice, setPremiumVoice] = useState(false);
  const [premiumVoiceName, setPremiumVoiceName] = useState<PremiumVoiceName>("marin");
  const sharedConversations = conversations.filter((c) => c.shared);
  const archivedConversations = conversations.filter((c) => c.archived);

  const [sessions, setSessions] = useState<DeviceSession[] | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    setVoiceURI(getStoredVoiceURI());
    setVoiceSpeed(getStoredVoiceSpeed());
    setVoiceLang(getStoredVoiceLang());
    setPremiumVoice(getPremiumVoiceEnabled());
    setPremiumVoiceName(getStoredPremiumVoiceName());
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    function loadVoices() {
      setVoices(window.speechSynthesis.getVoices());
    }
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  useEffect(() => {
    if (tab !== "Security" || !session?.user || sessions !== null) return;
    setSessionsLoading(true);
    setSessionsError(null);
    fetch("/api/sessions")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: { sessions: DeviceSession[]; currentSessionId: string | null }) => {
        setSessions(data.sessions);
        setCurrentSessionId(data.currentSessionId);
      })
      .catch(() => setSessionsError("Couldn't load your sessions."))
      .finally(() => setSessionsLoading(false));
  }, [tab, session?.user, sessions]);

  async function revokeSession(id: string) {
    setRevokingId(id);
    try {
      await fetch("/api/sessions/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id }),
      });
      setSessions((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
    } catch {
      setSessionsError("Couldn't log that device out. Try again.");
    } finally {
      setRevokingId(null);
    }
  }

  async function logoutAllSessions() {
    await fetch("/api/sessions/revoke-all", { method: "POST" }).catch(() => {});
    chatgizaSignOut();
  }


  const voiceLanguages = Array.from(new Set(voices.map((v) => v.lang))).sort();
  const filteredVoices = voiceLang ? voices.filter((v) => v.lang === voiceLang) : voices;

  const birthDateCheck = checkBirthDate(birthDate);

  function saveProfile() {
    if (!birthDateCheck.ok) return;
    onProfileChange({ nickname, about, role, fullName, birthDate, country, link });
  }

  function updatePrivacy(patch: Partial<PrivacyPrefs>) {
    onPrivacyPrefsChange({ ...privacyPrefs, ...patch });
  }

  const fileItems: StorageItem[] = [];
  const imageItems: StorageItem[] = [];
  for (const c of conversations) {
    for (const m of c.messages ?? []) {
      if (m.imageUrl) {
        imageItems.push({
          id: m.id ?? `${c.id}-image-${imageItems.length}`,
          label: "Generated image",
          conversationTitle: c.title,
          bytes: m.imageUrl.startsWith("data:") ? Math.round((m.imageUrl.length * 3) / 4) : undefined,
          thumbnailUrl: m.imageUrl,
          createdAt: m.createdAt,
        });
      }
      if (m.videoUrl) {
        imageItems.push({
          id: m.id ?? `${c.id}-video-${imageItems.length}`,
          label: "Generated video",
          conversationTitle: c.title,
          bytes: m.videoUrl.startsWith("data:") ? Math.round((m.videoUrl.length * 3) / 4) : undefined,
          createdAt: m.createdAt,
        });
      }
      for (const a of m.attachments ?? []) {
        // `sizeBytes` is the real uploaded file size (captured from `File.size`
        // at upload time — see lib/attachments.ts). Older conversations saved
        // before that existed won't have it, so fall back to an estimate from
        // whatever content was actually stored for them.
        const estimatedBytes =
          a.kind === "image"
            ? a.dataUrl
              ? Math.round((a.dataUrl.length * 3) / 4)
              : undefined
            : (a.text?.length ?? 0) + (a.pages ? a.pages.join("").length : 0);

        if (a.kind === "image") {
          imageItems.push({
            id: a.id ?? `${c.id}-${imageItems.length}`,
            label: a.name ?? "Uploaded image",
            conversationTitle: c.title,
            bytes: a.sizeBytes ?? estimatedBytes,
            thumbnailUrl: a.dataUrl,
            createdAt: m.createdAt,
          });
        } else {
          fileItems.push({
            id: a.id ?? `${c.id}-${fileItems.length}`,
            label: a.name ?? "Uploaded file",
            conversationTitle: c.title,
            bytes: a.sizeBytes ?? estimatedBytes,
            createdAt: m.createdAt,
          });
        }
      }
    }
  }
  const fileCount = fileItems.length;
  const fileBytes = fileItems.reduce((sum, i) => sum + (i.bytes ?? 0), 0);
  const imageCount = imageItems.length;
  const imageBytes = imageItems.reduce((sum, i) => sum + (i.bytes ?? 0), 0);
  const storageBytesUsed = JSON.stringify(conversations).length;
  const storageCapBytes = 4 * 1024 * 1024 * 1024;
  const storagePct = Math.min(100, Math.round((storageBytesUsed / storageCapBytes) * 100));

  // Idea #10: a personal data dashboard -- transparency into what ChatGiZa
  // actually holds about the user, computed entirely from data already
  // loaded client-side (no extra network round trip needed for this tab).
  const activeConversations = conversations.filter((c) => !c.archived);
  const allMessages = conversations.flatMap((c) => c.messages ?? []);
  const userMessages = allMessages.filter((m) => m.role === "user");
  const assistantMessages = allMessages.filter((m) => m.role === "assistant");
  const wordsWritten = userMessages.reduce((sum, m) => sum + (m.content?.trim().split(/\s+/).filter(Boolean).length ?? 0), 0);
  const attachmentCount = allMessages.reduce((sum, m) => sum + (m.attachments?.length ?? 0), 0);
  const mediaCount = allMessages.filter((m) => m.imageUrl || m.videoUrl).length;
  const timestamps = allMessages.map((m) => m.createdAt).filter((t): t is number => typeof t === "number");
  const firstMessageAt = timestamps.length ? Math.min(...timestamps) : null;
  const lastMessageAt = timestamps.length ? Math.max(...timestamps) : null;
  const activeDayCount = new Set(timestamps.map((t) => new Date(t).toDateString())).size;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-0 sm:p-10" onClick={onClose}>
      <div
        className="card flex h-full max-h-full w-full max-w-6xl overflow-hidden rounded-none sm:h-auto sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`no-scrollbar w-full overflow-y-auto p-3 sm:block sm:w-48 sm:shrink-0 sm:border-r sm:border-border ${
            mobileShowContent ? "hidden" : "block"
          }`}
        >
          <div className="mb-4 flex items-center gap-3 sm:hidden">
            <button
              onClick={onClose}
              aria-label="Close settings"
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-2"
            >
              {CloseIcon}
            </button>
            <h2 className="text-lg font-semibold">Settings</h2>
          </div>

          {session?.user && (
            <button
              onClick={() => selectTab("Account")}
              className="mb-4 flex w-full items-center gap-4 rounded-2xl bg-surface-2 p-4 text-left sm:hidden"
            >
              {session.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.user.image} alt="" className="h-14 w-14 shrink-0 rounded-full" />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border text-lg">
                  {session.user.name?.[0] ?? "?"}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold">{session.user.name}</p>
                <p className="truncate text-sm text-muted">View profile</p>
              </div>
            </button>
          )}

          <div className="relative mb-3 hidden sm:block">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted">
              {SearchIcon}
            </span>
            <input
              value={tabSearch}
              onChange={(e) => setTabSearch(e.target.value)}
              placeholder="Search"
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-2 text-sm outline-none focus:border-foreground/40"
            />
          </div>
          <div className="mb-1 px-1 sm:block hidden">
            <span className="text-xs text-muted">Settings</span>
          </div>
          <ul className="divide-y divide-border/60 rounded-2xl bg-surface-2 p-1 sm:space-y-0.5 sm:divide-y-0 sm:rounded-none sm:bg-transparent sm:p-0">
            {visibleTabsGroup1.map((t) => (
              <li key={t}>
                <button
                  onClick={() => selectTab(t)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors sm:gap-2 sm:rounded-lg sm:px-2.5 sm:py-2 ${
                    tab === t ? "bg-surface-2 sm:bg-surface-2" : "hover:bg-surface sm:hover:bg-surface-2"
                  }`}
                >
                  <span className="text-muted">{TAB_ICONS[t]}</span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-base sm:text-sm ${
                        tab === t ? "font-medium text-foreground" : "font-medium text-foreground sm:font-normal sm:text-muted"
                      }`}
                    >
                      {t}
                    </span>
                    <span className="block text-sm text-muted sm:hidden">{TAB_DESCRIPTIONS[t]}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {visibleTabsGroup2.length > 0 && (
            <>
              <div className="my-3 sm:my-2 sm:border-t sm:border-border" />
              <ul className="divide-y divide-border/60 rounded-2xl bg-surface-2 p-1 sm:space-y-0.5 sm:divide-y-0 sm:rounded-none sm:bg-transparent sm:p-0">
                {visibleTabsGroup2.map((t) => (
                  <li key={t}>
                    <button
                      onClick={() => selectTab(t)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors sm:gap-2 sm:rounded-lg sm:px-2.5 sm:py-2 ${
                        tab === t ? "bg-surface-2" : "hover:bg-surface sm:hover:bg-surface-2"
                      }`}
                    >
                      <span className="text-muted">{TAB_ICONS[t]}</span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-base sm:text-sm ${
                            tab === t ? "font-medium text-foreground" : "font-medium text-foreground sm:font-normal sm:text-muted"
                          }`}
                        >
                          {t}
                        </span>
                        <span className="block text-sm text-muted sm:hidden">{TAB_DESCRIPTIONS[t]}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {session?.user && (
            <button
              onClick={() => chatgizaSignOut()}
              className="mt-4 w-full rounded-2xl bg-surface-2 px-3 py-3 text-center text-base font-medium text-red-500 transition-colors hover:bg-surface sm:hidden"
            >
              Sign out
            </button>
          )}
        </div>

        <div
          className={`no-scrollbar w-full max-h-full overflow-y-auto p-5 sm:block sm:max-h-[80vh] sm:flex-1 ${
            mobileShowContent ? "block" : "hidden"
          }`}
        >
          <button
            onClick={() => setMobileShowContent(false)}
            className="mb-3 flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground sm:hidden"
          >
            {ChevronLeftIcon} Settings
          </button>

          {tab === "Overview" && (
            <div>
              <h2 className="mb-4 text-base font-semibold">Overview</h2>

              {status === "loading" ? (
                <p className="text-xs text-muted">Loading…</p>
              ) : session?.user ? (
                <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                  {session.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={session.user.image} alt="" className="h-14 w-14 shrink-0 rounded-full" />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border text-lg">
                      {session.user.name?.[0] ?? "?"}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold">{session.user.name}</p>
                    <p className="truncate text-sm text-muted">{session.user.email}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted">Sign in to see your profile.</p>
              )}
            </div>
          )}

          {tab === "General" && (
            <div>
              <h2 className="mb-4 text-base font-semibold">General</h2>

              {/* Same list-of-rows arrangement as the ChatGiZa app's own
                  Settings menu (icon, label, trailing value/chevron),
                  in the same order: Language, Color Theme, Storage
                  management, Join Our Community. */}
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 border-b border-border py-3.5 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-muted">{LanguageIcon}</span>
                  <span className="text-sm font-medium">Language</span>
                </div>
                <span className="text-sm text-muted">English</span>
              </button>

              <div className="border-b border-border">
                <button
                  type="button"
                  onClick={() => setColorThemeOpen((v) => !v)}
                  className="flex w-full items-center justify-between gap-3 py-3.5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted">{SunIcon}</span>
                    <span className="text-sm font-medium">Color Theme</span>
                  </div>
                  <span className="flex items-center gap-2 text-sm text-muted">
                    {theme === "system" ? "System" : theme === "light" ? "Light" : "Dark"}
                    {ChevronRightIcon}
                  </span>
                </button>
                {colorThemeOpen && (
                  <div className="pb-4">
                    <SegmentedControl
                      value={theme}
                      onChange={onThemeChange}
                      options={[
                        { value: "system" as Theme, icon: SystemIcon, ariaLabel: "System" },
                        { value: "light" as Theme, icon: SunIcon, ariaLabel: "Light" },
                        { value: "dark" as Theme, icon: MoonIcon, ariaLabel: "Dark" },
                      ]}
                    />
                  </div>
                )}
              </div>

              <div className="border-b border-border">
                <button
                  type="button"
                  onClick={() => setChatFontOpen((v) => !v)}
                  className="flex w-full items-center justify-between gap-3 py-3.5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted">{FontIcon}</span>
                    <span className="text-sm font-medium">Font</span>
                  </div>
                  <span className="flex items-center gap-2 text-sm text-muted">
                    {chatFont === "manrope" ? "Manrope" : chatFont === "system" ? "System" : "Plus Jakarta Sans"}
                    {ChevronRightIcon}
                  </span>
                </button>
                {chatFontOpen && (
                  // Each option's own name is rendered IN that font (a real
                  // preview, not just a label) -- SegmentedControl's `icon`
                  // slot takes any node, not just an actual icon, which is
                  // what makes this possible without a separate component.
                  <div className="pb-4">
                    <SegmentedControl
                      value={chatFont}
                      onChange={onChatFontChange}
                      options={[
                        {
                          value: "plus_jakarta_sans" as ChatFont,
                          icon: <span style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>Plus Jakarta Sans</span>,
                          ariaLabel: "Plus Jakarta Sans",
                        },
                        {
                          value: "manrope" as ChatFont,
                          icon: <span style={{ fontFamily: "var(--font-manrope)" }}>Manrope</span>,
                          ariaLabel: "Manrope",
                        },
                        {
                          value: "system" as ChatFont,
                          icon: <span style={{ fontFamily: "system-ui, sans-serif" }}>System</span>,
                          ariaLabel: "System Default",
                        },
                      ]}
                    />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setTab("Storage Management")}
                className="flex w-full items-center justify-between gap-3 border-b border-border py-3.5 text-left transition-colors hover:bg-surface-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-muted">{StorageIcon}</span>
                  <span className="text-sm font-medium">Storage management</span>
                </div>
                <span className="text-muted">{ChevronRightIcon}</span>
              </button>

              <button
                type="button"
                onClick={() => setCommunityOpen(true)}
                className="flex w-full items-center justify-between gap-3 py-3.5 text-left transition-colors hover:bg-surface-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-muted">{CommunityIcon}</span>
                  <span className="text-sm font-medium">Join Our Community</span>
                </div>
                <span className="text-muted">{ChevronRightIcon}</span>
              </button>

              {communityOpen && <CommunityModal onClose={() => setCommunityOpen(false)} />}
            </div>
          )}

          {tab === "Preference" && dataView === "root" && (
            <div>
              <h2 className="mb-4 text-base font-semibold">Preference</h2>

              {/* Same order as the ChatGiZa app's Preference screen. */}
              <div className="border-b border-border">
                <button
                  type="button"
                  onClick={() => setVoiceOpen((v) => !v)}
                  className="flex w-full items-center justify-between gap-3 py-3.5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted">{VoiceIcon}</span>
                    <span className="text-sm font-medium">Voice</span>
                  </div>
                  <span className="text-muted">{ChevronRightIcon}</span>
                </button>
                {voiceOpen && (
                  <div className="pb-4">
                    <div className="flex items-center justify-between gap-4 py-2">
                      <h3 className="text-sm font-semibold">Voice language</h3>
                      <div className="w-40 shrink-0">
                        <SettingsSelect
                          value={voiceLang}
                          onChange={(lang) => {
                            setVoiceLang(lang);
                            setStoredVoiceLang(lang);
                          }}
                          options={[
                            { value: "", label: "Auto Detect" },
                            ...voiceLanguages.map((lang) => ({ value: lang, label: lang })),
                          ]}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t border-border py-3">
                      <div>
                        <h3 className="text-sm font-semibold">Premium Voice</h3>
                        <p className="text-xs text-muted">Real AI-generated speech instead of your browser&apos;s built-in voice.</p>
                      </div>
                      <Toggle
                        checked={premiumVoice}
                        onChange={() => {
                          const next = !premiumVoice;
                          setPremiumVoice(next);
                          setPremiumVoiceEnabled(next);
                        }}
                      />
                    </div>

                    {premiumVoice && (
                      <div className="border-t border-border py-3">
                        <h3 className="mb-2 text-sm font-semibold">Premium voice</h3>
                        <div className="mb-4 flex justify-center">
                          <VoiceOrb className="h-40 w-40" />
                        </div>
                        <div className="space-y-1.5">
                          {VOICE_OPTIONS.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => {
                                setPremiumVoiceName(option.id);
                                setStoredPremiumVoiceName(option.id);
                              }}
                              className="flex w-full items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3 text-left transition-colors hover:bg-surface"
                            >
                              <div>
                                <p className="text-sm font-semibold">{option.name}</p>
                                <p className="text-xs text-muted">{option.description}</p>
                              </div>
                              {premiumVoiceName === option.id && <span className="shrink-0 text-foreground">{CheckIcon}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4 border-t border-border py-3">
                      <h3 className="text-sm font-semibold">Voice</h3>
                      <div className="w-52 shrink-0">
                        {filteredVoices.length === 0 ? (
                          <p className="text-right text-xs text-muted">No voices found</p>
                        ) : (
                          <SettingsSelect
                            value={voiceURI}
                            onChange={(uri) => {
                              setVoiceURI(uri);
                              setStoredVoiceURI(uri);
                            }}
                            options={[
                              { value: "", label: "Browser default" },
                              ...filteredVoices.map((v) => ({ value: v.voiceURI, label: v.name })),
                            ]}
                          />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t border-border py-3">
                      <h3 className="text-sm font-semibold">Speed</h3>
                      <div className="w-40 shrink-0">
                        <SettingsSelect
                          value={voiceSpeed}
                          onChange={(speed) => {
                            setVoiceSpeed(speed);
                            setStoredVoiceSpeed(speed);
                          }}
                          options={[
                            { value: "slow" as VoiceSpeed, label: "Slow" },
                            { value: "normal" as VoiceSpeed, label: "Normal" },
                            { value: "fast" as VoiceSpeed, label: "Fast" },
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={onOpenPlugins}
                className="flex w-full items-center justify-between gap-3 border-b border-border py-3.5 text-left transition-colors hover:bg-surface-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-muted">{ConnectorsIcon}</span>
                  <span className="text-sm font-medium">Connectors</span>
                </div>
                <span className="text-muted">{ChevronRightIcon}</span>
              </button>

              <button
                type="button"
                onClick={onOpenScheduled}
                className="flex w-full items-center justify-between gap-3 border-b border-border py-3.5 text-left transition-colors hover:bg-surface-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-muted">{AutomationsIcon}</span>
                  <span className="text-sm font-medium">Automations</span>
                </div>
                <span className="text-muted">{ChevronRightIcon}</span>
              </button>

              <button
                type="button"
                onClick={onOpenProjects}
                className="flex w-full items-center justify-between gap-3 border-b border-border py-3.5 text-left transition-colors hover:bg-surface-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-muted">{ProjectsIcon}</span>
                  <span className="text-sm font-medium">Projects</span>
                </div>
                <span className="text-muted">{ChevronRightIcon}</span>
              </button>

              <button
                type="button"
                onClick={onOpenLibrary}
                className="flex w-full items-center justify-between gap-3 border-b border-border py-3.5 text-left transition-colors hover:bg-surface-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-muted">{LibraryIcon}</span>
                  <span className="text-sm font-medium">Library</span>
                </div>
                <span className="text-muted">{ChevronRightIcon}</span>
              </button>

              <div className="border-b border-border py-3.5">
                <div className="flex items-center gap-3">
                  <span className="text-muted">{EmailIcon}</span>
                  <span className="text-sm font-medium">Email subscriptions</span>
                </div>
                <ComingSoonNote text="Email subscription preferences aren't available yet." />
              </div>

              <h3 className="mb-3 mt-6 text-sm font-semibold">Data controls</h3>

              <Row
                title="Save chat history"
                description="When off, new conversations won't be kept after you close the tab."
                control={<Toggle checked={historyEnabled} onChange={onToggleHistoryEnabled} />}
              />

              <Row
                title="Improve the model for everyone"
                description="Allow your content to help improve ChatGiZa for you and everyone who uses it. We take steps to protect your privacy."
                control={<Toggle checked={privacyPrefs.improveModel} onChange={() => updatePrivacy({ improveModel: !privacyPrefs.improveModel })} />}
              />
              <div className="border-b border-border pb-3.5">
                <button onClick={onOpenSupport} className="text-xs text-muted underline hover:text-foreground">
                  Go to Help Center
                </button>
              </div>

              <div className="border-b border-border py-3.5">
                <h4 className="mb-1 text-sm font-semibold">Voice</h4>
                <p className="mb-2 text-xs text-muted">
                  ChatGiZa doesn&apos;t have a live Voice Mode (real-time audio/video conversation) yet — these
                  controls will apply once it does.
                </p>
                <Row title="Include your audio recordings" border={false} control={<Toggle checked={false} disabled onChange={() => {}} />} />
                <Row title="Include your video recordings" border={false} control={<Toggle checked={false} disabled onChange={() => {}} />} />
              </div>

              <Row
                title="Location"
                description={`When enabled, your approximate location helps ChatGiZa give more relevant answers — like local weather or recommendations.${
                  location ? ` Currently: ${location}.` : ""
                }${locationError ? ` ${locationError}` : ""}`}
                control={
                  <button
                    onClick={location ? onClearLocation : onRequestLocation}
                    className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                  >
                    {location ? "Turn off" : "Turn on"}
                  </button>
                }
              />

              <Row
                title="Shared links"
                control={
                  <button
                    onClick={() => setDataView("shared")}
                    className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                  >
                    Manage
                  </button>
                }
              />

              <Row
                title="Archived chats"
                control={
                  <button
                    onClick={() => setDataView("archived")}
                    className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                  >
                    Manage
                  </button>
                }
              />

              <Row
                title="Archive all chats"
                control={
                  confirmArchiveAll ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmArchiveAll(false)}
                        className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          onArchiveAllConversations();
                          setConfirmArchiveAll(false);
                        }}
                        className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-85 transition-opacity"
                      >
                        Confirm
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmArchiveAll(true)}
                      className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                    >
                      Archive all
                    </button>
                  )
                }
              />

              <Row
                title="Delete all chats"
                control={
                  confirmClear ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmClear(false)}
                        className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          onClearHistory();
                          setConfirmClear(false);
                        }}
                        className="rounded-full border border-[#b3413e] px-4 py-1.5 text-sm font-medium text-[#b3413e] hover:bg-[#b3413e]/10 transition-colors"
                      >
                        Confirm
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmClear(true)}
                      className="rounded-full border border-[#b3413e] px-4 py-1.5 text-sm text-[#b3413e] hover:bg-[#b3413e]/10 transition-colors"
                    >
                      Delete all
                    </button>
                  )
                }
              />

              <Row
                title="Export data"
                border={false}
                control={
                  <button
                    onClick={onExportData}
                    className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                  >
                    Export
                  </button>
                }
              />

              <div className="my-2 border-t border-border" />
              <h3 className="mb-1 mt-3 text-sm font-semibold">Marketing privacy</h3>

              <Row
                title="Marketing measurement"
                description="These help us measure the effectiveness of our marketing."
                control={
                  <Toggle
                    checked={privacyPrefs.marketingMeasurement}
                    onChange={() => updatePrivacy({ marketingMeasurement: !privacyPrefs.marketingMeasurement })}
                  />
                }
              />
              <Row
                title="Personalized marketing"
                description="This helps us personalize and measure ChatGiZa's own marketing on third-party platforms."
                border={false}
                control={
                  <Toggle
                    checked={privacyPrefs.personalizedMarketing}
                    onChange={() => updatePrivacy({ personalizedMarketing: !privacyPrefs.personalizedMarketing })}
                  />
                }
              />
            </div>
          )}

          {tab === "Preference" && dataView === "shared" && (
            <div>
              <button
                onClick={() => setDataView("root")}
                className="mb-4 flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
              >
                {ChevronLeftIcon}
                Shared links
              </button>
              <p className="mb-3 text-xs text-muted">
                Conversations you&apos;ve shared. ChatGiZa shares by sending the transcript through your
                device&apos;s share sheet or copying it to your clipboard — no public link is hosted.
              </p>
              {sharedConversations.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted">
                  You haven&apos;t shared any chats yet.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {sharedConversations.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border p-2.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">{c.title}</span>
                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => onShareConversation(c.id)}
                          className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-2 transition-colors"
                        >
                          Copy again
                        </button>
                        <button
                          onClick={() => onUnshareConversation(c.id)}
                          className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-2 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "Preference" && dataView === "archived" && (
            <div>
              <button
                onClick={() => setDataView("root")}
                className="mb-4 flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
              >
                {ChevronLeftIcon}
                Archived chats
              </button>
              <p className="mb-3 text-xs text-muted">Chats you&apos;ve archived out of Recents.</p>
              {archivedConversations.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted">
                  No archived chats.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {archivedConversations.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border p-2.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">{c.title}</span>
                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => onUnarchiveConversation(c.id)}
                          className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-2 transition-colors"
                        >
                          Unarchive
                        </button>
                        <button
                          onClick={() => onDeleteConversation(c.id)}
                          aria-label="Delete"
                          className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground transition-colors"
                        >
                          {TrashIcon}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "Security" && (
            <div>
              <h3 className="mb-3 text-sm font-semibold">Security</h3>

              <div className="border-b border-border py-3.5">
                <p className="text-sm font-medium">Security keys &amp; passkeys</p>
                <p className="mt-0.5 text-xs text-muted">See all the active security keys and passkeys.</p>
                <ComingSoonNote />
              </div>

              <Row
                title="Authenticator app"
                description="Use one-time codes from an authenticator app."
                control={<Toggle checked={false} disabled onChange={() => {}} />}
              />
              <Row
                title="Text message"
                description="Get 6-digit verification codes by SMS or WhatsApp."
                control={<Toggle checked={false} disabled onChange={() => {}} />}
              />

              <h3 className="mb-1 mt-5 text-base font-semibold">Sessions</h3>
              <p className="mb-3 text-xs text-muted">
                Devices signed into your account. Log out any you don&apos;t recognize.
              </p>

              {sessionsLoading && <p className="py-4 text-center text-xs text-muted">Loading…</p>}
              {sessionsError && <p className="py-2 text-xs text-red-500">{sessionsError}</p>}
              {!sessionsLoading && sessions && sessions.length === 0 && (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted">
                  No recorded sessions yet — this only tracks sign-ins from now on.
                </p>
              )}
              {sessions && sessions.length > 0 && (
                <ul className="space-y-1.5">
                  {sessions.map((s) => (
                    <li key={s.id} className="rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {s.device} · {s.os}
                          </p>
                          <p className="text-xs text-muted">{formatDateTime(s.signedInAt)}</p>
                          {(s.location || s.ip) && (
                            <p className="text-xs text-muted">
                              {s.location ? s.location : null}
                              {s.location && s.ip ? " · " : null}
                              {s.ip ? s.ip : null}
                            </p>
                          )}
                          {s.id === currentSessionId && (
                            <span className="mt-1 inline-block rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                              Current session
                            </span>
                          )}
                        </div>
                        {s.id !== currentSessionId && (
                          <button
                            onClick={() => revokeSession(s.id)}
                            disabled={revokingId === s.id}
                            className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-2 transition-colors disabled:opacity-50"
                          >
                            {revokingId === s.id ? "Logging out…" : "Log out"}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-5 border-t border-border pt-4">
                <h4 className="mb-1 text-sm font-semibold">Log out of all sessions</h4>
                <p className="mb-2 text-xs text-muted">
                  Log out of all active sessions across all devices, including your current session.
                </p>
                {confirmLogoutAll ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmLogoutAll(false)}
                      className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={logoutAllSessions}
                      className="rounded-full border border-[#b3413e] px-4 py-1.5 text-sm font-medium text-[#b3413e] hover:bg-[#b3413e]/10 transition-colors"
                    >
                      Confirm
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmLogoutAll(true)}
                    className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                  >
                    Log out of all
                  </button>
                )}
              </div>
            </div>
          )}

          {tab === "Account" && (
            <div>
              <h2 className="mb-4 text-base font-semibold">Account</h2>

              {status === "loading" ? (
                <p className="mb-4 text-xs text-muted">Loading…</p>
              ) : session?.user ? (
                <div className="mb-5 flex items-center gap-3 rounded-xl border border-border p-3">
                  {session.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={session.user.image} alt="" className="h-10 w-10 rounded-full" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-sm">
                      {session.user.name?.[0] ?? "?"}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{session.user.name}</p>
                    <p className="truncate text-xs text-muted">{session.user.email}</p>
                  </div>
                  <button
                    onClick={() => chatgizaSignOut()}
                    className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-2 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => signIn("google", undefined, { prompt: "select_account" })}
                  className="mb-5 rounded-full border border-border px-4 py-2 text-xs hover:bg-surface-2 transition-colors"
                >
                  Sign in with Google
                </button>
              )}

              <label className="mb-1 block text-xs text-muted">Full name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={saveProfile}
                placeholder="Full name"
                className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
              />

              <label className="mb-1 block text-xs text-muted">Date of birth</label>
              <div className="mb-4">
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  onBlur={saveProfile}
                  max={getMaxBirthDate()}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                />
                {!birthDateCheck.ok && <p className="mt-1 text-xs text-red-500">{birthDateCheck.reason}</p>}
              </div>

              <label className="mb-1 block text-xs text-muted">Country</label>
              <div className="mb-4">
                <SettingsSelect
                  value={country}
                  onChange={(c) => {
                    setCountry(c);
                    if (birthDateCheck.ok) onProfileChange({ nickname, about, role, fullName, birthDate, country: c, link });
                  }}
                  options={[
                    { value: "", label: "Select…" },
                    ...COUNTRIES.map((c) => ({ value: c, label: c })),
                  ]}
                />
              </div>

              <label className="mb-1 block text-xs text-muted">What should GiZa call you?</label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onBlur={saveProfile}
                placeholder="Nickname"
                className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
              />

              <label className="mb-1 block text-xs text-muted">What best describes your work?</label>
              <div className="mb-4">
                <SettingsSelect
                  value={role}
                  onChange={(v) => {
                    setRole(v);
                    if (birthDateCheck.ok) onProfileChange({ nickname, about, role: v, fullName, birthDate, country, link });
                  }}
                  options={[
                    { value: "", label: "Select…" },
                    { value: "Student", label: "Student" },
                    { value: "Software / Engineering", label: "Software / Engineering" },
                    { value: "Business / Management", label: "Business / Management" },
                    { value: "Marketing / Sales", label: "Marketing / Sales" },
                    { value: "Design / Creative", label: "Design / Creative" },
                    { value: "Education", label: "Education" },
                    { value: "Healthcare", label: "Healthcare" },
                    { value: "Finance", label: "Finance" },
                    { value: "Other", label: "Other" },
                  ]}
                />
              </div>

              <label className="mb-1 block text-xs text-muted">Link (shown on your ChatGiZa Media profile)</label>
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onBlur={saveProfile}
                placeholder="yoursite.com"
                className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
              />

              <h3 className="mb-1 text-sm font-semibold">Instructions for GiZa</h3>
              <p className="mb-3 text-xs text-muted">GiZa will keep these in mind across every conversation.</p>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                onBlur={saveProfile}
                rows={4}
                placeholder="e.g. I run a bakery called Sunrise Bread and prefer short, direct answers."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
              />

              <div className="my-6 border-t border-border" />
              {/* Voice moved to the Preference tab -- see its "Voice" row. */}
              <h2 className="mb-1 text-base font-semibold">GiZa Builder Profile</h2>
              <p className="mb-2 text-xs text-muted">
                Personalize your builder profile to connect with users of your GiZas. These settings apply to
                publicly shared GiZas.
              </p>
              <ComingSoonNote text="ChatGiZa doesn't have a public GiZa builder/marketplace yet — coming soon." />

              <div className="my-6 border-t border-border" />
              <Row
                title="Receive feedback emails"
                description="Occasional emails asking how ChatGiZa is working for you."
                border={false}
                control={<Toggle checked={feedbackEmailsOptIn} onChange={onToggleFeedbackEmailsOptIn} />}
              />

              <div className="my-6 border-t border-border" />
              <h3 className="mb-1 text-sm font-semibold text-[#b3413e]">Delete account</h3>
              <p className="mb-2 text-xs text-muted">
                Permanently deletes your ChatGiZa account data. Chat history stored only in this browser is not
                affected until you also clear it.
              </p>
              {confirmDeleteAccount ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDeleteAccount(false)}
                    className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onDeleteAccount}
                    className="rounded-full border border-[#b3413e] px-4 py-1.5 text-sm font-medium text-[#b3413e] hover:bg-[#b3413e]/10 transition-colors"
                  >
                    Confirm delete
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteAccount(true)}
                  disabled={!session?.user}
                  className="rounded-full border border-[#b3413e] px-4 py-1.5 text-sm text-[#b3413e] hover:bg-[#b3413e]/10 transition-colors disabled:opacity-40"
                >
                  Delete account
                </button>
              )}
            </div>
          )}

          {tab === "Dashboard" && (
            <div>
              <h3 className="mb-1 border-b border-border pb-3 text-sm font-semibold">Your data dashboard</h3>
              <p className="mb-4 mt-3 text-xs text-muted">
                A transparent look at what ChatGiZa actually holds about you — computed from your own account, not sent anywhere else.
              </p>

              <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                <StatTile label="Conversations" value={String(activeConversations.length)} />
                <StatTile label="Messages you sent" value={String(userMessages.length)} />
                <StatTile label="Replies received" value={String(assistantMessages.length)} />
                <StatTile label="Words written" value={wordsWritten.toLocaleString()} />
                <StatTile label="Active days" value={String(activeDayCount)} />
                <StatTile label="Files & images shared" value={String(attachmentCount + mediaCount)} />
              </div>

              <div className="mb-5 space-y-1.5 rounded-lg border border-border p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">First message</span>
                  <span>{firstMessageAt ? new Date(firstMessageAt).toLocaleDateString() : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Most recent message</span>
                  <span>{lastMessageAt ? new Date(lastMessageAt).toLocaleDateString() : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Memory facts saved</span>
                  <span>{memory.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Digital Twin profile</span>
                  <span>{digitalTwin.trim() ? `Generated · ${new Date(digitalTwinUpdatedAt).toLocaleDateString()}` : "Not generated yet"}</span>
                </div>
              </div>

              <h4 className="mb-2 text-sm font-semibold">Manage your data</h4>
              <button
                onClick={onExportData}
                className="mb-2 flex w-full items-center justify-between gap-3 rounded-lg border border-border p-3 text-left text-sm transition-colors hover:bg-surface-2"
              >
                <span>Export everything as a file</span>
                <span className="text-muted">{ChevronRightIcon}</span>
              </button>
              <button
                onClick={() => setTab("Preference")}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-border p-3 text-left text-sm transition-colors hover:bg-surface-2"
              >
                <span>Data controls & delete account</span>
                <span className="text-muted">{ChevronRightIcon}</span>
              </button>
            </div>
          )}

          {tab === "Storage Management" && storageView === "root" && (
            <div>
              <h2 className="mb-4 text-base font-semibold">Storage Management</h2>
              <h3 className="mb-3 border-b border-border pb-3 text-sm font-semibold">Storage</h3>

              <p className="mb-2 text-sm font-medium">
                {formatBytes(storageBytesUsed)} of {formatBytes(storageCapBytes)} used
              </p>
              <div className="mb-6 h-3 w-full overflow-hidden rounded-full bg-surface-2">
                <div className="h-full min-w-[3px] rounded-full bg-foreground" style={{ width: `${storagePct}%` }} />
              </div>

              <h4 className="text-sm font-semibold">Manage storage</h4>
              <p className="mb-2 text-xs text-muted">Manage your library to free up storage.</p>

              <button
                onClick={() => setStorageView("files")}
                className="flex w-full items-center justify-between gap-3 border-t border-border py-3 text-left transition-colors hover:bg-surface-2"
              >
                <div>
                  <p className="text-sm font-medium">Files</p>
                  <p className="text-xs text-muted">
                    {formatBytes(fileBytes)} • {fileCount} file{fileCount === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="text-muted">{ChevronRightIcon}</span>
              </button>

              <button
                onClick={() => setStorageView("images")}
                className="flex w-full items-center justify-between gap-3 border-t border-border py-3 text-left transition-colors hover:bg-surface-2"
              >
                <div>
                  <p className="text-sm font-medium">Images</p>
                  <p className="text-xs text-muted">
                    {formatBytes(imageBytes)} • {imageCount} image{imageCount === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="text-muted">{ChevronRightIcon}</span>
              </button>

              <div className="mt-6 border-t border-border pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Memory</h3>
                    <p className="text-xs text-muted">Facts ChatGiZa remembers about you across chats.</p>
                  </div>
                  <Toggle checked={memoryEnabled} onChange={onToggleMemoryEnabled} />
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newFact.trim()) return;
                    onAddMemory(newFact.trim());
                    setNewFact("");
                  }}
                  className="mb-3 flex gap-2"
                >
                  <input
                    value={newFact}
                    onChange={(e) => setNewFact(e.target.value)}
                    placeholder="Add something to remember…"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                  />
                  <button
                    type="submit"
                    disabled={!newFact.trim()}
                    className="btn-primary rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-40"
                  >
                    Add
                  </button>
                </form>

                {memory.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted">Nothing saved yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {memory.map((fact, i) => (
                      <li
                        key={i}
                        className="flex items-start justify-between gap-2 rounded-lg border border-border p-2.5 text-sm"
                      >
                        <span className="flex-1">{fact}</span>
                        <button
                          onClick={() => onRemoveMemory(i)}
                          aria-label="Remove"
                          className="shrink-0 text-muted hover:text-foreground"
                        >
                          {TrashIcon}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-6 border-t border-border pt-5">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Digital Twin</h3>
                    <p className="text-xs text-muted">
                      A synthesized profile of your voice, interests, and values — used by &quot;Digital Twin&quot; mode to
                      answer as you.
                    </p>
                  </div>
                </div>
                <textarea
                  value={digitalTwin}
                  onChange={(e) => onChangeDigitalTwin(e.target.value)}
                  placeholder="Nothing generated yet — tap Regenerate to build one from your chat history, or write your own."
                  rows={5}
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-muted">
                    {digitalTwinUpdatedAt > 0
                      ? `Last updated ${new Date(digitalTwinUpdatedAt).toLocaleDateString()}`
                      : "Never generated"}
                  </span>
                  <button
                    onClick={onRegenerateDigitalTwin}
                    disabled={digitalTwinRegenerating}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-2 disabled:opacity-40"
                  >
                    {digitalTwinRegenerating ? "Generating…" : "Regenerate from my chats"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === "Storage Management" && storageView === "files" && (
            <div>
              <button
                onClick={() => setStorageView("root")}
                className="mb-4 flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
              >
                {ChevronLeftIcon}
                Files
              </button>
              {fileItems.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted">
                  No files uploaded yet — PDFs and text files you attach in chat will show up here.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {fileItems.map((item) => (
                    <li key={item.id} className="rounded-xl border border-border p-2.5">
                      <p className="truncate text-sm">{item.label}</p>
                      <p className="truncate text-xs text-muted">
                        {item.conversationTitle}
                        {item.bytes ? ` · ${formatBytes(item.bytes)}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "Storage Management" && storageView === "images" && (
            <div>
              <button
                onClick={() => setStorageView("root")}
                className="mb-4 flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
              >
                {ChevronLeftIcon}
                Images
              </button>
              {imageItems.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted">
                  No images or videos yet — uploads and anything ChatGiZa generates will show up here.
                </p>
              ) : (
                <ul className="grid grid-cols-3 gap-2">
                  {imageItems.map((item) => (
                    <li key={item.id} className="overflow-hidden rounded-lg border border-border">
                      {item.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.thumbnailUrl} alt={item.label} className="h-20 w-full object-cover" />
                      ) : (
                        <div className="flex h-20 w-full items-center justify-center bg-surface-2 text-xs text-muted">
                          Video
                        </div>
                      )}
                      <p className="truncate px-1.5 py-1 text-[11px] text-muted">{item.conversationTitle}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "Subaccount" && (
            <div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">Subaccount</h2>
                <span className="text-xs text-muted">{subaccounts.length}/5</span>
              </div>
              <p className="mb-4 text-xs text-muted">Extra accounts that live under yours.</p>

              <form onSubmit={createSubaccount} className="mb-5 flex gap-2">
                <input
                  value={newSubaccountName}
                  onChange={(e) => setNewSubaccountName(e.target.value)}
                  placeholder="Subaccount name"
                  maxLength={40}
                  disabled={subaccounts.length >= 5}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40 disabled:opacity-40"
                />
                <button
                  type="submit"
                  disabled={creatingSubaccount || !newSubaccountName.trim() || subaccounts.length >= 5}
                  className="btn-primary shrink-0 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {creatingSubaccount ? "Creating…" : "Create Subaccount"}
                </button>
              </form>

              {subaccountError && <p className="mb-3 text-xs text-red-500">{subaccountError}</p>}

              {subaccountsLoading ? (
                <p className="py-6 text-center text-xs text-muted">Loading…</p>
              ) : subaccounts.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted">No subaccounts yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted">
                        <th className="py-2 pr-3 font-medium">Nickname</th>
                        <th className="py-2 pr-3 font-medium">Created</th>
                        <th className="py-2 pr-3 font-medium">Operation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subaccounts.map((s) => (
                        <tr key={s.id} className="border-b border-border last:border-0">
                          <td className="py-3 pr-3">
                            {renamingSubaccountId === s.id ? (
                              <input
                                autoFocus
                                value={renameSubaccountValue}
                                onChange={(e) => setRenameSubaccountValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") renameSubaccount(s.id);
                                  if (e.key === "Escape") setRenamingSubaccountId(null);
                                }}
                                maxLength={40}
                                className="w-40 rounded-lg border border-border bg-background px-2 py-1 text-sm outline-none focus:border-foreground/40"
                              />
                            ) : (
                              <span className="flex items-center gap-2">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-xs">
                                  {s.name[0]?.toUpperCase() ?? "?"}
                                </span>
                                {s.name}
                              </span>
                            )}
                          </td>
                          <td className="py-3 pr-3 text-muted">{new Date(s.created_at).toLocaleDateString()}</td>
                          <td className="py-3 pr-3">
                            {renamingSubaccountId === s.id ? (
                              <span className="flex gap-3">
                                <button onClick={() => renameSubaccount(s.id)} className="text-xs font-medium text-foreground hover:underline">
                                  Save
                                </button>
                                <button onClick={() => setRenamingSubaccountId(null)} className="text-xs text-muted hover:text-foreground">
                                  Cancel
                                </button>
                              </span>
                            ) : confirmDeleteSubaccountId === s.id ? (
                              <span className="flex items-center gap-3">
                                <span className="text-xs text-muted">Delete?</span>
                                <button onClick={() => deleteSubaccount(s.id)} className="text-xs font-medium text-red-500 hover:underline">
                                  Confirm
                                </button>
                                <button onClick={() => setConfirmDeleteSubaccountId(null)} className="text-xs text-muted hover:text-foreground">
                                  Cancel
                                </button>
                              </span>
                            ) : (
                              <span className="flex gap-3">
                                <button
                                  onClick={() => {
                                    setRenamingSubaccountId(s.id);
                                    setRenameSubaccountValue(s.name);
                                  }}
                                  className="text-xs font-medium text-foreground hover:underline"
                                >
                                  Rename
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteSubaccountId(s.id)}
                                  className="text-xs font-medium text-red-500 hover:underline"
                                >
                                  Delete
                                </button>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
