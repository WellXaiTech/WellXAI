"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import ChatSidebar from "@/components/ChatSidebar";
import ChatMessageBubble from "@/components/ChatMessageBubble";
import ChatComposer, { type ComposerTool } from "@/components/ChatComposer";
import GeneratingMediaPlaceholder from "@/components/GeneratingMediaPlaceholder";
import MediaLibrary from "@/components/MediaLibrary";
import ChatGizaMediaFeed from "@/components/ChatGizaMediaFeed";
import LiveVisionPanel from "@/components/LiveVisionPanel";
import ProjectsPanel, { type Project } from "@/components/ProjectsPanel";
import ScheduledPanel, { type ScheduledTask } from "@/components/ScheduledPanel";
import PluginsPanel, { type PluginKey } from "@/components/PluginsPanel";
import CodePanel from "@/components/CodePanel";
import SettingsPanel, { type Profile, type PrivacyPrefs, type Tab as SettingsTab } from "@/components/SettingsPanel";
import CompanyDashboard, { type CompanyProfile, type CompanyRequest } from "@/components/CompanyDashboard";
import ComingSoonModal from "@/components/ComingSoonModal";
import SignInPromptModal from "@/components/SignInPromptModal";
import OnboardingModal from "@/components/OnboardingModal";
import SearchChatsOverlay from "@/components/SearchChatsOverlay";
import LanguagePanel from "@/components/LanguagePanel";
import UpgradePlanPanel from "@/components/UpgradePlanPanel";
import SupportModal from "@/components/SupportModal";
import CelebrationToast from "@/components/CelebrationToast";
import UpgradeNudgeBanner, { shouldShowUpgradeNudge, snoozeUpgradeNudge } from "@/components/UpgradeNudgeBanner";
import type { PlanTier } from "@/lib/plans";
import { recordVisitAndGetStreak, checkStreakMilestone, bumpCounterAndCheckMilestone } from "@/lib/engagement";
import { speakText } from "@/lib/speak";
import { readAttachment, buildApiContent, type Attachment } from "@/lib/attachments";
import { getStoredTheme, setTheme as persistTheme, applyTheme, type Theme } from "@/lib/theme";
import { getStoredContrast, setContrast as persistContrast, applyContrast, type Contrast } from "@/lib/contrast";
import { getStoredFontSize, setFontSize as persistFontSize, applyFontSize, type ChatFontSize } from "@/lib/fontSize";
import {
  getStoredAssistantColor,
  setAssistantColor as persistAssistantColor,
  applyAssistantColor,
  type AssistantColor,
} from "@/lib/assistantColor";
import { getStoredChatFont, setChatFont as persistChatFont, applyChatFont, type ChatFont } from "@/lib/chatFont";
import {
  getStoredReduceMotion,
  setReduceMotion as persistReduceMotion,
  applyReduceMotion,
  type ReduceMotion,
} from "@/lib/reduceMotion";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  imageUrl?: string;
  videoUrl?: string;
  videoStatus?: "queued" | "in_progress" | "completed" | "failed";
  videoProgress?: number;
  createdAt?: number;
};

type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  projectId?: string;
  pinned?: boolean;
  archived?: boolean;
  shared?: boolean;
};

type SendOverride = { conversationId: string; baseMessages: Message[] };

// Conversations are scoped per signed-in account (or a shared "guest" bucket
// when signed out) — a single global key let one Google account's chat
// history bleed into whichever account next signed in on the same device.
const GUEST_SCOPE = "guest";
function storageKeyFor(scope: string) {
  return `chatgiza:conversations:${scope}`;
}
function deletedIdsKeyFor(scope: string) {
  return `chatgiza:deleted-ids:${scope}`;
}
const PROJECTS_KEY = "chatgiza:projects";
const SCHEDULED_KEY = "chatgiza:scheduled";
const PLUGINS_KEY = "chatgiza:plugins";
const PROFILE_KEY = "chatgiza:profile";
const MEMORY_KEY = "chatgiza:memory";
const MEMORY_ENABLED_KEY = "chatgiza:memory-enabled";
const HISTORY_ENABLED_KEY = "chatgiza:history-enabled";
const NOTIFY_ON_COMPLETE_KEY = "chatgiza:notify-on-complete";
const NOTIFY_IMAGE_GEN_KEY = "chatgiza:notify-image-gen";
const ALL_NOTIFICATIONS_KEY = "chatgiza:all-notifications";
const PRIVACY_PREFS_KEY = "chatgiza:privacy-prefs";
const FEEDBACK_EMAILS_KEY = "chatgiza:feedback-emails-opt-in";
const GUEST_MESSAGE_COUNT_KEY = "chatgiza:guest-message-count";
const GUEST_FREE_MESSAGES = 1;
const ONBOARDING_DISMISSED_KEY = "chatgiza:onboarding-dismissed";
const LANGUAGE_KEY = "chatgiza:language";
const LOCATION_KEY = "chatgiza:location";
const COMPANY_KEY = "chatgiza:company";
const USER_PLAN_KEY = "chatgiza:user-plan";
const COMPANY_REQUESTS_KEY = "chatgiza:company-requests";
const GREETED_SESSION_KEY = "chatgiza:greeted-this-session";
const GREETING_TEXT = "Karibu sana! Nimefurahi kuwa na wewe leo. Naweza kukusaidia vipi?";

const DEFAULT_PLUGINS: Record<PluginKey, boolean> = {
  web_search: true,
  deep_research: true,
  deep_think: true,
  image: true,
  video: true,
  document_writer: true,
  sql_helper: true,
  python_helper: true,
  business_assistant: true,
  ai_agent: true,
  digital_twin: true,
};

const DEFAULT_PROFILE: Profile = { nickname: "", about: "" };
const DEFAULT_COMPANY: CompanyProfile = { name: "", description: "", employees: [] };

const DEFAULT_PRIVACY_PREFS: PrivacyPrefs = {
  improveModel: false,
  includeAudioRecordings: false,
  includeVideoRecordings: false,
  marketingMeasurement: true,
  personalizedMarketing: true,
};

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// Same "new chat" bubble glyph the Android app shows on its own blank
// empty-state screen -- placed above "Ready when you are." here so the two
// match, instead of the web's empty state having no icon of its own.
const NewChatBubbleIcon = (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12,2.5996C14.5298,2.5996 16.8462,3.5022 18.6016,4.9941C18.7512,5.1214 18.8968,5.253 19.0381,5.3887C19.3966,5.7328 19.4084,6.3025 19.0645,6.6611C18.7203,7.0197 18.1506,7.0315 17.792,6.6875C17.6769,6.577 17.5577,6.47 17.4355,6.3662C16.002,5.1478 14.098,4.4004 12,4.4004C9.723,4.4004 7.6744,5.2802 6.208,6.6875C5.8494,7.0316 5.2797,7.0197 4.9355,6.6611C4.5916,6.3025 4.6034,5.7328 4.9619,5.3887C6.7606,3.6626 9.2544,2.5996 12,2.5996Z" />
    <path d="M2.5879,9.0762C2.7498,8.6064 3.2626,8.3569 3.7324,8.5186C4.2021,8.6804 4.4516,9.1923 4.29,9.6621C4.0368,10.3977 3.9004,11.1835 3.9004,12C3.9005,13.6673 4.5659,14.7653 5.4277,16.4717C5.5419,16.6979 5.5743,16.9573 5.5195,17.2051L5.1641,18.8057L6.9102,18.3535C7.1308,18.2963 7.3621,18.3101 7.5723,18.3887L7.6611,18.4258L8.3164,18.7266C8.9635,19.0092 9.5884,19.2359 10.2266,19.3877C10.71,19.5027 11.0093,19.9882 10.8945,20.4717C10.7795,20.9552 10.2941,21.2536 9.8105,21.1387C8.8683,20.9146 7.9867,20.5607 7.1221,20.1582L4.5088,20.8359C3.7136,21.0418 2.9815,20.3351 3.1592,19.5332L3.707,17.0615C2.9444,15.5739 2.0997,14.0876 2.0996,12C2.0997,10.9806 2.271,9.9969 2.5879,9.0762Z" />
    <path d="M20.2676,8.5186C20.7374,8.3568 21.2492,8.6065 21.4111,9.0762C21.7281,9.9969 21.8994,10.9805 21.8994,12C21.8992,16.5173 18.5604,20.2397 14.1729,21.1729C13.6868,21.2761 13.209,20.9655 13.1055,20.4795C13.0023,19.9936 13.3121,19.5157 13.7979,19.4121C17.4405,18.6375 20.0994,15.5824 20.0996,12C20.0996,11.1836 19.9632,10.3977 19.71,9.6621C19.5484,9.1923 19.7978,8.6804 20.2676,8.5186Z" />
  </svg>
);

