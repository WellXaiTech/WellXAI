"use client";

import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import type { Theme } from "@/lib/theme";
import type { Contrast } from "@/lib/contrast";
import type { ChatFontSize } from "@/lib/fontSize";
import type { AssistantColor } from "@/lib/assistantColor";
import type { ChatFont } from "@/lib/chatFont";
import type { ReduceMotion } from "@/lib/reduceMotion";
import { COUNTRIES, COUNTRY_CODES } from "@/lib/countries";
import {
  getStoredVoiceURI,
  setStoredVoiceURI,
  getStoredVoiceSpeed,
  setStoredVoiceSpeed,
  getStoredVoiceLang,
  setStoredVoiceLang,
  type VoiceSpeed,
} from "@/lib/voice";

export type Profile = {
  nickname: string;
  about: string;
  role?: string;
  fullName?: string;
  birthDate?: string;
  country?: string;
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

type DeviceSession = { id: string; device: string; os: string; signedInAt: number };

type BillingSummary = {
  subscription: { tier: string | null; planName: string; currentPeriodEnd: number | null; cancelAtPeriodEnd: boolean } | null;
  invoices: { id: string; date: number; amount: number; currency: string; status: string; hostedUrl: string | null }[];
  paymentMethods: { id: string; brand: string; last4: string; isDefault: boolean }[];
  billingInfo: { email: string | null; name: string | null; address: { city: string | null; country: string | null; line1: string | null; state: string | null; postal_code: string | null } | null } | null;
};

const TABS_GROUP_1 = ["General", "Data controls", "Security"] as const;
const TABS_GROUP_2 = ["Account", "Memory", "Storage", "Billing"] as const;
export type Tab = (typeof TABS_GROUP_1)[number] | (typeof TABS_GROUP_2)[number];

const TAB_DESCRIPTIONS: Record<Tab, string> = {
  General: "Appearance, language, and behavior",
  "Data controls": "Manage your data and privacy",
  Security: "Password, sessions, and login",
  Account: "Profile and personal info",
  Memory: "What ChatGiZa remembers about you",
  Storage: "Files, images, and space used",
  Billing: "Plan, invoices, and payment methods",
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

const MemoryIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4l3 2" />
  </svg>
);

const StorageIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </svg>
);

const BillingIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
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

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  General: GearIcon,
  "Data controls": DataControlsIcon,
  Security: SecurityLockIcon,
  Account: AccountIcon,
  Memory: MemoryIcon,
  Storage: StorageIcon,
  Billing: BillingIcon,
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
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
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

