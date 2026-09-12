"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { isStandaloneApp } from "@/lib/useInstallPrompt";
import ChatSidebar from "@/components/ChatSidebar";
import ChatMessageBubble from "@/components/ChatMessageBubble";
import ChatComposer, { type ComposerTool } from "@/components/ChatComposer";
import GeneratingMediaPlaceholder from "@/components/GeneratingMediaPlaceholder";
import MediaLibrary from "@/components/MediaLibrary";
import ChatGizaMediaFeed from "@/components/ChatGizaMediaFeed";
import LiveVisionPanel from "@/components/LiveVisionPanel";
import ProjectsPanel from "@/components/ProjectsPanel";
import type { ScheduledTask } from "@/components/ScheduledPanel";
import { extractReminder } from "@/lib/reminderMarkers";
import type { SearchHit } from "@/lib/ai";
import type { PluginKey } from "@/components/PluginsPanel";
import CodePanel from "@/components/CodePanel";
import EbookLibrary, { type Ebook } from "@/components/EbookLibrary";
import EbookEditor from "@/components/EbookEditor";
import CompanyDashboard, { type CompanyRequest } from "@/components/CompanyDashboard";
import SignInPromptModal from "@/components/SignInPromptModal";
import OnboardingModal from "@/components/OnboardingModal";
import SearchChatsOverlay from "@/components/SearchChatsOverlay";
import LanguagePanel from "@/components/LanguagePanel";
import CelebrationToast from "@/components/CelebrationToast";
import { useChatGizaShell, lastActivity, type Message, type Conversation } from "@/components/ChatGizaShell";
import { recordVisitAndGetStreak, checkStreakMilestone, bumpCounterAndCheckMilestone } from "@/lib/engagement";
import { readAttachment, buildApiContent, type Attachment } from "@/lib/attachments";
import type { ChatContentPart, HistoryIndexEntry } from "@/lib/ai";
import { newPairId, extractQId, findReferencedPair } from "@/lib/qid";

type SendOverride = { conversationId: string; baseMessages: Message[] };

const GUEST_MESSAGE_COUNT_KEY = "chatgiza:guest-message-count";
const GUEST_FREE_MESSAGES = 1;
const ONBOARDING_DISMISSED_KEY = "chatgiza:onboarding-dismissed";

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
// Shown next to a project-owned chat's breadcrumb, matching the reference's
// own device icon there.
const ProjectChatDeviceIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <line x1="8" x2="16" y1="21" y2="21" />
    <line x1="12" x2="12" y1="17" y2="21" />
  </svg>
);