// Shown in the top bar once a real conversation is open, replacing the
// Chat/Work tabs and New Chat button -- matches the reference: a "Share"
// button and a "..." more-options menu, top-right.
const TopBarShareIcon = (
  <svg width="17" height="17" viewBox="0 0 16 16" fill="currentColor">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.9.164a.499.499 0 0 0-.87.336v2.52a7.5 7.5 0 0 0-7 7.48a.5.5 0 0 0 .947.224a4.92 4.92 0 0 1 4.41-2.72h1.65v2.5a.5.5 0 0 0 .835.372l5-4.5a.5.5 0 0 0 .036-.708l-5-5.5zm.13 3.34v-1.71l3.79 4.17l-3.79 3.41v-1.88a.5.5 0 0 0-.5-.5H8.38c-1.54 0-3 .6-4.08 1.63a6.505 6.505 0 0 1 6.23-4.63a.5.5 0 0 0 .5-.5z"
    />
    <path d="M5.5 2a.5.5 0 1 1 .001 1c-.678.003-1.21.014-1.65.05c-.605.05-.953.142-1.22.276a3.02 3.02 0 0 0-1.31 1.31c-.134.263-.226.61-.276 1.22c-.05.617-.051 1.41-.051 2.55v1.2c0 1.14 0 1.93.051 2.55c.05.605.142.953.276 1.22a3.02 3.02 0 0 0 1.31 1.31c.263.134.611.226 1.22.276c.617.05 1.41.051 2.55.051h1.2c1.14 0 1.93 0 2.55-.051c.605-.05.953-.142 1.22-.276a3 3 0 0 0 1.31-1.31c.134-.263.226-.611.276-1.22q.023-.295.035-.653a.507.507 0 0 1 .504-.493c.279 0 .505.228.496.507c-.033 1.05-.13 1.74-.42 2.31a4.03 4.03 0 0 1-1.75 1.75c-.856.436-1.98.436-4.22.436h-1.2c-2.24 0-3.36 0-4.22-.436a4.03 4.03 0 0 1-1.75-1.75c-.436-.856-.436-1.98-.436-4.22v-1.2c0-2.24 0-3.36.436-4.22a4.03 4.03 0 0 1 1.75-1.75c.732-.373 1.66-.427 3.32-.435z" />
  </svg>
);

const TopBarMoreDotsIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="19" cy="12" r="1.6" />
  </svg>
);

const QUICK_ACTIONS = [
  {
    label: "Write or edit",
    prefill: "Help me write ",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
  },
  {
    label: "Look something up",
    prefill: "What's the latest on ",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" />
      </svg>
    ),
  },
  {
    label: "Brainstorm ideas",
    prefill: "Give me ideas for ",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M12 2a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.5h6c0-1.1.4-1.9 1-2.5A6 6 0 0 0 12 2Z" />
      </svg>
    ),
  },
];

function truncateTitle(text: string) {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > 40 ? `${clean.slice(0, 40)}…` : clean;
}

const IMAGE_INTENT_RE =
  /\blogos?\b|\bpicha\b|\b(draw|design|sketch|generate|create|make|chora|tengeneza|tengenezea|unda|niundie|nitengenezee|fanyia)\b.{0,25}\b(image|picture|photo|icon|illustration|artwork|logo|picha)\b/i;

const VIDEO_INTENT_RE =
  /\bvideos?\b.{0,25}\b(of|about|showing|for|ya|kuhusu)\b|\b(generate|create|make|tengeneza|tengenezea|unda|niundie|nitengenezee|fanyia|toa)\b.{0,20}\bvideos?\b/i;

// Strips the trigger verbs/nouns and generic filler (articles, pronouns, "can you", "unaweza", etc.)
// from a message so we can tell a real content description ("...of a cat playing on a beach")
// apart from a bare capability question or vague command ("can you create a video?", "tengeneza video").
// A vague message should fall through to a normal chat reply (which asks what to create) instead of
// silently generating media from a prompt with no actual content in it.
const FILLER_WORDS_RE =
  /\b(can|could|would|will|please|kindly|do|does|is|are|it|possible|unaweza|tafadhali|inawezekana|you|me|my|for|of|a|an|the|to|ya|some|got|have|has)\b/gi;
const TRIGGER_WORDS_RE =
  /\b(draw|design|sketch|generate|create|make|chora|tengeneza|tengenezea|unda|niundie|nitengenezee|fanyia|toa|image|picture|photo|icon|illustration|artwork|logo|picha|videos?)\b/gi;

function hasDescriptiveContent(text: string) {
  const remaining = text
    .replace(TRIGGER_WORDS_RE, " ")
    .replace(FILLER_WORDS_RE, " ")
    .replace(/[?!.,]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return remaining.length >= 1;
}

function looksLikeImageRequest(text: string) {
  return IMAGE_INTENT_RE.test(text) && hasDescriptiveContent(text);
}

function looksLikeVideoRequest(text: string) {
  return VIDEO_INTENT_RE.test(text) && hasDescriptiveContent(text);
}

function parseRequestedSeconds(text: string): number | null {
  const minuteMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|dakika)/i);
  if (minuteMatch) return Math.round(parseFloat(minuteMatch[1]) * 60);
  const secondMatch = text.match(/(\d+)\s*(?:seconds?|sekunde)/i);
  if (secondMatch) return parseInt(secondMatch[1], 10);
  return null;
}

function pickChunkSeconds(remaining: number): "4" | "8" | "12" {
  if (remaining >= 12) return "12";
  if (remaining >= 8) return "8";
  return "4";
}

function loadStoredConversations(scope: string): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKeyFor(scope));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Deletion tombstones: a conversation id disappearing from one side of a
// merge used to be read as "this device just hasn't seen it yet" and get
// silently re-added — which meant a conversation deleted on one device kept
// coming back after the next sync. Recording *when* an id was deleted (and
// carrying that record along on every merge/sync) lets a real deletion win
// instead of being treated as data loss to protect against.
type DeletedIds = Record<string, number>;

