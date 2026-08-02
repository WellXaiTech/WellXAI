"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import ChatSidebar from "@/components/ChatSidebar";
import ChatMessageBubble from "@/components/ChatMessageBubble";
import ChatComposer, { type ComposerTool } from "@/components/ChatComposer";
import GeneratingMediaPlaceholder from "@/components/GeneratingMediaPlaceholder";
import MediaLibrary from "@/components/MediaLibrary";
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

const STORAGE_KEY = "chatgiza:conversations";
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

const TempChatIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
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

function loadStoredConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Never let this tab's in-memory state silently delete a conversation that
// only exists because another tab (or an earlier session) wrote it to
// localStorage after this tab last read it.
function mergeConversations(stored: Conversation[], inMemory: Conversation[]): Conversation[] {
  const memoryIds = new Set(inMemory.map((c) => c.id));
  const onlyOnDisk = stored.filter((c) => !memoryIds.has(c.id));
  return [...inMemory, ...onlyOnDisk];
}

function ChatGizaInner() {
  const searchParams = useSearchParams();
  const { data: authSession, status: authStatus } = useSession();
  const signedIn = authStatus === "authenticated";
  // Starts empty on purpose (must match the server-rendered pass, which has
  // no `window`/localStorage) and gets filled in by the mount effect below —
  // reading localStorage directly in the initializer caused a hydration
  // mismatch (server saw [], client saw real data on the very first render).
  const [conversations, setConversations] = useState<Conversation[]>([]);
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
  const [streak, setStreak] = useState(0);
  const [greeting, setGreeting] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoSent = useRef(false);
  const historySyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulledHistoryFor = useRef<string | null>(null);

  useEffect(() => {
    setConversations(loadStoredConversations());
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
    setStreak(currentStreak);
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

  useEffect(() => {
    if (!historyEnabled) return;
    const merged = mergeConversations(loadStoredConversations(), conversations);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  }, [conversations, historyEnabled]);

  // Pulls this Google account's synced history once per sign-in (keyed by user
  // id so switching accounts in the same browser re-pulls) and merges it into
  // whatever's already loaded from this device's localStorage — never
  // silently drops local-only conversations the server hasn't seen yet.
  useEffect(() => {
    if (!signedIn || !historyEnabled) return;
    const userId = authSession?.user?.id;
    if (!userId || pulledHistoryFor.current === userId) return;
    pulledHistoryFor.current = userId;
    fetch("/api/history")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { conversations?: Conversation[] } | null) => {
        if (!data?.conversations) return;
        setConversations((prev) => mergeConversations(data.conversations!, prev));
      })
      .catch(() => {});
  }, [signedIn, historyEnabled, authSession?.user?.id]);

  // Pushes this device's conversations up to the account's synced storage so
  // logging into the same Google account elsewhere sees the same history.
  // Debounced since `conversations` also changes on every streamed token.
  useEffect(() => {
    if (!signedIn || !historyEnabled) return;
    if (historySyncTimer.current) clearTimeout(historySyncTimer.current);
    historySyncTimer.current = setTimeout(() => {
      fetch("/api/history", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversations }),
      }).catch(() => {});
    }, 1200);
    return () => {
      if (historySyncTimer.current) clearTimeout(historySyncTimer.current);
    };
  }, [conversations, signedIn, historyEnabled]);

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
    await signOut({ callbackUrl: "/" });
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
    setConversations([]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
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

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: trimmed };
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
          .map(({ id, title, pinned }) => ({ id, title, pinned }))}
        activeId={activeId}
        onSelect={setActiveId}
        onNewChat={() => setActiveId(null)}
        onRename={renameConversation}
        onTogglePin={togglePinConversation}
        onArchive={archiveConversation}
        onDelete={deleteConversation}
        onShare={shareConversation}
        onOpenLibrary={() => setLibraryOpen(true)}
        onOpenProjects={() => setProjectsOpen(true)}
        onOpenCode={() => setCodeOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenComingSoon={setComingSoonTitle}
        onOpenSettingsTab={openSettingsTab}
        onOpenCompanyDashboard={() => setCompanyDashboardOpen(true)}
        onOpenLanguage={() => setLanguageOpen(true)}
        onOpenUpgradePlan={() => setUpgradePlanOpen(true)}
        onOpenSupport={() => setSupportOpen(true)}
        streak={streak}
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
        <div className="flex items-center justify-end px-4 pt-3">
          <button
            onClick={() => setActiveId(null)}
            aria-label="New chat"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted transition-all hover:scale-105 hover:border-foreground/30 hover:text-foreground hover:shadow-md"
          >
            {TempChatIcon}
          </button>
        </div>
        {!active ? (
          <div className="relative mx-auto flex w-full max-w-[var(--max-w-chat)] flex-1 flex-col items-center justify-end px-4 pb-6 sm:justify-center sm:pb-0">
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

            <div className="relative z-10 mt-4 flex flex-wrap items-center justify-center gap-2">
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