// Icons for the project-chat breadcrumb's chevron menu.
const ChatChevronDownIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const ChatChevronRightIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
);
const ScheduleIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);
const SkillIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
    <path d="M20 2v4" />
    <path d="M22 4h-4" />
    <circle cx="4" cy="20" r="2" />
  </svg>
);
const CopyIdIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);
const ChatPinIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 17v5" />
    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
  </svg>
);
const ChatPencilIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
    <path d="m15 5 4 4" />
  </svg>
);
const RemoveFromProjectIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 13h6" />
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  </svg>
);
const ChatArchiveIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="5" x="2" y="3" rx="1" />
    <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
    <path d="M10 12h4" />
  </svg>
);
const ChatTrashIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
// Replaces the old "Share" text button next to a project chat's breadcrumb
// -- matches the reference's icon-only pair (share/public + panel toggle).
const TopBarGlobeIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);
const TopBarPanelIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M15 3v18" />
  </svg>
);
const TaskPanelChevronIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
);
const TaskPanelCheckIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="m16 9-5.5 5.5L8 12" />
  </svg>
);
const TaskPanelOutputsIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </svg>
);
const TaskPanelContextIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
    <path d="M14 2v5a1 1 0 0 0 1 1h5" />
    <path d="M10 9H8" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
  </svg>
);
const BrowseCloseIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);
const BrowseGlobeBigIcon = (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
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

// "YYYY-MM-DDTHH:mm", naive local time, no timezone offset -- same format
// ScheduledPanel's own datetime-local input already uses, and what
// Personalization.localDateTime is documented to expect.
function toLocalDateTimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// A conversation was previously sent to /api/chat in full, forever --
// every message, every attached image's full base64 data URL, on every
// single request, with no cap of any kind (unlike extractMemoryCandidates/
// synthesizeDigitalTwin elsewhere, which both already slice(-N)). A long
// conversation with a handful of attached images eventually hits the
// model's context limit and just fails with a generic error. Bounding
// message count keeps normal conversations completely unaffected (both
// numbers are well above any typical chat) while giving a genuinely long
// one somewhere to land instead of hard-failing; keeping only the most
// recent attachments' real image data (older ones become a plain text
// note instead) targets the actual dominant cost -- resent image bytes --
// without silently making the model forget an image was ever discussed.
const MAX_HISTORY_MESSAGES = 40;
const MAX_MESSAGES_WITH_FULL_ATTACHMENTS = 6;

function buildApiMessages(updatedMessages: Message[]): Array<{ role: Message["role"]; content: string | ChatContentPart[] }> {
  const trimmed = updatedMessages.slice(-MAX_HISTORY_MESSAGES);
  const cutoffIndex = trimmed.length - MAX_MESSAGES_WITH_FULL_ATTACHMENTS;
  return trimmed.map((m, i) => {
    if (!m.attachments?.length) return { role: m.role, content: m.content };
    if (i >= cutoffIndex) return { role: m.role, content: buildApiContent(m.content, m.attachments) };
    const names = m.attachments.map((a) => a.name).join(", ");
    return { role: m.role, content: `${m.content}\n\n[Earlier attachment(s) not re-sent: ${names}]` };
  });
}

// The system prompt already tells the model it can answer "how many
// chats do I have" / reference past topics by name from a lightweight
// index of the user's OTHER saved conversations -- but no caller ever
// actually built or sent one, so that capability claim was completely
// unreachable (the model could only guess or refuse). Capped (40,
// matching the native Android app's own buildHistoryIndex) and sorted
// by real recency (lastActivity, from real message timestamps) so this
// stays cheap and always reflects what's actually most relevant, not an
// arbitrary slice.
const MAX_HISTORY_INDEX_ENTRIES = 40;

function buildHistoryIndex(conversations: Conversation[], excludeId: string | null): HistoryIndexEntry[] {
  return conversations
    .filter((c) => c.id !== excludeId && !c.archived && c.messages.length > 0)
    .sort((a, b) => lastActivity(b) - lastActivity(a))
    .slice(0, MAX_HISTORY_INDEX_ENTRIES)
    .map((c) => {
      const firstUser = c.messages.find((m) => m.role === "user" && m.content.trim());
      const snippet = (firstUser?.content ?? c.messages[0]?.content ?? "").trim().slice(0, 120);
      return { title: c.title, snippet };
    });
}

function ChatGizaInner() {
  const searchParams = useSearchParams();
  const { data: authSession, status: authStatus } = useSession();
  const signedIn = authStatus === "authenticated";

  const shell = useChatGizaShell();
  const {
    conversations,
    setConversations,
    syncHistoryNow,
    setGenerating,
    librarySignal,
    projectsSignal,
    activeId,
    setActiveId,
    temporaryMode,
    setTemporaryMode,
    shareConversation,
    deleteConversation,
    profile,
    setProfile,
    memoryEnabled,
    memory,
    language,
    setLanguage,
    digitalTwin,
    company,
    setCompany,
    companyRequests,
    setCompanyRequests,
    projects,
    setProjects,
    setDeletedProjectIds,
    pluginsEnabled,
    scheduledTasks,
    setScheduledTasks,
    createScheduledTask,
    setScheduledOpen,
    setPluginsOpen,
    setSupportOpen,
    setComingSoonTitle,
    location,
    notifyOnComplete,
    notifyImageGen,
    allNotificationsEnabled,
    openSettingsTab,
  } = shell;

  // Only true once mounted, running as the installed desktop app -- swaps
  // the top bar's Chat/Work pill + conversation Share/More controls for a
  // simple Home/Code switch, since that's the app's whole navigation now.
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    setStandalone(isStandaloneApp());
  }, []);
  const [input, setInput] = useState("");
  const [showHeroShimmer, setShowHeroShimmer] = useState(true);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ComposerTool>(null);
  const [loading, setLoading] = useState(false);
  const [canStop, setCanStop] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [mediaFeedOpen, setMediaFeedOpen] = useState(false);
  // How much space the docked Quantara panel actually occupies right now --
  // reported live by ChatGizaMediaFeed itself (0 while it's not docked, e.g.
  // full-screen expanded or below its dock breakpoint) so the chat column's
  // margin below always matches its real, user-resized width instead of a
  // fixed guess.
  const [quantaraWidth, setQuantaraWidth] = useState(0);
  const [ebookView, setEbookView] = useState<{ type: "library" } | { type: "editor"; id: string } | null>(null);
  const [liveVisionOpen, setLiveVisionOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  // "Library"/"Projects" moved from the sidebar into Settings, which is
  // rendered up in ChatGizaShell -- these modals stay owned here (their
  // content is tied to page-local data), so librarySignal/projectsSignal
  // are just "something changed" counters from the shell that this
  // reacts to, opening the real local modal state. Refs, not the signal
  // values themselves, gate this -- only an actual increase (a genuine
  // new request) should open something, not the initial mount value.
  const lastLibrarySignal = useRef(librarySignal);
  const lastProjectsSignal = useRef(projectsSignal);
  useEffect(() => {
    if (librarySignal !== lastLibrarySignal.current) {
      lastLibrarySignal.current = librarySignal;
      setLibraryOpen(true);
    }
  }, [librarySignal]);
  useEffect(() => {
    if (projectsSignal !== lastProjectsSignal.current) {
      lastProjectsSignal.current = projectsSignal;
      setProjectsOpen(true);
    }
  }, [projectsSignal]);
  const [codeOpen, setCodeOpen] = useState(false);
  const [companyDashboardOpen, setCompanyDashboardOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [guestMessageCount, setGuestMessageCount] = useState(0);
  const [signInPromptOpen, setSignInPromptOpen] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(true);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [celebration, setCelebration] = useState<string | null>(null);
  // The chevron next to a project chat's breadcrumb.
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [changeProjectOpen, setChangeProjectOpen] = useState(false);
  // The docked "Progress / Outputs / Context" panel from the top-right
  // panel-toggle icon -- each row expands independently, collapsed by
  // default, matching the reference exactly (informational only, same as
  // this app's own Instructions/Memory/Context cards elsewhere).
  const [taskPanelOpen, setTaskPanelOpen] = useState(false);
  const [progressExpanded, setProgressExpanded] = useState(false);
  const [outputsExpanded, setOutputsExpanded] = useState(false);
  const [contextExpanded, setContextExpanded] = useState(false);
  // The globe icon's "Browse" panel -- a plain iframe, not a real
  // Claude-style browser agent (ChatGiZa has no backend that reads/clicks/
  // types on a page), so it only works for sites that allow being framed;
  // most real-world sites (Google, banks, etc.) block this via
  // X-Frame-Options/CSP and will just show blank, which is a browser
  // security limit, not something this code can work around.
  const [browsePanelOpen, setBrowsePanelOpen] = useState(false);
  const [browseInput, setBrowseInput] = useState("");
  const [browseUrl, setBrowseUrl] = useState("");
  // Plain text (no dot/no http prefix) is treated as a search query instead
  // of a URL -- run through Tavily server-side (real results) rather than
  // trying to iframe a search engine's own results page, which blocks
  // embedding just like every other major site.
  const [browseSearchResults, setBrowseSearchResults] = useState<SearchHit[] | null>(null);
  const [browseSearchLoading, setBrowseSearchLoading] = useState(false);
  // A real screenshot (via Browserless) of whatever URL is loaded, not an
  // iframe -- iframing gets silently blocked by most real sites'
  // X-Frame-Options/CSP, while a server-rendered screenshot always works
  // since the target site never even knows it's being framed.
  const [browseScreenshotLoaded, setBrowseScreenshotLoaded] = useState(false);
  const [browseScreenshotError, setBrowseScreenshotError] = useState(false);
  // Wider default, and draggable from its left edge (clamped so it can
  // never swallow the whole screen or shrink past being usable).
  const [browseWidth, setBrowseWidth] = useState(640);
  const browseResizing = useRef(false);
  useEffect(() => {
    setChatMenuOpen(false);
    setChangeProjectOpen(false);
    setTaskPanelOpen(false);
    setBrowsePanelOpen(false);
    setBrowseSearchResults(null);
    setBrowseScreenshotLoaded(false);
    setBrowseScreenshotError(false);
  }, [activeId]);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!browseResizing.current) return;
      const next = window.innerWidth - e.clientX;
      // Firm floor and ceiling: the chat/composer side always keeps at
      // least 380px so it never looks cramped, and the panel itself never
      // grows past 1000px even on a very wide monitor -- the drag simply
      // stops there instead of continuing to follow the cursor.
      const maxWidth = Math.min(window.innerWidth - 380, 1150);
      setBrowseWidth(Math.min(Math.max(next, 320), maxWidth));
    }
    function handleMouseUp() {
      browseResizing.current = false;
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);
  const [activeNavMessageId, setActiveNavMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const autoSent = useRef(false);
  const openedConversationParam = useRef(false);

  useEffect(() => {
    // One-time hydration from browser storage after mount -- can't run during
    // SSR/the initial render, so this can't be a lazy useState initializer.
    // The rest of the shared account/settings state hydrates itself the same
    // way inside ChatGizaShell.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGuestMessageCount(loadJson(GUEST_MESSAGE_COUNT_KEY, 0));
    setOnboardingDismissed(loadJson(ONBOARDING_DISMISSED_KEY, false));

    const currentStreak = recordVisitAndGetStreak();
    const streakMessage = checkStreakMilestone(currentStreak);
    if (streakMessage) setCelebration(streakMessage);
  }, []);

  useEffect(() => {
    localStorage.setItem(GUEST_MESSAGE_COUNT_KEY, JSON.stringify(guestMessageCount));
  }, [guestMessageCount]);

  useEffect(() => {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, JSON.stringify(onboardingDismissed));
  }, [onboardingDismissed]);

  useEffect(() => {
    // Gated on the account's server-tracked `isNewAccount` flag (set once,
    // the very first time this Google account ever signs in) rather than
    // "no local profile data" -- the old check re-asked existing users for
    // their birth date/country every time they opened ChatGiZa on a new
    // device or browser, since that profile data only ever lived in
    // localStorage. Existing accounts now never see this again, anywhere.
    if (signedIn && authSession?.user?.isNewAccount && !onboardingDismissed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOnboardingOpen(true);
    }
  }, [signedIn, authSession?.user?.isNewAccount, onboardingDismissed]);

  const scheduledTasksRef = useRef<ScheduledTask[]>([]);
  useEffect(() => {
    scheduledTasksRef.current = scheduledTasks;
  }, [scheduledTasks]);

  // Always points at the latest render's sendChatMessage (closed over current
  // profile/memory state) so the scheduled-task interval below -- whose effect
  // only runs once on mount -- never sends with stale personalization data.
  const sendChatMessageRef = useRef<typeof sendChatMessage>(() => Promise.resolve());

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

  // Right-edge conversation navigator: one marker per message (both user
  // and assistant), evenly spaced down a fixed track. Whichever message is
  // closest to the vertical center of the scroll container is "active" --
  // recomputed on every scroll (rAF-throttled) and once up front so it's
  // correct before the user scrolls at all.
  useEffect(() => {
    const container = scrollRef.current;
    const msgs = active?.messages ?? [];
    if (!container || msgs.length === 0) return;

    let ticking = false;
    const updateActiveFromScroll = () => {
      ticking = false;
      const containerRect = container.getBoundingClientRect();
      const center = containerRect.top + containerRect.height / 2;
      let closestId = msgs[0].id;
      let closestDistance = Infinity;
      for (const m of msgs) {
        const el = document.getElementById(`msg-${m.id}`);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height / 2 - center);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestId = m.id;
        }
      }
      setActiveNavMessageId(closestId);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateActiveFromScroll);
    };

    updateActiveFromScroll();
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [active?.id, active?.messages]);

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

  function startConversation(userMessage: Message, fallbackTitle: string, override?: SendOverride, pairId?: string) {
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
            {
              id: conversationId,
              title: truncateTitle(fallbackTitle),
              messages: updatedMessages,
              ...(pendingProjectId ? { projectId: pendingProjectId } : {}),
              ...(temporaryMode ? { temporary: true as const } : {}),
            },
            ...prev,
          ]
        : prev.map((c) => (c.id === conversationId ? { ...c, messages: updatedMessages } : c))
    );
    setActiveId(conversationId);
    if (isNew && pendingProjectId) setPendingProjectId(null);

    const assistantId = crypto.randomUUID();
    setStreamingId(assistantId);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, { id: assistantId, role: "assistant", content: "", createdAt: Date.now(), pairId }] }
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

  // Kept below handleSend's declaration so it's not referenced before defined.
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !autoSent.current) {
      autoSent.current = true;
      handleSend(q, []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Supports "Open in > New Window" -- opens this exact conversation in a
  // fresh tab via ?c=<id>. Waits for conversations to finish loading (from
  // localStorage/KV) before applying, since the id won't be found yet on the
  // very first render.
  useEffect(() => {
    if (openedConversationParam.current) return;
    const c = searchParams.get("c");
    if (!c) return;
    if (conversations.some((conv) => conv.id === c)) {
      openedConversationParam.current = true;
      setActiveId(c);
    }
  }, [searchParams, conversations, setActiveId]);

  // Lets an outside link (e.g. the Quantara card on wellxai.world's
  // Products page) deep-link straight into the Quantara media feed via
  // ?open=media, instead of landing on plain chat and making people find
  // it themselves in the sidebar.
  useEffect(() => {
    if (searchParams.get("open") === "media") setMediaFeedOpen(true);
  }, [searchParams]);

  // Quantara's open/closed state is remembered per-device -- a refresh
  // shouldn't silently close it out from under you; only the panel's own
  // close button should. Starts closed on every render (SSR-safe) and
  // reopens right after mount if it was left open, same pattern as
  // quantaraDark inside ChatGizaMediaFeed itself.
  useEffect(() => {
    if (localStorage.getItem("chatgiza:quantara-open") === "true") setMediaFeedOpen(true);
  }, []);
  useEffect(() => {
    localStorage.setItem("chatgiza:quantara-open", String(mediaFeedOpen));
  }, [mediaFeedOpen]);

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
    setGenerating(true);

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
      setGenerating(false);
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
    setGenerating(true);

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
      setGenerating(false);
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

    // If the user mentions a Q-ID ("Q-4F2A19") from any saved
    // conversation, no matter how old, look up the real exchange it
    // refers to so the model gets exact ground truth instead of a
    // guess at what that ID might mean. Checks the current (possibly
    // not yet saved) conversation's live messages first, then every
    // saved conversation -- same order as the Android app's own
    // findReferencedPair.
    const mentionedQid = extractQId(trimmed);
    const referencedPair = mentionedQid ? findReferencedPair(mentionedQid, active?.messages ?? [], conversations) : undefined;

    setInput("");
    setPendingAttachments([]);
    setAttachError(null);
    // Deep Think is a standing mode, not a one-shot action -- stays selected
    // across messages until the user explicitly switches back to GiZa 5.6
    // themselves, instead of silently reverting after every single reply.
    if (tool !== "deep_think") setActiveTool(null);
    setLoading(true);
    setGenerating(true);

    // Shared by this message and its reply -- generated once here so
    // both sides carry the exact same value, matching the native
    // Android app's own pairId scheme exactly (see src/lib/qid.ts).
    const pairId = newPairId();
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      attachments: attachments.length > 0 ? attachments : undefined,
      createdAt: Date.now(),
      pairId,
    };
    const { conversationId, assistantId, updatedMessages } = startConversation(
      userMessage,
      trimmed || attachments[0]?.name || "New chat",
      override,
      pairId
    );
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setCanStop(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          tool,
          conversationId,
          messages: buildApiMessages(updatedMessages),
          profile,
          memory: memoryEnabled ? memory : [],
          language,
          location,
          company,
          digitalTwin,
          // Naive local time, "YYYY-MM-DDTHH:mm" -- lets the model resolve
          // relative time references ("kesho", "at 6pm") into an absolute
          // timestamp. Without this the reminder feature can only ever
          // guess, since it's explicitly told never to guess a date/time
          // it wasn't given.
          localDateTime: toLocalDateTimeString(new Date()),
          historyIndex: buildHistoryIndex(conversations, activeId),
          referencedPair,
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Sorry, something went wrong. Please try again.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let flushScheduled = false;
      let stopped = false;

      function scheduleFlush() {
        if (flushScheduled) return;
        flushScheduled = true;
        requestAnimationFrame(() => {
          flushScheduled = false;
          updateAssistantMessage(conversationId, assistantId, { content: accumulated });
        });
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          scheduleFlush();
        }
      } catch (streamErr) {
        if (streamErr instanceof DOMException && streamErr.name === "AbortError") {
          stopped = true;
        } else {
          throw streamErr;
        }
      }
      // Final flush in case the last chunk arrived after the last scheduled frame.
      updateAssistantMessage(conversationId, assistantId, { content: accumulated });
      if (stopped) return;

      // The reply is confirmed fully done -- push it to the server right
      // now rather than waiting for the debounced auto-save. Checking a
      // different device (the Android app) within that debounce window
      // would otherwise show the conversation with the user's own
      // message but the just-finished reply still missing, since the
      // server hadn't received it yet.
      syncHistoryNow();

      // A finished reply may have asked to set a real reminder -- this is
      // the one place that side effect actually happens, exactly once per
      // completed reply (never mid-stream, and never on a stopped/aborted
      // one). The marker itself is stripped from what's rendered wherever
      // this message is displayed (see ChatMessageBubble).
      const reminder = extractReminder(accumulated);
      if (reminder) {
        createScheduledTask(reminder.prompt, reminder.runAt);
      }
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
      if (e instanceof DOMException && e.name === "AbortError") {
        return;
      }
      const message = e instanceof Error ? e.message : "Sorry, something went wrong. Please try again.";
      updateAssistantMessage(conversationId, assistantId, { content: message });
    } finally {
      abortControllerRef.current = null;
      setCanStop(false);
      setLoading(false);
      setGenerating(false);
      setStreamingId(null);
    }
  }

  // Kept below sendChatMessage's declaration so the ref always closes over
  // the latest render's function.
  useEffect(() => {
    sendChatMessageRef.current = sendChatMessage;
  });

  function handleStopGenerating() {
    abortControllerRef.current?.abort();
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

  function createProject(id: string, name: string, description?: string) {
    // Pinned by default -- a project you just deliberately named and
    // created (via CreateProjectModal's "+") should show up in the
    // sidebar right away, not disappear into "Pin projects to keep them
    // here" until you go find it and pin it yourself.
    setProjects((prev) => [
      ...prev,
      { id, name, createdAt: Date.now(), pinned: true, description: description || undefined },
    ]);
  }

  function togglePinProject(id: string) {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, pinned: !p.pinned } : p)));
  }

  // Set when a pinned project row in the sidebar is clicked -- tells
  // ProjectsPanel to open straight into that project's detail view
  // instead of the grid of all projects.
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  // Set by startChatInProject and consumed the next time startConversation
  // creates a brand-new conversation -- lets that conversation carry the
  // project's id and a real (message-derived) title instead of pre-seeding
  // an empty "New chat" placeholder that never gets renamed.
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  // Which project's nested chat list shows expanded in the sidebar. Sticky
  // on purpose -- switching to "New chat" or some unrelated chat doesn't
  // touch it, only opening a different project (or one of ITS chats) does,
  // so the sidebar doesn't fold shut just because you glanced elsewhere.
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  function openProject(id: string) {
    setOpenProjectId(id);
    setProjectsOpen(true);
    // Clicking the already-current project again is the only way to fold
    // its sidebar list back up (besides opening a different one) -- it
    // still opens/stays on the project's own page either way.
    setCurrentProjectId((prev) => (prev === id ? null : id));
  }

  // Selecting one of a project's own chats should mark that project current
  // too -- landing on any other chat (or "New chat") leaves currentProjectId
  // alone, since only opening a project (or a chat inside one) should ever
  // change which one shows expanded.
  useEffect(() => {
    const projectId = conversations.find((c) => c.id === activeId)?.projectId;
    if (projectId) setCurrentProjectId(projectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  // Opened from inside a project (ProjectsPanel's own composer, the
  // reference's "How can I help you today?" box) -- pre-seeds an empty
  // conversation already assigned to the project (so startConversation's
  // own new-vs-existing check finds it and just appends to it, never
  // touching projectId) rather than routing the actual send through a
  // second copy of the send pipeline. Handing off to the real composer
  // with the draft carried over keeps every model/attachment/voice
  // feature it already has, instead of rebuilding a slice of it here.
  function startChatInProject(projectId: string, initialText: string) {
    // Doesn't create the conversation itself -- just marks the project so
    // the real one, with a real title, gets created the moment the user
    // actually sends (see pendingProjectId / startConversation). Creating
    // an empty placeholder here left it stuck on "New chat" forever, since
    // startConversation's rename-on-first-message path only runs for
    // conversations that don't already exist.
    setActiveId(null);
    setPendingProjectId(projectId);
    if (initialText.trim()) setInput(initialText);
    setProjectsOpen(false);
  }

  function renameProject(id: string, name: string) {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  }

  function deleteProject(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setDeletedProjectIds((prev) => ({ ...prev, [id]: Date.now() }));
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

  const libraryItems = !signedIn ? [] : conversations.flatMap((c: Conversation) =>
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
        // Always the icon toolbar (menu/panel/search/back/forward), same as
        // Code's rail -- used to only show this in installed-PWA mode and
        // fall back to the "ChatGiZa" wordmark in a normal browser tab,
        // which is why Home's header looked different from Code's.
        hideWordmark
        conversations={conversations
          .filter((c) => !c.archived)
          .map((c) => ({ id: c.id, title: c.title, pinned: c.pinned, updatedAt: lastActivity(c), projectId: c.projectId }))}
        activeId={activeId}
        streamingId={streamingId}
        // Which project's nested chat list should show expanded in the
        // sidebar -- sticky (see currentProjectId's own declaration) so
        // switching to "New chat" or an unrelated chat doesn't fold it.
        currentProjectId={currentProjectId}
        onSelect={(id) => {
          setActiveId(id);
          setProjectsOpen(false);
          setOpenProjectId(null);
          setPendingProjectId(null);
          setEbookView(null);
        }}
        onNewChat={() => {
          setActiveId(null);
          setProjectsOpen(false);
          setOpenProjectId(null);
          setPendingProjectId(null);
          setEbookView(null);
        }}
        onRename={renameConversation}
        onTogglePin={togglePinConversation}
        onArchive={archiveConversation}
        onDelete={deleteConversation}
        onShare={shareConversation}
        onOpenLibrary={() => setLibraryOpen(true)}
        onOpenEbook={() => setEbookView({ type: "library" })}
        onOpenLiveVision={() => setLiveVisionOpen(true)}
        onOpenCode={() => setCodeOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenComingSoon={setComingSoonTitle}
        onOpenSettingsTab={openSettingsTab}
        onOpenCompanyDashboard={() => setCompanyDashboardOpen(true)}
        onOpenLanguage={() => setLanguageOpen(true)}
        onOpenSupport={() => window.open("https://support.wellxai.world", "_blank", "noopener,noreferrer")}
        onOpenScheduled={() => setScheduledOpen(true)}
        onOpenProjects={() => {
          setOpenProjectId(null);
          setProjectsOpen(true);
        }}
        onOpenProject={openProject}
        onCreateProject={createProject}
        onRenameProject={renameProject}
        onDeleteProject={deleteProject}
        onTogglePinProject={togglePinProject}
        projects={projects.map(({ id, name, pinned }) => ({ id, name, pinned }))}
        onMoveToProject={assignConversationToProject}
      />

      {languageOpen && (
        <LanguagePanel language={language} onSelect={setLanguage} onClose={() => setLanguageOpen(false)} />
      )}

      {companyDashboardOpen && (
        <CompanyDashboard
          onClose={() => setCompanyDashboardOpen(false)}
          company={company}
          onCompanyChange={setCompany}
          companyRequests={companyRequests}
          onAddCompanyRequest={addCompanyRequest}
          onUpdateCompanyRequestStatus={updateCompanyRequestStatus}
          onRemoveCompanyRequest={removeCompanyRequest}
        />
      )}

      {signInPromptOpen && <SignInPromptModal onClose={() => setSignInPromptOpen(false)} />}

      {celebration && <CelebrationToast message={celebration} onDone={() => setCelebration(null)} />}

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

      {mediaFeedOpen && (
        <ChatGizaMediaFeed onWidthChange={setQuantaraWidth} />
      )}

      {liveVisionOpen && <LiveVisionPanel onClose={() => setLiveVisionOpen(false)} />}

      {projectsOpen && (
        <ProjectsPanel
          key={openProjectId ?? "overview"}
          projects={projects}
          conversations={conversations.map(({ id, title, projectId }) => ({ id, title, projectId }))}
          onClose={() => {
            setProjectsOpen(false);
            setOpenProjectId(null);
            setPendingProjectId(null);
          }}
          onCreateProject={createProject}
          onRenameProject={renameProject}
          onDeleteProject={deleteProject}
          onTogglePinProject={togglePinProject}
          onAssign={assignConversationToProject}
          onStartChatInProject={startChatInProject}
          onOpenComingSoon={setComingSoonTitle}
          initialProjectId={openProjectId}
          onSelectConversation={(id) => {
            setActiveId(id);
            setProjectsOpen(false);
            setOpenProjectId(null);
            setPendingProjectId(null);
          }}
        />
      )}

      {codeOpen && <CodePanel onClose={() => setCodeOpen(false)} />}

      {/* Full-screen, same as Media/Projects/Code above -- previously this
          only replaced the chat column so the sidebar stayed usable
          alongside it, but that read as a smaller, half-attached panel
          rather than its own real space; matching the other tools' full
          takeover reads as more deliberate/polished. */}
      {ebookView && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          {ebookView.type === "library" ? (
            <EbookLibrary
              onOpenBook={(book: Ebook) => setEbookView({ type: "editor", id: book.id })}
              onClose={() => setEbookView(null)}
            />
          ) : (
            <EbookEditor ebookId={ebookView.id} onBack={() => setEbookView({ type: "library" })} />
          )}
        </div>
      )}

      <div
        className="relative flex flex-1 flex-col overflow-hidden transition-[margin] duration-300"
        // Opening Browse, the Task panel, or Quantara shrinks this column by
        // that panel's own current width (plus its edge gap, where it has
        // one) instead of letting the fixed-position panel just float on top
        // and cover the composer -- closing it (or dragging it narrower)
        // gives that space back. Quantara reports 0 while it isn't actually
        // docked (full-screen expanded, or below its own dock breakpoint),
        // so no margin is added in those cases.
        style={
          browsePanelOpen
            ? { marginRight: browseWidth + 8 }
            : taskPanelOpen
              ? { marginRight: 340 }
              : mediaFeedOpen && quantaraWidth
                ? { marginRight: quantaraWidth }
                : undefined
        }
      >
        {!standalone && (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 pt-6">
          {/* Matches the reference's own "Project / chat" breadcrumb --
              left-aligned next to the sidebar, not centered across the
              whole width, and only for a chat that belongs to a project
              (a regular chat's first column stays an empty span). */}
          {active?.projectId ? (
            <div className="relative flex min-w-0 items-center gap-0.5 justify-self-start">
              <button
                onClick={() => openProject(active.projectId as string)}
                className="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium transition-colors hover:text-foreground"
              >
                <span className="text-blue-500">{ProjectChatDeviceIcon}</span>
                <span className="truncate text-muted">
                  {projects.find((p) => p.id === active.projectId)?.name ?? "Project"}
                </span>
                <span className="text-muted">/</span>
                <span className="truncate text-foreground">{active.title}</span>
              </button>
              <button
                onClick={() => setChatMenuOpen((v) => !v)}
                aria-label="Chat options"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                {ChatChevronDownIcon}
              </button>
              {chatMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => {
                      setChatMenuOpen(false);
                      setChangeProjectOpen(false);
                    }}
                  />
                  <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-2xl border border-border bg-surface p-1.5 shadow-lg">
                    <button onClick={() => setComingSoonTitle("Schedule")} className="menu-item">
                      <span className="icon">{ScheduleIcon}</span>
                      <span className="flex-1 truncate">Schedule</span>
                    </button>
                    <button onClick={() => setComingSoonTitle("Turn into skill")} className="menu-item">
                      <span className="icon">{SkillIcon}</span>
                      <span className="flex-1 truncate">Turn into skill</span>
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(active.id);
                        setChatMenuOpen(false);
                      }}
                      className="menu-item"
                    >
                      <span className="icon">{CopyIdIcon}</span>
                      <span className="flex-1 truncate">Copy session ID</span>
                    </button>
                    <div className="my-1 border-t border-border" />
                    <button
                      onClick={() => {
                        togglePinConversation(active.id);
                        setChatMenuOpen(false);
                      }}
                      className="menu-item"
                    >
                      <span className="icon">{ChatPinIcon}</span>
                      <span className="flex-1 truncate">{active.pinned ? "Unpin" : "Pin"}</span>
                    </button>
                    <button
                      onClick={() => {
                        const title = window.prompt("Rename conversation", active.title);
                        if (title && title.trim()) renameConversation(active.id, title.trim());
                        setChatMenuOpen(false);
                      }}
                      className="menu-item"
                    >
                      <span className="icon">{ChatPencilIcon}</span>
                      <span className="flex-1 truncate">Rename</span>
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setChangeProjectOpen((v) => !v)}
                        className="menu-item"
                      >
                        <span className="icon">{ProjectChatDeviceIcon}</span>
                        <span className="flex-1 truncate">Change project</span>
                        <span className="text-muted">{ChatChevronRightIcon}</span>
                      </button>
                      {changeProjectOpen && (
                        <div className="absolute left-full top-0 z-50 ml-1 w-52 overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-lg">
                          {projects.length === 0 ? (
                            <p className="px-3 py-2 text-xs text-muted">No projects yet</p>
                          ) : (
                            projects
                              .filter((p) => p.id !== active.projectId)
                              .map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => {
                                    assignConversationToProject(active.id, p.id);
                                    setChatMenuOpen(false);
                                    setChangeProjectOpen(false);
                                  }}
                                  className="menu-item"
                                >
                                  <span className="flex-1 truncate">{p.name}</span>
                                </button>
                              ))
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        assignConversationToProject(active.id, null);
                        setChatMenuOpen(false);
                      }}
                      className="menu-item"
                    >
                      <span className="icon">{RemoveFromProjectIcon}</span>
                      <span className="flex-1 truncate">Remove from project</span>
                    </button>
                    <div className="my-1 border-t border-border" />
                    <button
                      onClick={() => {
                        archiveConversation(active.id);
                        setChatMenuOpen(false);
                      }}
                      className="menu-item"
                    >
                      <span className="icon">{ChatArchiveIcon}</span>
                      <span className="flex-1 truncate">Archive</span>
                    </button>
                    <button
                      onClick={() => {
                        deleteConversation(active.id);
                        setChatMenuOpen(false);
                      }}
                      className="menu-item delete"
                    >
                      <span className="icon">{ChatTrashIcon}</span>
                      <span className="flex-1 truncate">Delete</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <span />
          )}
          {!active ? (
            <>
              <div className="flex items-center justify-self-center gap-1 rounded-full bg-[#212121] p-1">
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
                onClick={() => setTemporaryMode((v) => !v)}
                aria-label={temporaryMode ? "Turn off Temporary Chat" : "Turn on Temporary Chat"}
                aria-pressed={temporaryMode}
                title={temporaryMode ? "Temporary Chat is on" : "Temporary Chat"}
                className={`flex h-10 w-10 shrink-0 items-center justify-self-end rounded-full border text-xl transition-all hover:scale-105 [&>svg]:mx-auto ${
                  temporaryMode
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-surface text-muted hover:border-foreground/30 hover:text-foreground hover:shadow-md"
                }`}
              >
                {NewChatBubbleIcon}
              </button>
            </>
          ) : (
            <>
              <span />
              <div className="relative z-40 flex items-center justify-self-end gap-1">
                <button
                  onClick={() =>
                    setBrowsePanelOpen((v) => {
                      const next = !v;
                      if (next) setTaskPanelOpen(false);
                      return next;
                    })
                  }
                  aria-label="Browse"
                  aria-pressed={browsePanelOpen}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    browsePanelOpen ? "bg-blue-500 text-white" : "text-muted hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  {TopBarGlobeIcon}
                </button>
                <button
                  onClick={() =>
                    setTaskPanelOpen((v) => {
                      const next = !v;
                      if (next) setBrowsePanelOpen(false);
                      return next;
                    })
                  }
                  aria-label="Toggle panel"
                  aria-pressed={taskPanelOpen}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    taskPanelOpen ? "bg-surface-2 text-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  {TopBarPanelIcon}
                </button>
              </div>
            </>
          )}
        </div>
        )}

        {taskPanelOpen && active && (
          <div className="fixed right-3 top-3 z-30 w-80 p-0">
            {/* One continuous panel (single border/background) instead of
                three separate boxes -- matches the merged-card treatment
                already used for ProjectsPanel's own Instructions/Memory/
                Context/Automations cards. */}
            <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
              <div>
                <button
                  onClick={() => setProgressExpanded((v) => !v)}
                  className="flex w-full items-center gap-1.5 px-3 py-2.5 text-left text-sm font-semibold"
                >
                  Progress
                  <span className={`text-muted transition-transform ${progressExpanded ? "rotate-90" : ""}`}>
                    {TaskPanelChevronIcon}
                  </span>
                </button>
                {progressExpanded && (
                  <div className="px-3 py-3">
                    <div className="flex items-center gap-1.5 text-muted">
                      {TaskPanelCheckIcon}
                      <span className="h-px w-3 bg-border" />
                      {TaskPanelCheckIcon}
                      <span className="h-px w-3 bg-border" />
                      <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-border" />
                    </div>
                    <p className="mt-2 text-xs text-muted">See task progress for longer tasks.</p>
                  </div>
                )}
              </div>

              <div>
                <button
                  onClick={() => setOutputsExpanded((v) => !v)}
                  className="flex w-full items-center gap-1.5 px-3 py-2.5 text-left text-sm font-semibold"
                >
                  Outputs
                  <span className={`text-muted transition-transform ${outputsExpanded ? "rotate-90" : ""}`}>
                    {TaskPanelChevronIcon}
                  </span>
                </button>
                {outputsExpanded && (
                  <div className="px-3 py-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted">
                      {TaskPanelOutputsIcon}
                    </span>
                    <p className="mt-2 text-xs text-muted">View and open files created during this task.</p>
                  </div>
                )}
              </div>

              <div>
                <button
                  onClick={() => setContextExpanded((v) => !v)}
                  className="flex w-full items-center gap-1.5 px-3 py-2.5 text-left text-sm font-semibold"
                >
                  Context
                  <span className={`text-muted transition-transform ${contextExpanded ? "rotate-90" : ""}`}>
                    {TaskPanelChevronIcon}
                  </span>
                </button>
                {contextExpanded && (
                  <div className="px-3 py-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted">
                      {TaskPanelContextIcon}
                    </span>
                    <p className="mt-2 text-xs text-muted">Track tools and referenced files used in this task.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {browsePanelOpen && (
          <div
            className="fixed right-0 top-0 bottom-3 z-40 flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
            style={{ width: browseWidth, maxWidth: "100%" }}
          >
            {/* Drag left to resize -- clamped in the mousemove handler so
                it can't swallow the whole screen or shrink unusably small. */}
            <div
              onMouseDown={() => {
                browseResizing.current = true;
              }}
              className="absolute -left-1 top-0 z-10 h-full w-2 cursor-col-resize"
            />
            <div className="flex items-center gap-2 border-b border-border p-2">
              <button
                onClick={() => setBrowsePanelOpen(false)}
                aria-label="Close"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                {BrowseCloseIcon}
              </button>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = browseInput.trim();
                  if (!trimmed) return;
                  const looksLikeUrl =
                    /^https?:\/\//i.test(trimmed) || (!/\s/.test(trimmed) && /\.[a-z]{2,}(\/|$)/i.test(trimmed));
                  if (looksLikeUrl) {
                    setBrowseSearchResults(null);
                    setBrowseScreenshotLoaded(false);
                    setBrowseScreenshotError(false);
                    setBrowseUrl(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
                    return;
                  }
                  setBrowseUrl("");
                  setBrowseSearchLoading(true);
                  fetch(`/api/browse-search?q=${encodeURIComponent(trimmed)}`)
                    .then((r) => r.json())
                    .then((data: { results?: SearchHit[] }) => setBrowseSearchResults(data.results ?? []))
                    .catch(() => setBrowseSearchResults([]))
                    .finally(() => setBrowseSearchLoading(false));
                }}
                className="flex-1"
              >
                <input
                  value={browseInput}
                  onChange={(e) => setBrowseInput(e.target.value)}
                  placeholder="Search or type a URL"
                  className="w-full rounded-full border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-foreground/40"
                />
              </form>
            </div>
            <div className="sidebar-scroll flex-1 overflow-y-auto">
              {browseUrl ? (
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
                    <span className="truncate text-xs text-muted">{browseUrl}</span>
                    <a
                      href={browseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs font-medium text-foreground hover:underline"
                    >
                      Open in new tab
                    </a>
                  </div>
                  <div className="sidebar-scroll flex-1 overflow-auto bg-background">
                    {browseScreenshotError ? (
                      <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
                        <p className="text-sm text-muted">Couldn&apos;t render this page.</p>
                      </div>
                    ) : (
                      <>
                        {!browseScreenshotLoaded && (
                          <div className="flex h-full items-center justify-center text-sm text-muted">Loading...</div>
                        )}
                        <img
                          key={browseUrl}
                          src={`/api/browse-screenshot?url=${encodeURIComponent(browseUrl)}`}
                          alt=""
                          className={`w-full ${browseScreenshotLoaded ? "block" : "hidden"}`}
                          onLoad={() => setBrowseScreenshotLoaded(true)}
                          onError={() => setBrowseScreenshotError(true)}
                        />
                      </>
                    )}
                  </div>
                </div>
              ) : browseSearchLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-muted">Searching...</div>
              ) : browseSearchResults ? (
                browseSearchResults.length > 0 ? (
                  <div className="flex flex-col gap-1 p-2">
                    {browseSearchResults.map((r, i) => (
                      <a
                        key={i}
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl p-3 transition-colors hover:bg-surface-2"
                      >
                        <p className="truncate text-sm font-semibold text-foreground">{r.title}</p>
                        <p className="truncate text-xs text-muted">{r.url}</p>
                        {r.content && <p className="mt-1 line-clamp-2 text-xs text-muted">{r.content}</p>}
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
                    <p className="text-sm text-muted">No results found.</p>
                  </div>
                )
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
                  <span className="text-muted">{BrowseGlobeBigIcon}</span>
                  <p className="text-base font-semibold">Browse</p>
                  <p className="max-w-xs text-sm text-muted">
                    Search the web, or type a URL to see a live snapshot of that page.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right-edge conversation navigator -- one marker per message
            (user and assistant), stacked tightly together (not stretched
            to fill the whole track) so it reads as one compact cluster,
            matching the reference. Capped to the same top-24/bottom-24
            track height with overflow hidden so a very long conversation
            still can't push a marker outside the viewport.
            The marker for whichever message is currently centered in the
            scroll container is highlighted (see the scroll effect above);
            clicking any marker jumps straight to that message. */}
        {active &&
          (() => {
            // A brand-new assistant reply starts as an empty placeholder
            // (see startConversation) the instant you send a message, before
            // any text/image/video has actually streamed in -- counting that
            // placeholder here was giving a 2-message conversation a phantom
            // second marker with nothing real to jump to.
            const navMessages = active.messages.filter(
              (m) => m.role === "user" || m.content.trim() !== "" || m.imageUrl || m.videoUrl || m.videoStatus
            );
            if (navMessages.length < 2) return null;
            return (
          <nav
            aria-label="Conversation navigation"
            className="fixed right-2 top-24 bottom-24 z-30 hidden w-4 flex-col items-end justify-center gap-1.5 overflow-hidden sm:flex"
          >
            {navMessages.map((m) => {
              const isActive = activeNavMessageId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setActiveNavMessageId(m.id);
                    document.getElementById(`msg-${m.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  aria-label={`Jump to ${m.role === "user" ? "your message" : "reply"}: ${m.content.slice(0, 40) || "…"}`}
                  className={`ml-auto rounded-full transition-all duration-150 ${
                    isActive ? "h-[3px] w-5 bg-foreground" : "h-[2px] w-3.5 bg-foreground/60 hover:bg-foreground"
                  }`}
                />
              );
            })}
          </nav>
            );
          })()}

        {!active ? (
          <div className="relative mx-auto flex w-full max-w-[var(--max-w-chat)] flex-1 flex-col items-center justify-end px-4 pb-3 sm:justify-center sm:pb-0">
            {showHeroShimmer && (
              <div className="hero-shimmer-bg" onAnimationEnd={() => setShowHeroShimmer(false)} />
            )}

            {temporaryMode ? (
              <>
                <h1 className="relative z-10 text-3xl font-semibold tracking-tight">Temporary chat</h1>
                <p className="relative z-10 mt-2 text-sm text-muted">
                  This chat won&apos;t appear in history or be used to train our models.
                </p>
              </>
            ) : (
              <h1 className="relative z-10 text-3xl font-semibold tracking-tight">Ready when you are.</h1>
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
                onStop={canStop ? handleStopGenerating : undefined}
                temporaryMode={temporaryMode}
                onToggleTemporary={() => {
                  setTemporaryMode((v) => !v);
                  setActiveId(null);
                }}
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
              // Per feedback: the thin .sidebar-scroll treatment already
              // used elsewhere in the app (nav sidebar, etc.) is the actual
              // target here, not the browser's own wide native scrollbar.
              //
              // overflow-x-hidden -- a hard clip matching Build's own chat
              // scroll container (BuildWorkspace.tsx), so pasted content
              // that manages to overflow a message bubble anyway (despite
              // the break-words guards on it) still can't drag this column,
              // and the layout around it, wider than the viewport.
              className="sidebar-scroll w-full flex-1 overflow-y-auto overflow-x-hidden"
            >
              {/* The scroll container itself spans the full column width so
                  its scrollbar rides the true right edge next to the
                  sidebar -- on a wide window, a scrollbar on a
                  max-w-chat-constrained element instead strands it in the
                  middle of empty space, nowhere near where a scrollbar
                  should be. This inner div is what actually stays narrow
                  and centered, same as the composer below it. */}
              <div className="mx-auto w-full max-w-[var(--max-w-chat)] space-y-4 px-4 py-8">
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
                        </span>
                        <span className="text-sm text-muted">
                          Thinking…
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div key={m.id} id={`msg-${m.id}`}>
                    <ChatMessageBubble
                      id={m.id}
                      role={m.role}
                      content={m.content}
                      attachments={m.attachments}
                      imageUrl={m.imageUrl}
                      videoUrl={m.videoUrl}
                      isStreaming={m.id === streamingId}
                      qid={m.pairId}
                      onEdit={m.role === "user" ? (text) => handleEditMessage(m.id, text) : undefined}
                      onEditImage={m.imageUrl ? (instruction) => handleEditImage(m.imageUrl as string, instruction) : undefined}
                      onRegenerate={
                        m.role === "assistant" && !m.imageUrl && !m.videoUrl
                          ? () => handleRegenerate(m.id)
                          : undefined
                      }
                      onDelete={m.role === "assistant" ? () => handleDeleteMessage(m.id) : undefined}
                    />
                  </div>
                );
              })}
              </div>
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
              onStop={canStop ? handleStopGenerating : undefined}
              temporaryMode={temporaryMode}
              onToggleTemporary={() => {
                setTemporaryMode((v) => !v);
                setActiveId(null);
              }}
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