function ComingSoonNote({ text }: { text?: string }) {
  return (
    <p className="mt-1 text-xs text-muted">
      {text ?? "This isn't built yet — coming soon."}
    </p>
  );
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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
  onDeleteAccount,
  onOpenUpgradePlan,
  profile,
  onProfileChange,
  memoryEnabled,
  onToggleMemoryEnabled,
  memory,
  onAddMemory,
  onRemoveMemory,
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
  onDeleteAccount: () => void;
  onOpenUpgradePlan?: () => void;
  profile: Profile;
  onProfileChange: (p: Profile) => void;
  memoryEnabled: boolean;
  onToggleMemoryEnabled: () => void;
  memory: string[];
  onAddMemory: (fact: string) => void;
  onRemoveMemory: (index: number) => void;
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
  const [newFact, setNewFact] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmArchiveAll, setConfirmArchiveAll] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [confirmCancelPlan, setConfirmCancelPlan] = useState(false);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const [dataView, setDataView] = useState<"root" | "shared" | "archived">("root");
  const [storageView, setStorageView] = useState<"root" | "files" | "images">("root");
  const [tabSearch, setTabSearch] = useState("");
  const tabQuery = tabSearch.trim().toLowerCase();
  const visibleTabsGroup1 = TABS_GROUP_1.filter((t) => t.toLowerCase().includes(tabQuery));
  const visibleTabsGroup2 = TABS_GROUP_2.filter((t) => t.toLowerCase().includes(tabQuery));
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [voiceSpeed, setVoiceSpeed] = useState<VoiceSpeed>("normal");
  const [voiceLang, setVoiceLang] = useState("");
  const sharedConversations = conversations.filter((c) => c.shared);
  const archivedConversations = conversations.filter((c) => c.archived);

  const [sessions, setSessions] = useState<DeviceSession[] | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [billingView, setBillingView] = useState<"root" | "edit">("root");
  const [editEmail, setEditEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editLine1, setEditLine1] = useState("");
  const [editLine2, setEditLine2] = useState("");
  const [editPostalCode, setEditPostalCode] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editAddTaxId, setEditAddTaxId] = useState(false);
  const [editTaxIdType, setEditTaxIdType] = useState("eu_vat");
  const [editTaxIdValue, setEditTaxIdValue] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function openEditBillingInfo() {
    setEditEmail(billing?.billingInfo?.email ?? session?.user?.email ?? "");
    setEditName(billing?.billingInfo?.name ?? session?.user?.name ?? "");
    const countryCode = billing?.billingInfo?.address?.country ?? "";
    setEditCountry(COUNTRIES.find((c) => COUNTRY_CODES[c] === countryCode) ?? "");
    setEditLine1(billing?.billingInfo?.address?.line1 ?? "");
    setEditLine2("");
    setEditPostalCode(billing?.billingInfo?.address?.postal_code ?? "");
    setEditCity(billing?.billingInfo?.address?.city ?? "");
    setEditAddTaxId(false);
    setEditTaxIdValue("");
    setEditError(null);
    setBillingView("edit");
  }

  async function saveBillingInfo(e: React.FormEvent) {
    e.preventDefault();
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch("/api/billing/update-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: editEmail,
          name: editName,
          country: COUNTRY_CODES[editCountry] ?? "",
          addressLine1: editLine1,
          addressLine2: editLine2,
          postalCode: editPostalCode,
          city: editCity,
          taxIdType: editAddTaxId ? editTaxIdType : undefined,
          taxIdValue: editAddTaxId ? editTaxIdValue : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't save billing information");
      if (data.taxIdError) {
        setEditError(`Billing address saved, but the tax ID couldn't be added: ${data.taxIdError}`);
      } else {
        setBilling(null);
        setBillingView("root");
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Couldn't save billing information");
    } finally {
      setEditSaving(false);
    }
  }

  useEffect(() => {
    setVoiceURI(getStoredVoiceURI());
    setVoiceSpeed(getStoredVoiceSpeed());
    setVoiceLang(getStoredVoiceLang());
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

  useEffect(() => {
    if (tab !== "Billing" || !session?.user || billing !== null) return;
    setBillingLoading(true);
    setBillingError(null);
    fetch("/api/billing/summary")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: BillingSummary) => setBilling(data))
      .catch(() => setBillingError("Couldn't load your billing details."))
      .finally(() => setBillingLoading(false));
  }, [tab, session?.user, billing]);

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
    signOut({ callbackUrl: "/" });
  }

  async function openBillingPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setBillingError("Couldn't open the billing portal.");
    } finally {
      setPortalLoading(false);
    }
  }

  async function cancelPlan() {
    setCancelLoading(true);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      if (res.ok) {
        setBilling((prev) => (prev?.subscription ? { ...prev, subscription: { ...prev.subscription, cancelAtPeriodEnd: true } } : prev));
      }
    } finally {
      setCancelLoading(false);
      setConfirmCancelPlan(false);
    }
  }

  const voiceLanguages = Array.from(new Set(voices.map((v) => v.lang))).sort();
  const filteredVoices = voiceLang ? voices.filter((v) => v.lang === voiceLang) : voices;

  function saveProfile() {
    onProfileChange({ nickname, about, role, fullName, birthDate, country });
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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-0 sm:p-10" onClick={onClose}>
      <div
        className="card flex h-full max-h-full w-full max-w-3xl overflow-hidden rounded-none sm:h-auto sm:rounded-2xl"
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
              onClick={onOpenUpgradePlan ?? (() => selectTab("Account"))}
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
                <p className="truncate text-sm text-muted">Upgrade your plan</p>
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
              onClick={() => signOut({ callbackUrl: "/chatgiza" })}
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

          {tab === "General" && (
            <div>
              <h2 className="mb-4 text-base font-semibold">General</h2>

              <div className="flex items-center justify-between gap-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold">Appearance</h3>
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

              <div className="flex items-center justify-between gap-4 border-b border-border py-3">
                <div>
                  <h3 className="text-sm font-semibold">Contrast</h3>
                  <p className="text-xs text-muted">How strongly borders and secondary text stand out.</p>
                </div>
                <div className="w-40 shrink-0">
                  <SettingsSelect
                    value={contrast}
                    onChange={onContrastChange}
                    options={[
                      { value: "system" as Contrast, label: "System" },
                      { value: "medium" as Contrast, label: "Medium" },
                      { value: "increased" as Contrast, label: "Increased" },
                    ]}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-border py-3">
                <div>
                  <h3 className="text-sm font-semibold">Text size</h3>
                  <p className="text-xs text-muted">Adjust how big chat messages appear.</p>
                </div>
                <div className="w-40 shrink-0">
                  <SettingsSelect
                    value={fontSize}
                    onChange={onFontSizeChange}
                    options={[
                      { value: "small" as ChatFontSize, label: "Small" },
                      { value: "medium" as ChatFontSize, label: "Default" },
                      { value: "large" as ChatFontSize, label: "Large" },
                      { value: "xlarge" as ChatFontSize, label: "Extra large" },
                    ]}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-border py-3">
                <div>
                  <h3 className="text-sm font-semibold">Reply text color</h3>
                  <p className="text-xs text-muted">&quot;Warm&quot; only changes anything in Dark mode.</p>
                </div>
                <div className="w-40 shrink-0">
                  <SettingsSelect
                    value={assistantColor}
                    onChange={onAssistantColorChange}
                    options={[
                      { value: "default" as AssistantColor, label: "Default" },
                      { value: "warm" as AssistantColor, label: "Warm" },
                    ]}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-border py-3">
                <h3 className="text-sm font-semibold">Chat font</h3>
                <div className="w-40 shrink-0">
                  <SettingsSelect
                    value={chatFont}
                    onChange={onChatFontChange}
                    options={[
                      { value: "default" as ChatFont, label: "Default" },
                      { value: "serif" as ChatFont, label: "Serif" },
                      { value: "mono" as ChatFont, label: "Monospace" },
                    ]}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold">Motion</h3>
                  <p className="text-xs text-muted">
                    Reduce animation in streaming responses and other interface elements.
                  </p>
                </div>
                <SegmentedControl
                  value={reduceMotion}
                  onChange={onReduceMotionChange}
                  options={[
                    { value: "system" as ReduceMotion, label: "System" },
                    { value: "reduced" as ReduceMotion, label: "Reduced" },
                  ]}
                />
              </div>

              <div className="my-6 border-t border-border" />
              <h2 className="mb-1 text-base font-semibold">All Notifications</h2>
              <p className="mb-3 text-xs text-muted">
                ChatGiZa will notify you of critical security alerts that need your attention, regardless of this
                setting.
              </p>
              <div className="flex items-center justify-between gap-4 border-b border-border py-3">
                <p className="text-sm font-medium">Allow notifications</p>
                <Toggle checked={allNotificationsEnabled} onChange={onToggleAllNotifications} />
              </div>

              {allNotificationsEnabled && (
                <>
                  <h3 className="mb-1 mt-4 text-sm font-semibold">In-app notifications</h3>
                  <div className="flex items-center justify-between gap-4 border-b border-border py-3">
                    <div>
                      <p className="text-sm font-medium">Activity &amp; Tasks</p>
                      <p className="text-xs text-muted">Get notified when ChatGiZa finishes a response.</p>
                    </div>
                    <Toggle
                      checked={notifyOnComplete}
                      onChange={() => {
                        if (
                          !notifyOnComplete &&
                          typeof Notification !== "undefined" &&
                          Notification.permission === "default"
                        ) {
                          Notification.requestPermission();
                        }
                        onToggleNotifyOnComplete();
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <p className="text-sm font-medium">Image generation</p>
                    <Toggle
                      checked={notifyImageGen}
                      onChange={() => {
                        if (
                          !notifyImageGen &&
                          typeof Notification !== "undefined" &&
                          Notification.permission === "default"
                        ) {
                          Notification.requestPermission();
                        }
                        onToggleNotifyImageGen();
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "Memory" && (
            <div>
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
          )}

          {tab === "Data controls" && dataView === "root" && (
            <div>
              <h3 className="mb-3 text-sm font-semibold">Data controls</h3>

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

          {tab === "Data controls" && dataView === "shared" && (
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

          {tab === "Data controls" && dataView === "archived" && (
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
                    onClick={() => signOut()}
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
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                onBlur={saveProfile}
                max={new Date().toISOString().slice(0, 10)}
                className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
              />

              <label className="mb-1 block text-xs text-muted">Country</label>
              <div className="mb-4">
                <SettingsSelect
                  value={country}
                  onChange={(c) => {
                    setCountry(c);
                    onProfileChange({ nickname, about, role, fullName, birthDate, country: c });
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
                    onProfileChange({ nickname, about, role: v, fullName, birthDate, country });
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
              <h2 className="mb-4 text-base font-semibold">Voice</h2>

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

              <div className="my-6 border-t border-border" />
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

          {tab === "Storage" && storageView === "root" && (
            <div>
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
            </div>
          )}

          {tab === "Storage" && storageView === "files" && (
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

          {tab === "Storage" && storageView === "images" && (
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

          {tab === "Billing" && billingView === "root" && (
            <div>
              <h3 className="mb-3 border-b border-border pb-3 text-lg font-semibold">Billing</h3>

              {!session?.user ? (
                <p className="text-xs text-muted">Sign in to view billing.</p>
              ) : billingLoading ? (
                <p className="py-4 text-center text-xs text-muted">Loading…</p>
              ) : billingError ? (
                <p className="text-xs text-red-500">{billingError}</p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-4 border-b border-border py-3.5">
                    <div>
                      <h2 className="text-base font-semibold">
                        ChatGiZa {billing?.subscription ? billing.subscription.planName : "Plan"}
                      </h2>
                      <p className="mt-1 text-xs text-muted">
                        {billing?.subscription?.cancelAtPeriodEnd ? "Your plan ends on " : "Your plan auto-renews on "}
                        {formatDate(billing?.subscription?.currentPeriodEnd ?? Date.now())}
                      </p>
                    </div>
                    {onOpenUpgradePlan && (
                      <button
                        onClick={onOpenUpgradePlan}
                        className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                      >
                        Compare plans
                      </button>
                    )}
                  </div>

                  <h4 className="mb-2 mt-4 text-sm font-semibold">Billing history</h4>
                  {!billing || billing.invoices.length === 0 ? (
                    <p className="mb-4 rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted">
                      No invoices yet.
                    </p>
                  ) : (
                    <ul className="mb-4 space-y-1.5">
                      {billing.invoices.map((inv) => (
                        <li key={inv.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-2.5 text-sm">
                          <span className="text-muted">{formatDate(inv.date)}</span>
                          <span>
                            {inv.currency.toUpperCase()} {(inv.amount / 100).toFixed(2)}
                          </span>
                          <span className="capitalize text-muted">{inv.status}</span>
                          {inv.hostedUrl ? (
                            <a href={inv.hostedUrl} target="_blank" rel="noreferrer" className="underline hover:text-foreground">
                              View
                            </a>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h4 className="text-sm font-semibold">Billing information</h4>
                    <button
                      onClick={openEditBillingInfo}
                      className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-2 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="border-b border-border py-3 text-sm">
                    <p className="text-xs text-muted">Billing email</p>
                    <p className="mb-2">{billing?.billingInfo?.email ?? session.user.email}</p>
                    {billing?.billingInfo?.name && (
                      <>
                        <p className="text-xs text-muted">Name</p>
                        <p className="mb-2">{billing.billingInfo.name}</p>
                      </>
                    )}
                    {billing?.billingInfo?.address?.line1 && (
                      <>
                        <p className="text-xs text-muted">Address</p>
                        <p>
                          {billing.billingInfo.address.line1}, {billing.billingInfo.address.city}
                          {billing.billingInfo.address.postal_code ? `, ${billing.billingInfo.address.postal_code}` : ""}
                        </p>
                        <p>{billing.billingInfo.address.country}</p>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-b border-border py-3">
                    <h4 className="text-sm font-semibold">Payment methods</h4>
                    <button
                      onClick={openBillingPortal}
                      disabled={portalLoading}
                      className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-2 transition-colors disabled:opacity-50"
                    >
                      Add new
                    </button>
                  </div>
                  {!billing || billing.paymentMethods.length === 0 ? (
                    <p className="border-b border-border py-3 text-xs text-muted">No cards on file.</p>
                  ) : (
                    <ul className="space-y-1.5 border-b border-border py-3">
                      {billing.paymentMethods.map((pm) => (
                        <li key={pm.id} className="flex items-center justify-between rounded-xl border border-border p-2.5 text-sm">
                          <span className="capitalize">
                            {pm.brand} •••• {pm.last4}
                          </span>
                          {pm.isDefault && <span className="text-xs text-muted">Default</span>}
                        </li>
                      ))}
                    </ul>
                  )}

                  {billing?.subscription && !billing.subscription.cancelAtPeriodEnd && (
                    <div className="pt-4">
                      <h4 className="mb-1 text-sm font-semibold">Cancel plan</h4>
                      <p className="mb-2 text-xs text-muted">
                        If you cancel, you&apos;ll keep full access to your plan features until the end of your
                        billing period.
                      </p>
                      {confirmCancelPlan ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmCancelPlan(false)}
                            className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                          >
                            Keep plan
                          </button>
                          <button
                            onClick={cancelPlan}
                            disabled={cancelLoading}
                            className="rounded-full border border-[#b3413e] px-4 py-1.5 text-sm font-medium text-[#b3413e] hover:bg-[#b3413e]/10 transition-colors disabled:opacity-50"
                          >
                            {cancelLoading ? "Cancelling…" : "Confirm cancel"}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmCancelPlan(true)}
                          className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                        >
                          Cancel plan
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === "Billing" && billingView === "edit" && (
            <div>
              <button
                onClick={() => setBillingView("root")}
                className="mb-4 flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
              >
                {ChevronLeftIcon}
                Billing information
              </button>

              <form onSubmit={saveBillingInfo}>
                <label className="mb-1 block text-xs text-muted">Billing email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                />

                <label className="mb-1 block text-xs text-muted">Full name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                />

                <label className="mb-1 block text-xs text-muted">Country or region</label>
                <div className="mb-4">
                  <SettingsSelect
                    value={editCountry}
                    onChange={setEditCountry}
                    options={[{ value: "", label: "Select…" }, ...COUNTRIES.map((c) => ({ value: c, label: c }))]}
                  />
                </div>

                <label className="mb-1 block text-xs text-muted">Address line 1</label>
                <input
                  value={editLine1}
                  onChange={(e) => setEditLine1(e.target.value)}
                  className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                />

                <label className="mb-1 block text-xs text-muted">Address line 2</label>
                <input
                  value={editLine2}
                  onChange={(e) => setEditLine2(e.target.value)}
                  className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                />

                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted">Postal code</label>
                    <input
                      value={editPostalCode}
                      onChange={(e) => setEditPostalCode(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted">City</label>
                    <input
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                    />
                  </div>
                </div>

                <label className="mb-4 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editAddTaxId}
                    onChange={(e) => setEditAddTaxId(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  Add tax ID
                </label>

                {editAddTaxId && (
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-muted">Tax ID type</label>
                      <SettingsSelect
                        value={editTaxIdType}
                        onChange={setEditTaxIdType}
                        options={[
                          { value: "eu_vat", label: "EU VAT" },
                          { value: "gb_vat", label: "UK VAT" },
                          { value: "us_ein", label: "US EIN" },
                          { value: "in_gst", label: "India GST" },
                          { value: "za_vat", label: "South Africa VAT" },
                          { value: "ae_trn", label: "UAE TRN" },
                          { value: "au_abn", label: "Australia ABN" },
                          { value: "ca_bn", label: "Canada BN" },
                        ]}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted">Tax ID value</label>
                      <input
                        value={editTaxIdValue}
                        onChange={(e) => setEditTaxIdValue(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                      />
                    </div>
                  </div>
                )}

                {editError && <p className="mb-3 text-xs text-red-500">{editError}</p>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBillingView("root")}
                    className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="btn-primary rounded-full px-4 py-1.5 text-sm font-medium disabled:opacity-50"
                  >
                    {editSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