function loadDeletedIds(scope: string): DeletedIds {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(deletedIdsKeyFor(scope));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Tombstones older than this are pruned so the deleted-ids record doesn't
// grow forever — by then every device has long since caught up on the
// deletion, so there's nothing left it could still be protecting against.
const TOMBSTONE_TTL_MS = 180 * 24 * 60 * 60 * 1000;

function pruneDeletedIds(ids: DeletedIds): DeletedIds {
  const cutoff = Date.now() - TOMBSTONE_TTL_MS;
  const next: DeletedIds = {};
  for (const [id, ts] of Object.entries(ids)) {
    if (ts >= cutoff) next[id] = ts;
  }
  return next;
}

function mergeDeletedIds(a: DeletedIds, b: DeletedIds): DeletedIds {
  const merged: DeletedIds = { ...a };
  for (const [id, ts] of Object.entries(b)) {
    if (!merged[id] || ts > merged[id]) merged[id] = ts;
  }
  return merged;
}

function lastActivity(c: Conversation): number {
  let max = 0;
  for (const m of c.messages) {
    if (m.createdAt && m.createdAt > max) max = m.createdAt;
  }
  return max;
}

// Never let this tab's in-memory state silently drop a conversation that
// only exists because another tab (or another device) wrote it after this
// tab last read it — unless it's tombstoned, in which case the deletion wins
// regardless of which side "remembers" the conversation.
function mergeConversations(a: Conversation[], b: Conversation[], deletedIds: DeletedIds): Conversation[] {
  const byId = new Map<string, Conversation>();
  for (const c of [...a, ...b]) {
    if (deletedIds[c.id]) continue;
    const existing = byId.get(c.id);
    if (!existing) {
      byId.set(c.id, c);
      continue;
    }
    const cActivity = lastActivity(c);
    const existingActivity = lastActivity(existing);
    if (cActivity > existingActivity || (cActivity === existingActivity && c.messages.length > existing.messages.length)) {
      byId.set(c.id, c);
    }
  }
  return Array.from(byId.values());
}

function ChatGizaInner() {
  const searchParams = useSearchParams();
  const { data: authSession, status: authStatus } = useSession();
  const signedIn = authStatus === "authenticated";
  // `null` while NextAuth is still resolving the session — deliberately not
  // "guest" during that window, so a signed-in user's history never gets
  // read from (or briefly written to) the guest bucket before we actually
  // know they're signed in.
  const scope = authStatus === "loading" ? null : signedIn && authSession?.user?.id ? authSession.user.id : GUEST_SCOPE;
  // Starts empty on purpose (must match the server-rendered pass, which has
  // no `window`/localStorage) and gets filled in by the mount effect below —
  // reading localStorage directly in the initializer caused a hydration
  // mismatch (server saw [], client saw real data on the very first render).
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [deletedIds, setDeletedIds] = useState<DeletedIds>({});
  const deletedIdsRef = useRef<DeletedIds>({});
  useEffect(() => {
    deletedIdsRef.current = deletedIds;
  }, [deletedIds]);
  // Which account's (or the guest bucket's) data is currently loaded into
  // `conversations`/`deletedIds` — kept separate from the *target* scope
  // below so the storage-write effect can tell "we just switched accounts,
  // don't persist yet" apart from "this really is this account's data."
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [showHeroShimmer, setShowHeroShimmer] = useState(true);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ComposerTool>(null);
  const [loading, setLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [streamingTool, setStreamingTool] = useState<ComposerTool>(null);
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [mediaFeedOpen, setMediaFeedOpen] = useState(false);
  const [liveVisionOpen, setLiveVisionOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [scheduledOpen, setScheduledOpen] = useState(false);
  const [pluginsOpen, setPluginsOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [pluginsEnabled, setPluginsEnabled] = useState<Record<PluginKey, boolean>>(DEFAULT_PLUGINS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [companyDashboardOpen, setCompanyDashboardOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab>("General");
  const [comingSoonTitle, setComingSoonTitle] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [theme, setThemeState] = useState<Theme>("system");
  const [fontSize, setFontSizeState] = useState<ChatFontSize>("medium");
  const [assistantColor, setAssistantColorState] = useState<AssistantColor>("default");
  const [chatFont, setChatFontState] = useState<ChatFont>("default");
  const [reduceMotion, setReduceMotionState] = useState<ReduceMotion>("system");
  const [notifyOnComplete, setNotifyOnComplete] = useState(false);
  const [notifyImageGen, setNotifyImageGen] = useState(true);
  const [allNotificationsEnabled, setAllNotificationsEnabled] = useState(true);
  const [contrast, setContrastState] = useState<Contrast>("system");
  const [privacyPrefs, setPrivacyPrefs] = useState<PrivacyPrefs>(DEFAULT_PRIVACY_PREFS);
  const [feedbackEmailsOptIn, setFeedbackEmailsOptIn] = useState(false);
  const [guestMessageCount, setGuestMessageCount] = useState(0);
  const [signInPromptOpen, setSignInPromptOpen] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(true);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [company, setCompany] = useState<CompanyProfile>(DEFAULT_COMPANY);
  const [companyRequests, setCompanyRequests] = useState<CompanyRequest[]>([]);
  const [memory, setMemory] = useState<string[]>([]);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  // Idea #9: a single synthesized narrative profile, loaded once and sent
  // alongside every chat request (see /api/twin, digital_twin tool).
  const [digitalTwin, setDigitalTwin] = useState("");
  const [digitalTwinUpdatedAt, setDigitalTwinUpdatedAt] = useState(0);
  const [digitalTwinRegenerating, setDigitalTwinRegenerating] = useState(false);
  const [historyEnabled, setHistoryEnabled] = useState(true);
  const [language, setLanguage] = useState("Auto-detect");
  const [languageOpen, setLanguageOpen] = useState(false);
  const [location, setLocationState] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<PlanTier | null>(null);
  const [upgradePlanOpen, setUpgradePlanOpen] = useState(false);
  const [upgradeNotice, setUpgradeNotice] = useState<string | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [showUpgradeNudge, setShowUpgradeNudge] = useState(false);
  const [topBarMenuOpen, setTopBarMenuOpen] = useState(false);
  const [greeting, setGreeting] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoSent = useRef(false);
  const historySyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulledHistoryFor = useRef<string | null>(null);
  const profileSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulledProfileFor = useRef<string | null>(null);
  const pulledTwinFor = useRef<string | null>(null);
  const twinSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulledSettingsFor = useRef<string | null>(null);
  const projectsSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulledProjectsFor = useRef<string | null>(null);
  const scheduledSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulledScheduledFor = useRef<string | null>(null);

  useEffect(() => {
    setProjects(loadJson(PROJECTS_KEY, []));
    setScheduledTasks(loadJson(SCHEDULED_KEY, []));
    setPluginsEnabled(loadJson(PLUGINS_KEY, DEFAULT_PLUGINS));
    setProfile(loadJson(PROFILE_KEY, DEFAULT_PROFILE));
    setCompany(loadJson(COMPANY_KEY, DEFAULT_COMPANY));
    setCompanyRequests(loadJson(COMPANY_REQUESTS_KEY, []));
    setUserPlan(loadJson<PlanTier | null>(USER_PLAN_KEY, null));
    setMemory(loadJson(MEMORY_KEY, []));
    setMemoryEnabled(loadJson(MEMORY_ENABLED_KEY, true));
    setHistoryEnabled(loadJson(HISTORY_ENABLED_KEY, true));
    setNotifyOnComplete(loadJson(NOTIFY_ON_COMPLETE_KEY, false));
    setNotifyImageGen(loadJson(NOTIFY_IMAGE_GEN_KEY, true));
    setAllNotificationsEnabled(loadJson(ALL_NOTIFICATIONS_KEY, true));
    setPrivacyPrefs(loadJson(PRIVACY_PREFS_KEY, DEFAULT_PRIVACY_PREFS));
    setFeedbackEmailsOptIn(loadJson(FEEDBACK_EMAILS_KEY, false));
    const storedContrast = getStoredContrast();
    setContrastState(storedContrast);
    applyContrast(storedContrast);
    setGuestMessageCount(loadJson(GUEST_MESSAGE_COUNT_KEY, 0));
    setOnboardingDismissed(loadJson(ONBOARDING_DISMISSED_KEY, false));
    setLanguage(loadJson(LANGUAGE_KEY, "Auto-detect"));
    setLocationState(loadJson(LOCATION_KEY, ""));
    const storedTheme = getStoredTheme();
    setThemeState(storedTheme);
    applyTheme(storedTheme);
    const storedFontSize = getStoredFontSize();
    setFontSizeState(storedFontSize);
    applyFontSize(storedFontSize);
    const storedAssistantColor = getStoredAssistantColor();
    setAssistantColorState(storedAssistantColor);
    applyAssistantColor(storedAssistantColor);
    const storedChatFont = getStoredChatFont();
    setChatFontState(storedChatFont);
    applyChatFont(storedChatFont);
    const storedReduceMotion = getStoredReduceMotion();
    setReduceMotionState(storedReduceMotion);
    applyReduceMotion(storedReduceMotion);

    const currentStreak = recordVisitAndGetStreak();
    const streakMessage = checkStreakMilestone(currentStreak);
    if (streakMessage) setCelebration(streakMessage);

    setShowUpgradeNudge(shouldShowUpgradeNudge());
  }, []);

  useEffect(() => {
    // `activeId` always starts null on load (it isn't restored from storage),
    // so this only ever fires on a fresh "Ready when you are" landing, once
    // per browser tab session — voice first, then the greeting appears as a
    // bubble on that empty screen. It disappears on its own the moment the
    // user sends a real message, since the hero screen is replaced by the
    // actual conversation view; nothing is ever saved to their chat history.
    if (activeId !== null) return;
    if (sessionStorage.getItem(GREETED_SESSION_KEY)) return;
    sessionStorage.setItem(GREETED_SESSION_KEY, "1");
    setGreeting(GREETING_TEXT);
    speakText(GREETING_TEXT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Loads whichever scope (a specific account, or the shared guest bucket)
  // the user currently is, whenever that identity changes — including sign
  // out, which must swap `conversations` away from the account's data
  // entirely rather than leaving it sitting in memory for the next person
  // who uses this device/browser.
  useEffect(() => {
    if (!scope || scope === loadedScope) return;

    let nextConversations = loadStoredConversations(scope);
    let nextDeletedIds = pruneDeletedIds(loadDeletedIds(scope));

    // One-time adoption: if this account (or the guest bucket) has never
    // been used on this device before, but there's unclaimed guest history
    // sitting here, claim it instead of starting empty — then clear the
    // guest bucket so it can't also bleed into some other account later.
    if (scope !== GUEST_SCOPE && nextConversations.length === 0) {
      const guestConversations = loadStoredConversations(GUEST_SCOPE);
      if (guestConversations.length > 0) {
        nextConversations = guestConversations;
        nextDeletedIds = mergeDeletedIds(nextDeletedIds, loadDeletedIds(GUEST_SCOPE));
        localStorage.removeItem(storageKeyFor(GUEST_SCOPE));
        localStorage.removeItem(deletedIdsKeyFor(GUEST_SCOPE));
      }
    }

    setConversations(mergeConversations(nextConversations, [], nextDeletedIds));
    setDeletedIds(nextDeletedIds);
    setActiveId(null);
    pulledHistoryFor.current = null;
    setLoadedScope(scope);
  }, [scope, loadedScope]);

  // Writes back to disk only once `conversations`/`deletedIds` actually
  // belong to the current scope — during the render right after switching
  // accounts, `conversations` still briefly holds the *previous* scope's
  // data while `scope` has already moved on, and writing in that window
  // would leak it into the new scope's storage.
  useEffect(() => {
    if (!historyEnabled || !scope || scope !== loadedScope) return;
    const merged = mergeConversations(loadStoredConversations(scope), conversations, deletedIds);
    localStorage.setItem(storageKeyFor(scope), JSON.stringify(merged));
    localStorage.setItem(deletedIdsKeyFor(scope), JSON.stringify(deletedIds));
  }, [conversations, deletedIds, historyEnabled, scope, loadedScope]);

  // Pulls this account's synced history once per sign-in (keyed by user id
  // so switching accounts in the same browser re-pulls) and merges it into
  // whatever's already loaded locally — deletion tombstones from the server
  // are merged in first so a deletion made on another device wins here too,
  // instead of the conversation just reappearing.
  useEffect(() => {
    if (!signedIn || !historyEnabled || !scope) return;
    const userId = authSession?.user?.id;
    if (!userId || pulledHistoryFor.current === userId) return;
    pulledHistoryFor.current = userId;
    fetch("/api/history")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { conversations?: Conversation[]; deletedIds?: DeletedIds } | null) => {
        if (!data) return;
        const merged = mergeDeletedIds(deletedIdsRef.current, data.deletedIds ?? {});
        setDeletedIds(merged);
        if (data.conversations) {
          setConversations((prev) => mergeConversations(data.conversations!, prev, merged));
        }
      })
      .catch(() => {});
  }, [signedIn, historyEnabled, authSession?.user?.id, scope]);

  // Pushes this device's conversations (and deletion tombstones) up to the
  // account's synced storage so logging into the same account elsewhere
  // sees the same history — including what's been deleted. Debounced since
  // `conversations` also changes on every streamed token.
  useEffect(() => {
    if (!signedIn || !historyEnabled || !scope || scope !== loadedScope) return;
    if (historySyncTimer.current) clearTimeout(historySyncTimer.current);
    historySyncTimer.current = setTimeout(() => {
      fetch("/api/history", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversations, deletedIds }),
      }).catch(() => {});
    }, 1200);
    return () => {
      if (historySyncTimer.current) clearTimeout(historySyncTimer.current);
    };
  }, [conversations, deletedIds, signedIn, historyEnabled, scope, loadedScope]);

  // Same pull/push pattern as history, for the account-level settings that
  // used to live only in this device's localStorage (nickname/about, memory,
  // language) — the native Android app reads/writes the same endpoint, so
  // editing your profile on one now shows up on the other.
  useEffect(() => {
    if (!signedIn) return;
    const userId = authSession?.user?.id;
    if (!userId || pulledProfileFor.current === userId) return;
    pulledProfileFor.current = userId;
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: { profile?: Profile; memory?: string[]; memoryEnabled?: boolean; language?: string } | null
        ) => {
          if (!data) return;
          if (data.profile) setProfile(data.profile);
          if (data.memory) setMemory(data.memory);
          if (typeof data.memoryEnabled === "boolean") setMemoryEnabled(data.memoryEnabled);
          if (data.language) setLanguage(data.language);
        }
      )
      .catch(() => {});
  }, [signedIn, authSession?.user?.id]);

  useEffect(() => {
    if (!signedIn) return;
    if (profileSyncTimer.current) clearTimeout(profileSyncTimer.current);
    profileSyncTimer.current = setTimeout(() => {
      fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, memory, memoryEnabled, language }),
      }).catch(() => {});
    }, 1200);
    return () => {
      if (profileSyncTimer.current) clearTimeout(profileSyncTimer.current);
    };
  }, [profile, memory, memoryEnabled, language, signedIn]);

  // Idea #9: separate KV entry from profile/memory (see /api/twin) since
  // it's a single synthesized narrative, not a list of discrete facts.
  useEffect(() => {
    if (!signedIn) return;
    const userId = authSession?.user?.id;
    if (!userId || pulledTwinFor.current === userId) return;
    pulledTwinFor.current = userId;
    fetch("/api/twin")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { summary?: string; updatedAt?: number } | null) => {
        if (!data) return;
        if (typeof data.summary === "string") setDigitalTwin(data.summary);
        if (typeof data.updatedAt === "number") setDigitalTwinUpdatedAt(data.updatedAt);
      })
      .catch(() => {});
  }, [signedIn, authSession?.user?.id]);

  // Debounced save, covers manual edits from the Digital Twin settings
  // panel -- regenerating from chat history saves immediately instead (see
  // handleRegenerateDigitalTwin below), so this only fires for typing.
  useEffect(() => {
    if (!signedIn || pulledTwinFor.current === null) return;
    if (twinSyncTimer.current) clearTimeout(twinSyncTimer.current);
    twinSyncTimer.current = setTimeout(() => {
      fetch("/api/twin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: digitalTwin }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { updatedAt?: number } | null) => {
          if (data && typeof data.updatedAt === "number") setDigitalTwinUpdatedAt(data.updatedAt);
        })
        .catch(() => {});
    }, 1200);
    return () => {
      if (twinSyncTimer.current) clearTimeout(twinSyncTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digitalTwin, signedIn]);

  // Same pull/push pattern, for plugins/notifications/privacy/location/company —
  // the rest of what used to be localStorage-only settings.
  useEffect(() => {
    if (!signedIn) return;
    const userId = authSession?.user?.id;
    if (!userId || pulledSettingsFor.current === userId) return;
    pulledSettingsFor.current = userId;
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            plugins?: Record<PluginKey, boolean>;
            notifyOnComplete?: boolean;
            notifyImageGen?: boolean;
            allNotificationsEnabled?: boolean;
            privacy?: PrivacyPrefs;
            location?: string;
            company?: CompanyProfile;
            companyRequests?: CompanyRequest[];
          } | null
        ) => {
          if (!data) return;
          if (data.plugins) setPluginsEnabled(data.plugins);
          if (typeof data.notifyOnComplete === "boolean") setNotifyOnComplete(data.notifyOnComplete);
          if (typeof data.notifyImageGen === "boolean") setNotifyImageGen(data.notifyImageGen);
          if (typeof data.allNotificationsEnabled === "boolean") setAllNotificationsEnabled(data.allNotificationsEnabled);
          if (data.privacy) setPrivacyPrefs(data.privacy);
          if (typeof data.location === "string") setLocationState(data.location);
          if (data.company) setCompany(data.company);
          if (data.companyRequests) setCompanyRequests(data.companyRequests);
        }
      )
      .catch(() => {});
  }, [signedIn, authSession?.user?.id]);

  useEffect(() => {
    if (!signedIn) return;
    if (settingsSyncTimer.current) clearTimeout(settingsSyncTimer.current);
    settingsSyncTimer.current = setTimeout(() => {
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plugins: pluginsEnabled,
          notifyOnComplete,
          notifyImageGen,
          allNotificationsEnabled,
          privacy: privacyPrefs,
          location,
          company,
          companyRequests,
        }),
      }).catch(() => {});
    }, 1200);
    return () => {
      if (settingsSyncTimer.current) clearTimeout(settingsSyncTimer.current);
    };
  }, [pluginsEnabled, notifyOnComplete, notifyImageGen, allNotificationsEnabled, privacyPrefs, location, company, companyRequests, signedIn]);

  // Same pull/push pattern, for Projects.
  useEffect(() => {
    if (!signedIn) return;
    const userId = authSession?.user?.id;
    if (!userId || pulledProjectsFor.current === userId) return;
    pulledProjectsFor.current = userId;
    fetch("/api/projects")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { projects?: Project[] } | null) => {
        if (data?.projects) setProjects(data.projects);
      })
      .catch(() => {});
  }, [signedIn, authSession?.user?.id]);

  useEffect(() => {
    if (!signedIn) return;
    if (projectsSyncTimer.current) clearTimeout(projectsSyncTimer.current);
    projectsSyncTimer.current = setTimeout(() => {
      fetch("/api/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects }),
      }).catch(() => {});
    }, 1200);
    return () => {
      if (projectsSyncTimer.current) clearTimeout(projectsSyncTimer.current);
    };
  }, [projects, signedIn]);

  // Same pull/push pattern, for scheduled/automation tasks — firing itself
  // still happens client-side (whichever device has the tab/app open).
  useEffect(() => {
    if (!signedIn) return;
    const userId = authSession?.user?.id;
    if (!userId || pulledScheduledFor.current === userId) return;
    pulledScheduledFor.current = userId;
    fetch("/api/scheduled")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { tasks?: ScheduledTask[] } | null) => {
        if (data?.tasks) setScheduledTasks(data.tasks);
      })
      .catch(() => {});
  }, [signedIn, authSession?.user?.id]);

  useEffect(() => {
    if (!signedIn) return;
    if (scheduledSyncTimer.current) clearTimeout(scheduledSyncTimer.current);
    scheduledSyncTimer.current = setTimeout(() => {
      fetch("/api/scheduled", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: scheduledTasks }),
      }).catch(() => {});
    }, 1200);
    return () => {
      if (scheduledSyncTimer.current) clearTimeout(scheduledSyncTimer.current);
    };
  }, [scheduledTasks, signedIn]);

  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(COMPANY_KEY, JSON.stringify(company));
  }, [company]);

  useEffect(() => {
    if (userPlan) localStorage.setItem(USER_PLAN_KEY, JSON.stringify(userPlan));
  }, [userPlan]);

  useEffect(() => {
    const upgrade = searchParams.get("upgrade");
    if (upgrade === "cancelled") {
      setUpgradeNotice("Checkout was cancelled — no charge was made.");
      window.history.replaceState(null, "", "/chatgiza");
      return;
    }
    if (upgrade !== "success") return;
    const sessionId = searchParams.get("session_id");
    if (!sessionId) return;
    window.history.replaceState(null, "", "/chatgiza");
    fetch(`/api/checkout/verify?session_id=${encodeURIComponent(sessionId)}`)
      .then((res) => res.json())
      .then((data: { paid?: boolean; tier?: PlanTier }) => {
        if (data.paid && data.tier) {
          setUserPlan(data.tier);
          setUpgradeNotice(`You're now on the ${data.tier[0].toUpperCase()}${data.tier.slice(1)} plan.`);
        } else {
          setUpgradeNotice("We couldn't confirm your payment yet. If you were charged, contact support.");
        }
      })
      .catch(() => setUpgradeNotice("We couldn't confirm your payment yet. If you were charged, contact support."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    localStorage.setItem(COMPANY_REQUESTS_KEY, JSON.stringify(companyRequests));
  }, [companyRequests]);

  useEffect(() => {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
  }, [memory]);

  useEffect(() => {
    localStorage.setItem(MEMORY_ENABLED_KEY, JSON.stringify(memoryEnabled));
  }, [memoryEnabled]);

  useEffect(() => {
    localStorage.setItem(HISTORY_ENABLED_KEY, JSON.stringify(historyEnabled));
  }, [historyEnabled]);

  useEffect(() => {
    localStorage.setItem(NOTIFY_ON_COMPLETE_KEY, JSON.stringify(notifyOnComplete));
  }, [notifyOnComplete]);

  useEffect(() => {
    localStorage.setItem(NOTIFY_IMAGE_GEN_KEY, JSON.stringify(notifyImageGen));
  }, [notifyImageGen]);

  useEffect(() => {
    localStorage.setItem(ALL_NOTIFICATIONS_KEY, JSON.stringify(allNotificationsEnabled));
  }, [allNotificationsEnabled]);

  useEffect(() => {
    localStorage.setItem(PRIVACY_PREFS_KEY, JSON.stringify(privacyPrefs));
  }, [privacyPrefs]);

  useEffect(() => {
    localStorage.setItem(FEEDBACK_EMAILS_KEY, JSON.stringify(feedbackEmailsOptIn));
  }, [feedbackEmailsOptIn]);

  useEffect(() => {
    localStorage.setItem(GUEST_MESSAGE_COUNT_KEY, JSON.stringify(guestMessageCount));
  }, [guestMessageCount]);

  useEffect(() => {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, JSON.stringify(onboardingDismissed));
  }, [onboardingDismissed]);

  useEffect(() => {
    // Gated on the account's server-tracked `isNewAccount` flag (set once,
    // the very first time this Google account ever signs in) rather than
    // "no local profile data" — the old check re-asked existing users for
    // their birth date/country every time they opened ChatGiZa on a new
    // device or browser, since that profile data only ever lived in
    // localStorage. Existing accounts now never see this again, anywhere.
    if (signedIn && authSession?.user?.isNewAccount && !onboardingDismissed) {
      setOnboardingOpen(true);
    }
  }, [signedIn, authSession?.user?.isNewAccount, onboardingDismissed]);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, JSON.stringify(language));
  }, [language]);

  useEffect(() => {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
  }, [location]);

  function requestLocation() {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Location isn't available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
          );
          const data = await res.json();
          const addr = data.address ?? {};
          const place = addr.city || addr.town || addr.village || addr.county;
          const label = [place, addr.country].filter(Boolean).join(", ");
          setLocationState(label || `${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`);
        } catch {
          setLocationState(`${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`);
        }
      },
      () => setLocationError("Location permission was denied.")
    );
  }

  function clearLocation() {
    setLocationState("");
    setLocationError(null);
  }

  function handleThemeChange(t: Theme) {
    persistTheme(t);
    setThemeState(t);
  }

  function handleContrastChange(c: Contrast) {
    persistContrast(c);
    setContrastState(c);
  }

  async function handleDeleteAccount() {
    try {
      await fetch("/api/account", { method: "DELETE" });
    } catch {
      // Best-effort server cleanup — still sign the browser out below either way.
    }
    Object.keys(localStorage)
      .filter((k) => k.startsWith("chatgiza:"))
      .forEach((k) => localStorage.removeItem(k));
    await signOut({ callbackUrl: "/login" });
  }

  // Idea #9: samples recent turns across the user's own saved conversations
  // (not just the currently open one) so the synthesized profile reflects
  // how they actually write/decide generally, not just today's chat.
  async function handleRegenerateDigitalTwin() {
    if (digitalTwinRegenerating) return;
    setDigitalTwinRegenerating(true);
    try {
      const sample = conversations
        .slice(0, 8)
        .flatMap((c) => c.messages.slice(-10))
        .slice(-60)
        .map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/twin/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: sample, existingTwin: digitalTwin }),
      });
      const data = await res.json().catch(() => null);
      if (data?.summary) {
        setDigitalTwin(data.summary);
        const saveRes = await fetch("/api/twin", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ summary: data.summary }),
        });
        const saved = await saveRes.json().catch(() => null);
        if (saved && typeof saved.updatedAt === "number") setDigitalTwinUpdatedAt(saved.updatedAt);
      }
    } catch {
      // Best-effort -- the existing profile (if any) just stays as-is.
    } finally {
      setDigitalTwinRegenerating(false);
    }
  }

  function handleFontSizeChange(s: ChatFontSize) {
    persistFontSize(s);
    setFontSizeState(s);
  }

  function handleAssistantColorChange(c: AssistantColor) {
    persistAssistantColor(c);
    setAssistantColorState(c);
  }

  function handleChatFontChange(f: ChatFont) {
    persistChatFont(f);
    setChatFontState(f);
  }

  function handleReduceMotionChange(m: ReduceMotion) {
    persistReduceMotion(m);
    setReduceMotionState(m);
  }

  function clearAllHistory() {
    const now = Date.now();
    setDeletedIds((prev) => {
      const next = { ...prev };
      for (const c of conversations) next[c.id] = now;
      return next;
    });
    setConversations([]);
    if (scope) localStorage.setItem(storageKeyFor(scope), JSON.stringify([]));
    setActiveId(null);
  }

  function openSettingsTab(tab: SettingsTab) {
    setSettingsInitialTab(tab);
    setSettingsOpen(true);
  }

  useEffect(() => {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(SCHEDULED_KEY, JSON.stringify(scheduledTasks));
  }, [scheduledTasks]);

  useEffect(() => {
    localStorage.setItem(PLUGINS_KEY, JSON.stringify(pluginsEnabled));
  }, [pluginsEnabled]);

  const scheduledTasksRef = useRef<ScheduledTask[]>([]);
  useEffect(() => {
    scheduledTasksRef.current = scheduledTasks;
  }, [scheduledTasks]);

  // Always points at the latest render's sendChatMessage (closed over current
  // profile/memory state) so the scheduled-task interval below — whose effect
  // only runs once on mount — never sends with stale personalization data.
  const sendChatMessageRef = useRef<typeof sendChatMessage>(() => Promise.resolve());
  useEffect(() => {
    sendChatMessageRef.current = sendChatMessage;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const due = scheduledTasksRef.current.filter((t) => !t.fired && new Date(t.runAt).getTime() <= now);
      if (due.length === 0) return;

      // Mark fired first (pure state update) so a slow reply can't cause this
      // task to be picked up again by the next tick.
      setScheduledTasks((prev) => prev.map((t) => (due.some((d) => d.id === t.id) ? { ...t, fired: true } : t)));

      if (typeof Notification !== "undefined") {
        if (Notification.permission === "default") Notification.requestPermission();
        if (Notification.permission === "granted") {
          due.forEach((t) => new Notification("ChatGiZa", { body: t.prompt }));
        }
      }

      due.forEach((t) => {
        sendChatMessageRef.current(t.prompt, [], null, { conversationId: crypto.randomUUID(), baseMessages: [] });
      });
    }, 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = conversations.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.messages, loading]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !autoSent.current) {
      autoSent.current = true;
      handleSend(q, []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function handleAddFiles(files: FileList | null) {
    if (!files) return;
    setAttachError(null);
    for (const file of Array.from(files)) {
      try {
        const newAttachments = await readAttachment(file);
        setPendingAttachments((prev) => [...prev, ...newAttachments]);
      } catch (e) {
        setAttachError(e instanceof Error ? e.message : "Couldn't read that file");
      }
    }
  }

  function handleRemoveAttachment(id: string) {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  function startConversation(userMessage: Message, fallbackTitle: string, override?: SendOverride) {
    const existing = override
      ? { id: override.conversationId, messages: override.baseMessages }
      : activeId
        ? conversations.find((c) => c.id === activeId) ?? null
        : null;
    const conversationId = existing ? existing.id : crypto.randomUUID();
    const updatedMessages = [...(existing?.messages ?? []), userMessage];
    const isNew = !conversations.some((c) => c.id === conversationId);

    setConversations((prev) =>
      isNew
        ? [
            { id: conversationId, title: truncateTitle(fallbackTitle), messages: updatedMessages },
            ...prev,
          ]
        : prev.map((c) => (c.id === conversationId ? { ...c, messages: updatedMessages } : c))
    );
    setActiveId(conversationId);

    const assistantId = crypto.randomUUID();
    setStreamingId(assistantId);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, { id: assistantId, role: "assistant", content: "", createdAt: Date.now() }] }
          : c
      )
    );

    return { conversationId, assistantId, updatedMessages };
  }

  function updateAssistantMessage(
    conversationId: string,
    assistantId: string,
    patch: Partial<Message>
  ) {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, messages: c.messages.map((m) => (m.id === assistantId ? { ...m, ...patch } : m)) }
          : c
      )
    );
  }

  function guestQuotaExceeded(): boolean {
    if (!signedIn && guestMessageCount >= GUEST_FREE_MESSAGES) {
      setSignInPromptOpen(true);
      return true;
    }
    return false;
  }

  function handleSend(text: string, attachments: Attachment[]) {
    if (guestQuotaExceeded()) return;
    if (!signedIn) {
      setGuestMessageCount((c) => c + 1);
    }
    if (activeTool === "image" && pluginsEnabled.image) return sendImageMessage(text);
    if (activeTool === "video" && pluginsEnabled.video) return sendVideoMessage(text);
    if (!activeTool && attachments.length === 0) {
      if (pluginsEnabled.image && looksLikeImageRequest(text)) return sendImageMessage(text);
      if (pluginsEnabled.video && looksLikeVideoRequest(text)) return sendVideoMessage(text);
    }
    const tool = activeTool && pluginsEnabled[activeTool as PluginKey] === false ? null : activeTool;
    return sendChatMessage(text, attachments, tool);
  }

  function handleEditMessage(messageId: string, newText: string) {
    if (guestQuotaExceeded()) return;
    if (!active) return;
    const idx = active.messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return;

    const original = active.messages[idx];
    const baseMessages = active.messages.slice(0, idx);
    const attachments = original.attachments ?? [];
    const override: SendOverride = { conversationId: active.id, baseMessages };

    if (attachments.length === 0 && looksLikeImageRequest(newText)) {
      sendImageMessage(newText, override);
    } else if (attachments.length === 0 && looksLikeVideoRequest(newText)) {
      sendVideoMessage(newText, override);
    } else {
      sendChatMessage(newText, attachments, activeTool, override);
    }
  }

  function handleRegenerate(assistantMessageId: string) {
    if (guestQuotaExceeded()) return;
    if (!active) return;
    const idx = active.messages.findIndex((m) => m.id === assistantMessageId);
    if (idx <= 0) return;
    const userMsg = active.messages[idx - 1];
    if (userMsg.role !== "user") return;
    const baseMessages = active.messages.slice(0, idx - 1);
    const override: SendOverride = { conversationId: active.id, baseMessages };
    sendChatMessage(userMsg.content, userMsg.attachments ?? [], activeTool, override);
  }

  function handleEditImage(sourceImageUrl: string, instruction: string) {
    if (guestQuotaExceeded()) return;
    sendImageMessage(instruction, undefined, sourceImageUrl);
  }

  function handleDeleteMessage(messageId: string) {
    if (!activeId) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, messages: c.messages.filter((m) => m.id !== messageId) } : c))
    );
  }

  async function sendImageMessage(prompt: string, override?: SendOverride, editSourceUrl?: string) {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;

    setInput("");
    setPendingAttachments([]);
    setAttachError(null);
    setActiveTool(null);
    setLoading(true);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: editSourceUrl ? `Edit image: ${trimmed}` : trimmed,
      createdAt: Date.now(),
    };
    const { conversationId, assistantId } = startConversation(userMessage, trimmed, override);
    setGeneratingImageId(assistantId);

    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, editSourceUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) setUpgradePlanOpen(true);
        throw new Error(data.error ?? "Couldn't generate that image.");
      }
      updateAssistantMessage(conversationId, assistantId, { imageUrl: data.url });
      const milestone = bumpCounterAndCheckMilestone("images");
      if (milestone) setCelebration(milestone);
      if (
        allNotificationsEnabled &&
        notifyImageGen &&
        typeof document !== "undefined" &&
        document.visibilityState === "hidden" &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        new Notification("ChatGiZa", { body: "Your image is ready." });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sorry, something went wrong. Please try again.";
      updateAssistantMessage(conversationId, assistantId, { content: message });
    } finally {
      setLoading(false);
      setStreamingId(null);
      setGeneratingImageId(null);
    }
  }

  async function sendVideoMessage(prompt: string, override?: SendOverride) {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;

    setInput("");
    setPendingAttachments([]);
    setAttachError(null);
    setActiveTool(null);
    setLoading(true);

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: trimmed, createdAt: Date.now() };
    const { conversationId, assistantId } = startConversation(userMessage, trimmed, override);
    updateAssistantMessage(conversationId, assistantId, { videoStatus: "queued", videoProgress: 0 });

    const requestedSeconds = Math.min(parseRequestedSeconds(trimmed) ?? 4, 60);
    const TIMEOUT_MS = 6 * 60 * 1000;
    const POLL_MS = 4000;

    async function pollUntilDone(videoId: string): Promise<string> {
      const startedAt = Date.now();
      while (true) {
        if (Date.now() - startedAt > TIMEOUT_MS) {
          throw new Error("Video generation is taking too long. Please try again later.");
        }
        await new Promise((r) => setTimeout(r, POLL_MS));

        const statusRes = await fetch(`/api/video/${videoId}`);
        const statusData = await statusRes.json();
        if (!statusRes.ok) throw new Error(statusData.error ?? "Couldn't check video status.");

        if (statusData.status === "completed") return (statusData.id as string) ?? videoId;
        if (statusData.status === "failed") throw new Error(statusData.error ?? "Video generation failed.");

        updateAssistantMessage(conversationId, assistantId, {
          videoStatus: statusData.status,
          videoProgress: statusData.progress ?? 0,
        });
      }
    }

    try {
      const startRes = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) {
        if (startRes.status === 403) setUpgradePlanOpen(true);
        throw new Error(startData.error ?? "Couldn't start video generation.");
      }

      let currentId = startData.id as string;
      currentId = await pollUntilDone(currentId);
      let totalSeconds = 4;

      while (totalSeconds < requestedSeconds) {
        const remaining = requestedSeconds - totalSeconds;
        const chunk = pickChunkSeconds(remaining);
        updateAssistantMessage(conversationId, assistantId, { videoStatus: "in_progress", videoProgress: 0 });

        const extendRes = await fetch(`/api/video/${currentId}/extend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seconds: chunk }),
        });
        const extendData = await extendRes.json();
        if (!extendRes.ok) throw new Error(extendData.error ?? "Couldn't extend the video.");

        currentId = await pollUntilDone(extendData.id as string);
        totalSeconds += Number(chunk);
      }

      updateAssistantMessage(conversationId, assistantId, {
        videoStatus: "completed",
        videoProgress: 100,
        videoUrl: `/api/video/${currentId}/content`,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sorry, something went wrong. Please try again.";
      updateAssistantMessage(conversationId, assistantId, {
        content: message,
        videoStatus: undefined,
        videoProgress: undefined,
      });
    } finally {
      setLoading(false);
      setStreamingId(null);
    }
  }

  async function sendChatMessage(
    text: string,
    attachments: Attachment[],
    tool: ComposerTool,
    override?: SendOverride
  ) {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || loading) return;

    setInput("");
    setPendingAttachments([]);
    setAttachError(null);
    setActiveTool(null);
    setLoading(true);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      attachments: attachments.length > 0 ? attachments : undefined,
      createdAt: Date.now(),
    };
    const { conversationId, assistantId, updatedMessages } = startConversation(
      userMessage,
      trimmed || attachments[0]?.name || "New chat",
      override
    );
    setStreamingTool(tool);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool,
          conversationId,
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.attachments?.length ? buildApiContent(m.content, m.attachments) : m.content,
          })),
          profile,
          memory: memoryEnabled ? memory : [],
          language,
          location,
          company,
          digitalTwin,
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 403) setUpgradePlanOpen(true);
        throw new Error(data.error ?? "Sorry, something went wrong. Please try again.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let flushScheduled = false;

      function scheduleFlush() {
        if (flushScheduled) return;
        flushScheduled = true;
        requestAnimationFrame(() => {
          flushScheduled = false;
          updateAssistantMessage(conversationId, assistantId, { content: accumulated });
        });
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        scheduleFlush();
      }
      // Final flush in case the last chunk arrived after the last scheduled frame.
      updateAssistantMessage(conversationId, assistantId, { content: accumulated });
      const milestone = bumpCounterAndCheckMilestone("messages");
      if (milestone) setCelebration(milestone);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(200);
      }
      if (
        allNotificationsEnabled &&
        notifyOnComplete &&
        typeof document !== "undefined" &&
        document.visibilityState === "hidden" &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        new Notification("ChatGiZa", { body: "Your response is ready." });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sorry, something went wrong. Please try again.";
      updateAssistantMessage(conversationId, assistantId, { content: message });
    } finally {
      setLoading(false);
      setStreamingId(null);
      setStreamingTool(null);
    }
  }

  function renameConversation(id: string, title: string) {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }

  function togglePinConversation(id: string) {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)));
  }

  function archiveConversation(id: string) {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, archived: true, pinned: false } : c)));
    if (activeId === id) setActiveId(null);
  }

  function archiveAllConversations() {
    setConversations((prev) => prev.map((c) => ({ ...c, archived: true, pinned: false })));
    setActiveId(null);
  }

  function deleteConversation(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setDeletedIds((prev) => ({ ...prev, [id]: Date.now() }));
    if (activeId === id) setActiveId(null);
  }

  async function shareConversation(id: string) {
    const convo = conversations.find((c) => c.id === id);
    if (!convo) return;
    const transcript = convo.messages
      .filter((m) => m.content)
      .map((m) => `${m.role === "user" ? "You" : "ChatGiZa"}: ${m.content}`)
      .join("\n\n");
    const text = `${convo.title}\n\n${transcript}`;
    let shared = false;
    if (navigator.share) {
      try {
        await navigator.share({ title: convo.title, text });
        shared = true;
      } catch {
        // user cancelled or share failed; fall through to clipboard copy
      }
    }
    if (!shared) {
      try {
        await navigator.clipboard.writeText(text);
        shared = true;
      } catch {
        // clipboard unavailable; nothing more we can do here
      }
    }
    if (shared) {
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, shared: true } : c)));
    }
  }

  function unshareConversation(id: string) {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, shared: false } : c)));
  }

  function unarchiveConversation(id: string) {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, archived: false } : c)));
  }

  function exportAllData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      conversations,
      projects,
      profile,
      memory,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chatgiza-data-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function createProject(id: string, name: string) {
    setProjects((prev) => [...prev, { id, name, createdAt: Date.now() }]);
  }

  function renameProject(id: string, name: string) {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  }

  function deleteProject(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setConversations((prev) => prev.map((c) => (c.projectId === id ? { ...c, projectId: undefined } : c)));
  }

  function assignConversationToProject(conversationId: string, projectId: string | null) {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, projectId: projectId ?? undefined } : c))
    );
  }

  function addCompanyRequest(customerName: string, note: string) {
    setCompanyRequests((prev) => [
      ...prev,
      { id: crypto.randomUUID(), customerName, note, status: "pending", createdAt: Date.now() },
    ]);
  }

  function updateCompanyRequestStatus(id: string, status: CompanyRequest["status"]) {
    setCompanyRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  function removeCompanyRequest(id: string) {
    setCompanyRequests((prev) => prev.filter((r) => r.id !== id));
  }

  function createScheduledTask(prompt: string, runAt: string) {
    setScheduledTasks((prev) => [...prev, { id: crypto.randomUUID(), prompt, runAt, fired: false }]);
  }

  function deleteScheduledTask(id: string) {
    setScheduledTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function togglePlugin(key: PluginKey) {
    setPluginsEnabled((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const libraryItems = !signedIn ? [] : conversations.flatMap((c) =>
    c.messages
      .filter((m) => m.imageUrl || m.videoUrl)
      .map((m) => ({
        conversationId: c.id,
        messageId: m.id,
        kind: (m.imageUrl ? "image" : "video") as "image" | "video",
        url: (m.imageUrl ?? m.videoUrl) as string,
        title: c.title,
        createdAt: m.createdAt,
      }))
  );

  return (
    <>
      <ChatSidebar
        conversations={conversations
          .filter((c) => !c.archived)
          .map((c) => ({ id: c.id, title: c.title, pinned: c.pinned, updatedAt: lastActivity(c) }))}
        activeId={activeId}
        onSelect={setActiveId}
        onNewChat={() => setActiveId(null)}
        onRename={renameConversation}
        onTogglePin={togglePinConversation}
        onArchive={archiveConversation}
        onDelete={deleteConversation}
        onShare={shareConversation}
        onOpenLibrary={() => setLibraryOpen(true)}
        onOpenMedia={() => setMediaFeedOpen(true)}
        onOpenLiveVision={() => setLiveVisionOpen(true)}
        onOpenProjects={() => setProjectsOpen(true)}
        onOpenCode={() => setCodeOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenComingSoon={setComingSoonTitle}
        onOpenSettingsTab={openSettingsTab}
        onOpenCompanyDashboard={() => setCompanyDashboardOpen(true)}
        onOpenLanguage={() => setLanguageOpen(true)}
        onOpenUpgradePlan={() => setUpgradePlanOpen(true)}
        onOpenSupport={() => setSupportOpen(true)}
        onOpenScheduled={() => setScheduledOpen(true)}
        userPlan={userPlan}
        projects={projects.map(({ id, name }) => ({ id, name }))}
        onMoveToProject={assignConversationToProject}
      />

      {languageOpen && (
        <LanguagePanel language={language} onSelect={setLanguage} onClose={() => setLanguageOpen(false)} />
      )}

      {settingsOpen && (
        <SettingsPanel
          onClose={() => setSettingsOpen(false)}
          initialTab={settingsInitialTab}
          theme={theme}
          onThemeChange={handleThemeChange}
          fontSize={fontSize}
          onFontSizeChange={handleFontSizeChange}
          assistantColor={assistantColor}
          onAssistantColorChange={handleAssistantColorChange}
          chatFont={chatFont}
          onChatFontChange={handleChatFontChange}
          reduceMotion={reduceMotion}
          onReduceMotionChange={handleReduceMotionChange}
          notifyOnComplete={notifyOnComplete}
          onToggleNotifyOnComplete={() => setNotifyOnComplete((v) => !v)}
          notifyImageGen={notifyImageGen}
          onToggleNotifyImageGen={() => setNotifyImageGen((v) => !v)}
          allNotificationsEnabled={allNotificationsEnabled}
          onToggleAllNotifications={() => setAllNotificationsEnabled((v) => !v)}
          contrast={contrast}
          onContrastChange={handleContrastChange}
          privacyPrefs={privacyPrefs}
          onPrivacyPrefsChange={setPrivacyPrefs}
          feedbackEmailsOptIn={feedbackEmailsOptIn}
          onToggleFeedbackEmailsOptIn={() => setFeedbackEmailsOptIn((v) => !v)}
          onOpenSupport={() => setSupportOpen(true)}
          onDeleteAccount={handleDeleteAccount}
          onOpenUpgradePlan={() => setUpgradePlanOpen(true)}
          profile={profile}
          onProfileChange={setProfile}
          memoryEnabled={memoryEnabled}
          onToggleMemoryEnabled={() => setMemoryEnabled((v) => !v)}
          memory={memory}
          onAddMemory={(fact) => setMemory((prev) => [...prev, fact])}
          onRemoveMemory={(index) => setMemory((prev) => prev.filter((_, i) => i !== index))}
          digitalTwin={digitalTwin}
          digitalTwinUpdatedAt={digitalTwinUpdatedAt}
          digitalTwinRegenerating={digitalTwinRegenerating}
          onChangeDigitalTwin={setDigitalTwin}
          onRegenerateDigitalTwin={handleRegenerateDigitalTwin}
          historyEnabled={historyEnabled}
          onToggleHistoryEnabled={() => setHistoryEnabled((v) => !v)}
          onClearHistory={clearAllHistory}
          conversations={conversations}
          onShareConversation={shareConversation}
          onUnshareConversation={unshareConversation}
          onUnarchiveConversation={unarchiveConversation}
          onDeleteConversation={deleteConversation}
          onExportData={exportAllData}
          onArchiveAllConversations={archiveAllConversations}
          location={location}
          locationError={locationError}
          onRequestLocation={requestLocation}
          onClearLocation={clearLocation}
        />
      )}

      {companyDashboardOpen && (
        <CompanyDashboard
          onClose={() => setCompanyDashboardOpen(false)}
          company={company}
          onCompanyChange={setCompany}
          plan={userPlan}
          onOpenUpgradePlan={() => setUpgradePlanOpen(true)}
          companyRequests={companyRequests}
          onAddCompanyRequest={addCompanyRequest}
          onUpdateCompanyRequestStatus={updateCompanyRequestStatus}
          onRemoveCompanyRequest={removeCompanyRequest}
        />
      )}

      {comingSoonTitle && <ComingSoonModal title={comingSoonTitle} onClose={() => setComingSoonTitle(null)} />}

      {signInPromptOpen && <SignInPromptModal onClose={() => setSignInPromptOpen(false)} />}


      {celebration && <CelebrationToast message={celebration} onDone={() => setCelebration(null)} />}

      {supportOpen && (
        <SupportModal defaultEmail={authSession?.user?.email ?? undefined} onClose={() => setSupportOpen(false)} />
      )}

      {onboardingOpen && (
        <OnboardingModal
          defaultName={profile.fullName || authSession?.user?.name || ""}
          onSave={(fullName, birthDate, country) => {
            setProfile((p) => ({ ...p, fullName, birthDate, country }));
            setOnboardingDismissed(true);
            setOnboardingOpen(false);
          }}
          onSkip={() => {
            setOnboardingDismissed(true);
            setOnboardingOpen(false);
          }}
        />
      )}

      {upgradePlanOpen && (
        <UpgradePlanPanel currentTier={userPlan} onClose={() => setUpgradePlanOpen(false)} />
      )}

      {upgradeNotice && (
        <div className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-border bg-surface px-4 py-2 text-sm shadow-lg">
          {upgradeNotice}
          <button
            onClick={() => setUpgradeNotice(null)}
            className="ml-3 text-muted hover:text-foreground"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {searchOpen && (
        <SearchChatsOverlay
          conversations={signedIn ? conversations.map(({ id, title }) => ({ id, title })) : []}
          onSelect={setActiveId}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {libraryOpen && (
        <MediaLibrary
          items={libraryItems}
          onClose={() => setLibraryOpen(false)}
          onSelect={(conversationId) => {
            setActiveId(conversationId);
            setLibraryOpen(false);
          }}
          onNewChat={() => {
            setActiveId(null);
            setLibraryOpen(false);
          }}
        />
      )}

      {mediaFeedOpen && <ChatGizaMediaFeed onClose={() => setMediaFeedOpen(false)} />}

      {liveVisionOpen && <LiveVisionPanel onClose={() => setLiveVisionOpen(false)} />}

      {projectsOpen && (
        <ProjectsPanel
          projects={projects}
          conversations={conversations.map(({ id, title, projectId }) => ({ id, title, projectId }))}
          onClose={() => setProjectsOpen(false)}
          onCreateProject={createProject}
          onRenameProject={renameProject}
          onDeleteProject={deleteProject}
          onAssign={assignConversationToProject}
          onSelectConversation={(id) => {
            setActiveId(id);
            setProjectsOpen(false);
          }}
        />
      )}

      {scheduledOpen && (
        <ScheduledPanel
          tasks={scheduledTasks}
          onClose={() => setScheduledOpen(false)}
          onCreate={createScheduledTask}
          onDelete={deleteScheduledTask}
        />
      )}

      {pluginsOpen && (
        <PluginsPanel enabled={pluginsEnabled} onClose={() => setPluginsOpen(false)} onToggle={togglePlugin} />
      )}

      {codeOpen && <CodePanel onClose={() => setCodeOpen(false)} />}

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 pt-3">
          <span />
          {!active ? (
            <>
              <div className="flex items-center justify-self-center gap-1 rounded-full bg-surface-2 p-1">
                <span className="rounded-full bg-surface px-3 py-1 text-sm font-medium text-foreground shadow-sm">
                  Chat
                </span>
                <button
                  onClick={() => setComingSoonTitle("Work")}
                  className="rounded-full px-3 py-1 text-sm font-medium text-muted transition-colors hover:text-foreground"
                >
                  Work
                </button>
              </div>
              <button
                onClick={() => setActiveId(null)}
                aria-label="New chat"
                className="flex h-10 w-10 shrink-0 items-center justify-self-end rounded-full border border-border bg-surface text-xl text-muted transition-all hover:scale-105 hover:border-foreground/30 hover:text-foreground hover:shadow-md [&>svg]:mx-auto"
              >
                {NewChatBubbleIcon}
              </button>
            </>
          ) : (
            <>
              <span />
              <div className="relative flex items-center justify-self-end gap-1">
                <button
                  onClick={() => shareConversation(active.id)}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
                >
                  {TopBarShareIcon} Share
                </button>
                <button
                  onClick={() => setTopBarMenuOpen((v) => !v)}
                  aria-label="More"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  {TopBarMoreDotsIcon}
                </button>
                {topBarMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setTopBarMenuOpen(false)} />
                    <div className="absolute right-0 top-10 z-50 w-40 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg">
                      <button
                        onClick={() => {
                          const title = window.prompt("Rename conversation", active.title);
                          if (title && title.trim()) renameConversation(active.id, title.trim());
                          setTopBarMenuOpen(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-2"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => {
                          deleteConversation(active.id);
                          setTopBarMenuOpen(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-surface-2"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
        {!active ? (
          <div className="relative mx-auto flex w-full max-w-[var(--max-w-chat)] flex-1 flex-col items-center justify-end px-4 pb-3 sm:justify-center sm:pb-0">
            {signedIn && !userPlan && showUpgradeNudge && (
              <UpgradeNudgeBanner
                onUpgrade={() => {
                  setShowUpgradeNudge(false);
                  setUpgradePlanOpen(true);
                }}
                onDismiss={() => {
                  snoozeUpgradeNudge();
                  setShowUpgradeNudge(false);
                }}
              />
            )}

            {showHeroShimmer && (
              <div className="hero-shimmer-bg" onAnimationEnd={() => setShowHeroShimmer(false)} />
            )}

            <h1 className="relative z-10 text-3xl font-semibold tracking-tight">Ready when you are.</h1>

            {greeting && (
              <div className="relative z-10 mt-5 flex max-w-md items-start gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm leading-6 text-foreground shadow-sm">
                <span aria-hidden className="mt-0.5 shrink-0 text-base">
                  🔊
                </span>
                <span>{greeting}</span>
              </div>
            )}

            <div className="relative z-10 mt-8 w-full">
              <ChatComposer
                variant="hero"
                value={input}
                onValueChange={setInput}
                attachments={pendingAttachments}
                onAddFiles={handleAddFiles}
                onRemoveAttachment={handleRemoveAttachment}
                activeTool={activeTool}
                onSelectTool={setActiveTool}
                enabledTools={pluginsEnabled}
                error={attachError}
                disabled={loading}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(input, pendingAttachments);
                }}
              />
            </div>

            <div className="relative z-10 mt-4 hidden flex-wrap items-center justify-center gap-2 sm:flex">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => setInput(action.prefill)}
                  className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted hover:text-foreground hover:border-foreground/40 transition-colors"
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div
              ref={scrollRef}
              className="no-scrollbar mx-auto w-full max-w-[var(--content-width)] flex-1 overflow-y-auto px-4 py-8 space-y-4"
            >
              {active.messages.map((m) => {
                const isGeneratingMedia = m.id === generatingImageId || Boolean(m.videoStatus);
                return m.role === "assistant" && m.id === streamingId && !m.content && !m.imageUrl && !m.videoUrl ? (
                  <div key={m.id} className="flex justify-start">
                    {isGeneratingMedia ? (
                      <GeneratingMediaPlaceholder
                        kind={m.id === generatingImageId ? "image" : "video"}
                        progress={m.videoProgress}
                      />
                    ) : (
                      <div className="flex items-center gap-3 px-1 py-4">
                        <span className="typing-dots shrink-0">
                          <span />
                          <span />
                          <span />
                        </span>
                        <span className="text-sm text-muted">
                          {streamingTool === "deep_think" ? "Thinking…" : "ChatGiZa is thinking…"}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <ChatMessageBubble
                    key={m.id}
                    role={m.role}
                    content={m.content}
                    attachments={m.attachments}
                    imageUrl={m.imageUrl}
                    videoUrl={m.videoUrl}
                    isStreaming={m.id === streamingId}
                    onEdit={m.role === "user" ? (text) => handleEditMessage(m.id, text) : undefined}
                    onEditImage={m.imageUrl ? (instruction) => handleEditImage(m.imageUrl as string, instruction) : undefined}
                    onRegenerate={
                      m.role === "assistant" && !m.imageUrl && !m.videoUrl
                        ? () => handleRegenerate(m.id)
                        : undefined
                    }
                    onDelete={m.role === "assistant" ? () => handleDeleteMessage(m.id) : undefined}
                  />
                );
              })}
            </div>

            <ChatComposer
              variant="bar"
              value={input}
              onValueChange={setInput}
              attachments={pendingAttachments}
              onAddFiles={handleAddFiles}
              onRemoveAttachment={handleRemoveAttachment}
              activeTool={activeTool}
              onSelectTool={setActiveTool}
              enabledTools={pluginsEnabled}
              error={attachError}
              disabled={loading}
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input, pendingAttachments);
              }}
            />
          </>
        )}
      </div>
    </>
  );
}

export default function ChatGizaPage() {
  return (
    <Suspense>
      <ChatGizaInner />
    </Suspense>
  );
}
