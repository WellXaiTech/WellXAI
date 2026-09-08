"use client";

// Shared ancestor for both ChatGiZa routes (/chatgiza "Home" and
// /chatgiza/build "Code"). Owns every piece of state that Settings (and the
// Connectors/Automations/Upgrade/Support panels reachable from Settings)
// needs, so those overlays can render on top of EITHER page without
// navigating away from whichever one is currently mounted. Previously all of
// this lived in page.tsx alone, and Code's "Settings" link had to navigate to
// /chatgiza?openSettings=1 to reach it -- that round-trip is gone now that
// this state (and the panels themselves) live one level up, in the shared
// layout ancestor both routes render under.
//
// Anything here is either (a) a direct SettingsPanel prop, (b) state that's
// combined with (a) in the same debounced server-sync request (so splitting
// it across two components would mean two uncoordinated writers racing to
// overwrite the same server record), or (c) needed by PluginsPanel/
// ScheduledPanel/SupportModal, which are rendered here too for the same
// "don't kick the user out of Code" reason as Settings itself.
// Everything else (chat messages, composer state, sidebar UI toggles, etc.)
// stays local to page.tsx, reached here only via the context below when it
// needs to read/write shell-owned state.

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { chatgizaSignOut } from "@/lib/signOutHelper";
import type { Attachment } from "@/lib/attachments";
import type { PluginKey } from "@/components/PluginsPanel";
import type { ScheduledTask } from "@/components/ScheduledPanel";
import type { Project } from "@/components/ProjectsPanel";
import type { CompanyProfile, CompanyRequest } from "@/components/CompanyDashboard";
import SettingsPanel, { type Profile, type PrivacyPrefs, type Tab as SettingsTab } from "@/components/SettingsPanel";
import ScheduledPanel from "@/components/ScheduledPanel";
import PluginsPanel from "@/components/PluginsPanel";
import SupportModal from "@/components/SupportModal";
import ComingSoonModal from "@/components/ComingSoonModal";
import WorkModal from "@/components/WorkModal";
import { getStoredTheme, setTheme as persistTheme, applyTheme, type Theme } from "@/lib/theme";
import { getStoredContrast, setContrast as persistContrast, applyContrast, type Contrast } from "@/lib/contrast";
import { getStoredFontSize, setFontSize as persistFontSize, applyFontSize, type ChatFontSize } from "@/lib/fontSize";
import {
  getStoredAssistantColor,
  setAssistantColor as persistAssistantColor,
  applyAssistantColor,
  type AssistantColor,
} from "@/lib/assistantColor";
import {
  getStoredReduceMotion,
  setReduceMotion as persistReduceMotion,
  applyReduceMotion,
  type ReduceMotion,
} from "@/lib/reduceMotion";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  imageUrl?: string;
  videoUrl?: string;
  videoStatus?: "queued" | "in_progress" | "completed" | "failed";
  videoProgress?: number;
  createdAt?: number;
  // "Q-4F2A19" -- shared by a question and its reply, same field/format
  // the native Android app already generates and syncs (see
  // ChatViewModel.kt's newPairId()/pairId). Deliberately its own random
  // id, not derived from either message's own id, so both platforms can
  // independently generate the exact same kind of value and have it
  // round-trip identically either way.
  pairId?: string;
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  projectId?: string;
  pinned?: boolean;
  archived?: boolean;
  shared?: boolean;
  shareId?: string;
  // Temporary Chat -- never written to localStorage or synced to the
  // server (see the persistence effects below, each filters these out
  // before saving). Lives only in memory for the life of the tab; gone
  // the moment it's replaced or the page reloads, by design.
  temporary?: boolean;
};

export type DeletedIds = Record<string, number>;

// Conversations are scoped per signed-in account (or a shared "guest" bucket
// when signed out) -- a single global key let one Google account's chat
// history bleed into whichever account next signed in on the same device.
const GUEST_SCOPE = "guest";
function storageKeyFor(scope: string) {
  return `chatgiza:conversations:${scope}`;
}
function deletedIdsKeyFor(scope: string) {
  return `chatgiza:deleted-ids:${scope}`;
}
const PROJECTS_KEY = "chatgiza:projects";
const PROJECTS_DELETED_KEY = "chatgiza:projects-deleted";
const SCHEDULED_KEY = "chatgiza:scheduled";
const SCHEDULED_DELETED_KEY = "chatgiza:scheduled-deleted";
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
const LANGUAGE_KEY = "chatgiza:language";
const LOCATION_KEY = "chatgiza:location";
const COMPANY_KEY = "chatgiza:company";
const COMPANY_REQUESTS_KEY = "chatgiza:company-requests";

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

// Longer, feature-specific explanations for the generic "Coming soon" modal
// -- shown instead of the default one-line fallback when a key has an entry
// here (see ComingSoonModal's `description` prop).
const COMING_SOON_DESCRIPTIONS: Record<string, string> = {
  Work:
    "Work will be a separate space for your company's chats, kept apart from your personal ones. It will pull in your workspace's shared custom instructions (the ones your team sets up at chatgiza.com/workspace) automatically, so ChatGiZa already knows your company's context instead of you re-explaining it every time.",
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

function loadStoredConversations(scope: string): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKeyFor(scope));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

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
// grow forever -- by then every device has long since caught up on the
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

export function lastActivity(c: Conversation): number {
  let max = 0;
  for (const m of c.messages) {
    if (m.createdAt && m.createdAt > max) max = m.createdAt;
  }
  return max;
}

// Never let this tab's in-memory state silently drop a conversation that
// only exists because another tab (or another device) wrote it after this
// tab last read it -- unless it's tombstoned, in which case the deletion wins
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
    // >= , not > , on the length tiebreak: every call site here passes the
    // more-current side as `b` (walked second, so it's `c` on its turn) --
    // an exact tie should still let the newer save win instead of silently
    // keeping whichever side happened to be walked first.
    if (cActivity > existingActivity || (cActivity === existingActivity && c.messages.length >= existing.messages.length)) {
      byId.set(c.id, c);
    }
  }
  // Map iteration order is "whichever id was first encountered walking
  // [...a, ...b]" -- NOT recency. A brand-new conversation that only
  // exists in b (e.g. one just started locally, not yet in the stored
  // copy loaded as a) always got encountered after every id already in
  // a, so it landed at the very end of the returned list regardless of
  // being the most recent thing in the account -- "New chat" sinking to
  // the bottom, exactly what this sort fixes by making order reflect
  // actual recency instead of incidental merge-input position.
  return Array.from(byId.values()).sort((x, y) => lastActivity(y) - lastActivity(x));
}

type ChatGizaShellContextValue = {
  openSettingsTab: (tab: SettingsTab) => void;

  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  syncHistoryNow: () => void;
  // True while a reply is being generated/regenerated. Editing a message or
  // hitting Regenerate truncates `conversations` locally (dropping the old
  // reply) the instant it starts, well before the new one exists -- if the
  // automatic localStorage/server sync below persisted that in-between
  // state and the tab closed or the network dropped before the new reply
  // arrived, the old reply was gone for good on both sides, with nothing
  // left to recover it from. Gating the two automatic sync effects on this
  // means an interrupted regenerate leaves the last fully-settled state
  // (old reply intact) as what's actually saved, instead of the truncated
  // one -- worst case is losing the abandoned attempt, never the original.
  generating: boolean;
  setGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  deletedIds: DeletedIds;
  setDeletedIds: React.Dispatch<React.SetStateAction<DeletedIds>>;
  activeId: string | null;
  setActiveId: React.Dispatch<React.SetStateAction<string | null>>;
  // Temporary Chat -- when on, any conversation newly started (see
  // startConversation in page.tsx) is flagged `temporary` and excluded
  // from every persistence path above. Toggling either way jumps to a
  // fresh chat, matching the reference behavior of immediately switching
  // into/out of the "Temporary chat" hero screen rather than converting
  // whatever's currently open.
  temporaryMode: boolean;
  setTemporaryMode: React.Dispatch<React.SetStateAction<boolean>>;
  scope: string | null;
  historyEnabled: boolean;
  setHistoryEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  shareConversation: (id: string) => Promise<void>;
  unshareConversation: (id: string) => void;
  unarchiveConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  archiveAllConversations: () => void;
  exportAllData: () => void;
  clearAllHistory: () => void;

  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
  memoryEnabled: boolean;
  setMemoryEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  memory: string[];
  setMemory: React.Dispatch<React.SetStateAction<string[]>>;
  language: string;
  setLanguage: React.Dispatch<React.SetStateAction<string>>;

  digitalTwin: string;
  setDigitalTwin: React.Dispatch<React.SetStateAction<string>>;
  digitalTwinUpdatedAt: number;
  digitalTwinRegenerating: boolean;
  handleRegenerateDigitalTwin: () => Promise<void>;

  theme: Theme;
  handleThemeChange: (t: Theme) => void;
  contrast: Contrast;
  handleContrastChange: (c: Contrast) => void;
  fontSize: ChatFontSize;
  handleFontSizeChange: (s: ChatFontSize) => void;
  assistantColor: AssistantColor;
  handleAssistantColorChange: (c: AssistantColor) => void;
  reduceMotion: ReduceMotion;
  handleReduceMotionChange: (m: ReduceMotion) => void;

  notifyOnComplete: boolean;
  setNotifyOnComplete: React.Dispatch<React.SetStateAction<boolean>>;
  notifyImageGen: boolean;
  setNotifyImageGen: React.Dispatch<React.SetStateAction<boolean>>;
  allNotificationsEnabled: boolean;
  setAllNotificationsEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  privacyPrefs: PrivacyPrefs;
  setPrivacyPrefs: React.Dispatch<React.SetStateAction<PrivacyPrefs>>;
  feedbackEmailsOptIn: boolean;
  setFeedbackEmailsOptIn: React.Dispatch<React.SetStateAction<boolean>>;

  location: string;
  locationError: string | null;
  requestLocation: () => void;
  clearLocation: () => void;

  company: CompanyProfile;
  setCompany: React.Dispatch<React.SetStateAction<CompanyProfile>>;
  companyRequests: CompanyRequest[];
  setCompanyRequests: React.Dispatch<React.SetStateAction<CompanyRequest[]>>;

  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setDeletedProjectIds: React.Dispatch<React.SetStateAction<DeletedIds>>;

  pluginsEnabled: Record<PluginKey, boolean>;
  setPluginsEnabled: React.Dispatch<React.SetStateAction<Record<PluginKey, boolean>>>;

  scheduledTasks: ScheduledTask[];
  setScheduledTasks: React.Dispatch<React.SetStateAction<ScheduledTask[]>>;
  createScheduledTask: (prompt: string, runAt: string) => void;
  deleteScheduledTask: (id: string) => void;
  scheduledOpen: boolean;
  setScheduledOpen: React.Dispatch<React.SetStateAction<boolean>>;

  pluginsOpen: boolean;
  setPluginsOpen: React.Dispatch<React.SetStateAction<boolean>>;

  librarySignal: number;
  projectsSignal: number;

  supportOpen: boolean;
  setSupportOpen: React.Dispatch<React.SetStateAction<boolean>>;

  comingSoonTitle: string | null;
  setComingSoonTitle: React.Dispatch<React.SetStateAction<string | null>>;

  handleDeleteAccount: () => Promise<void>;
};

const ChatGizaShellContext = createContext<ChatGizaShellContextValue | null>(null);

export function useChatGizaShell(): ChatGizaShellContextValue {
  const ctx = useContext(ChatGizaShellContext);
  if (!ctx) throw new Error("useChatGizaShell must be used within ChatGizaShell");
  return ctx;
}

export default function ChatGizaShell({ children }: { children: ReactNode }) {
  const { data: authSession, status: authStatus } = useSession();
  const signedIn = authStatus === "authenticated";
  // `null` while NextAuth is still resolving the session -- deliberately not
  // "guest" during that window, so a signed-in user's data never gets read
  // from (or briefly written to) the guest bucket before we actually know
  // they're signed in.
  const scope = authStatus === "loading" ? null : signedIn && authSession?.user?.id ? authSession.user.id : GUEST_SCOPE;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [generating, setGenerating] = useState(false);
  const [deletedIds, setDeletedIds] = useState<DeletedIds>({});
  const deletedIdsRef = useRef<DeletedIds>({});
  useEffect(() => {
    deletedIdsRef.current = deletedIds;
  }, [deletedIds]);
  const conversationsRef = useRef<Conversation[]>([]);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [temporaryMode, setTemporaryMode] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [deletedProjectIds, setDeletedProjectIds] = useState<DeletedIds>({});
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [deletedScheduledIds, setDeletedScheduledIds] = useState<DeletedIds>({});
  const [pluginsEnabled, setPluginsEnabled] = useState<Record<PluginKey, boolean>>(DEFAULT_PLUGINS);
  const [theme, setThemeState] = useState<Theme>("system");
  const [fontSize, setFontSizeState] = useState<ChatFontSize>("medium");
  const [assistantColor, setAssistantColorState] = useState<AssistantColor>("default");
  const [reduceMotion, setReduceMotionState] = useState<ReduceMotion>("system");
  const [notifyOnComplete, setNotifyOnComplete] = useState(false);
  const [notifyImageGen, setNotifyImageGen] = useState(true);
  const [allNotificationsEnabled, setAllNotificationsEnabled] = useState(true);
  const [contrast, setContrastState] = useState<Contrast>("system");
  const [privacyPrefs, setPrivacyPrefs] = useState<PrivacyPrefs>(DEFAULT_PRIVACY_PREFS);
  const [feedbackEmailsOptIn, setFeedbackEmailsOptIn] = useState(false);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [company, setCompany] = useState<CompanyProfile>(DEFAULT_COMPANY);
  const [companyRequests, setCompanyRequests] = useState<CompanyRequest[]>([]);
  const [memory, setMemory] = useState<string[]>([]);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [digitalTwin, setDigitalTwin] = useState("");
  const [digitalTwinUpdatedAt, setDigitalTwinUpdatedAt] = useState(0);
  const [digitalTwinRegenerating, setDigitalTwinRegenerating] = useState(false);
  const [historyEnabled, setHistoryEnabled] = useState(true);
  const [language, setLanguage] = useState("Auto-detect");
  const [location, setLocationState] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab>("Overview");
  const [scheduledOpen, setScheduledOpen] = useState(false);
  const [pluginsOpen, setPluginsOpen] = useState(false);
  // Library/Projects modals are owned by the page (their content is
  // deeply tied to page-local data -- activeId switching, derived
  // library items, project CRUD), unlike Plugins/Scheduled which are
  // owned here. Rather than hoisting all of that into the shell just so
  // Settings (also rendered here) can open them, these are plain
  // "something changed" counters the page watches and reacts to -- a
  // monotonic counter (not a boolean) so two requests in a row are both
  // noticed even if the page hasn't had a chance to reset anything
  // in between.
  const [librarySignal, setLibrarySignal] = useState(0);
  const [projectsSignal, setProjectsSignal] = useState(0);
  const [supportOpen, setSupportOpen] = useState(false);
  const [comingSoonTitle, setComingSoonTitle] = useState<string | null>(null);

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
    // One-time hydration from browser storage after mount -- can't run
    // during SSR/the initial render, so this can't be a lazy useState
    // initializer.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProjects(loadJson(PROJECTS_KEY, []));
    setDeletedProjectIds(loadJson(PROJECTS_DELETED_KEY, {}));
    setScheduledTasks(loadJson(SCHEDULED_KEY, []));
    setDeletedScheduledIds(loadJson(SCHEDULED_DELETED_KEY, {}));
    setPluginsEnabled(loadJson(PLUGINS_KEY, DEFAULT_PLUGINS));
    setProfile(loadJson(PROFILE_KEY, DEFAULT_PROFILE));
    setCompany(loadJson(COMPANY_KEY, DEFAULT_COMPANY));
    setCompanyRequests(loadJson(COMPANY_REQUESTS_KEY, []));
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
    const storedReduceMotion = getStoredReduceMotion();
    setReduceMotionState(storedReduceMotion);
    applyReduceMotion(storedReduceMotion);
  }, []);

  // Loads whichever scope (a specific account, or the shared guest bucket)
  // the user currently is, whenever that identity changes -- including sign
  // out, which must swap `conversations` away from the account's data
  // entirely rather than leaving it sitting in memory for the next person
  // who uses this device/browser.
  useEffect(() => {
    if (!scope || scope === loadedScope) return;

    let nextConversations = loadStoredConversations(scope);
    let nextDeletedIds = pruneDeletedIds(loadDeletedIds(scope));

    if (scope !== GUEST_SCOPE && nextConversations.length === 0) {
      const guestConversations = loadStoredConversations(GUEST_SCOPE);
      if (guestConversations.length > 0) {
        nextConversations = guestConversations;
        nextDeletedIds = mergeDeletedIds(nextDeletedIds, loadDeletedIds(GUEST_SCOPE));
        localStorage.removeItem(storageKeyFor(GUEST_SCOPE));
        localStorage.removeItem(deletedIdsKeyFor(GUEST_SCOPE));
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConversations(mergeConversations(nextConversations, [], nextDeletedIds));
    setDeletedIds(nextDeletedIds);
    setActiveId(null);
    pulledHistoryFor.current = null;
    setLoadedScope(scope);
  }, [scope, loadedScope]);

  useEffect(() => {
    // Skip while a reply is generating -- see the `generating` field's
    // comment on ChatGizaShellContextValue. Fires again the moment
    // `generating` flips back to false, so the settled result (success or
    // an error message) still saves right away.
    if (!historyEnabled || !scope || scope !== loadedScope || generating) return;
    const merged = mergeConversations(loadStoredConversations(scope), conversations.filter((c) => !c.temporary), deletedIds);
    localStorage.setItem(storageKeyFor(scope), JSON.stringify(merged));
    localStorage.setItem(deletedIdsKeyFor(scope), JSON.stringify(deletedIds));
  }, [conversations, deletedIds, historyEnabled, scope, loadedScope, generating]);

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

  useEffect(() => {
    // Same reasoning as the localStorage effect above -- never let this
    // background PUT push a truncated-mid-regenerate conversation to the
    // server. Skipped while generating; fires again once it settles.
    if (!signedIn || !historyEnabled || !scope || scope !== loadedScope || generating) return;
    if (historySyncTimer.current) clearTimeout(historySyncTimer.current);
    historySyncTimer.current = setTimeout(() => {
      fetch("/api/history", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversations: conversations.filter((c) => !c.temporary), deletedIds }),
      }).catch(() => {});
    }, 1200);
    return () => {
      if (historySyncTimer.current) clearTimeout(historySyncTimer.current);
    };
  }, [conversations, deletedIds, signedIn, historyEnabled, scope, loadedScope, generating]);

  // A reply just finished streaming, then the user immediately checked a
  // different device (very normal -- "I sent it, let me look at my
  // phone") lands in the gap the 1200ms debounce above leaves open: the
  // server hasn't received this conversation's final content yet, so
  // the other device sees the conversation (title, the user's own
  // message) but the just-finished reply is still missing. This fires
  // one immediate PUT of whatever's current right now -- unlike the
  // earlier, reverted "pull on visibility" attempt, this only ever
  // PUSHES local state (which is already correct/authoritative the
  // moment this is called), never pulls and merges server data back in,
  // so it carries none of that mechanism's overwrite risk. Call this
  // once, right when a reply is confirmed fully done -- not on every
  // token, not on a timer.
  //
  // The setTimeout(0) is deliberate, not decorative: this is normally
  // called immediately after a setConversations(...) that just applied
  // the final streamed content, and conversationsRef only gets updated
  // by the effect above ONE RENDER after that -- reading the ref
  // synchronously right here would still see the previous, one-step-
  // stale value and could sync a reply missing its very last chunk.
  // Deferring to the next macrotask gives React's render + effect a
  // chance to run first, so the ref is actually current by the time
  // this reads it.
  const syncHistoryNow = useCallback(() => {
    if (historySyncTimer.current) clearTimeout(historySyncTimer.current);
    setTimeout(() => {
      fetch("/api/history", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversations: conversationsRef.current.filter((c) => !c.temporary),
          deletedIds: deletedIdsRef.current,
        }),
      }).catch(() => {});
    }, 0);
  }, []);

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
  }, [digitalTwin, signedIn]);

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

  useEffect(() => {
    if (!signedIn) return;
    const userId = authSession?.user?.id;
    if (!userId || pulledProjectsFor.current === userId) return;
    pulledProjectsFor.current = userId;
    fetch("/api/projects")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { projects?: Project[]; deletedIds?: DeletedIds } | null) => {
        if (data?.projects) setProjects(data.projects);
        if (data?.deletedIds) setDeletedProjectIds((prev) => mergeDeletedIds(prev, data.deletedIds!));
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
        body: JSON.stringify({ projects, deletedIds: deletedProjectIds }),
      }).catch(() => {});
    }, 1200);
    return () => {
      if (projectsSyncTimer.current) clearTimeout(projectsSyncTimer.current);
    };
  }, [projects, deletedProjectIds, signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    const userId = authSession?.user?.id;
    if (!userId || pulledScheduledFor.current === userId) return;
    pulledScheduledFor.current = userId;
    fetch("/api/scheduled")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { tasks?: ScheduledTask[]; deletedIds?: DeletedIds } | null) => {
        if (data?.tasks) setScheduledTasks(data.tasks);
        if (data?.deletedIds) setDeletedScheduledIds((prev) => mergeDeletedIds(prev, data.deletedIds!));
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
        body: JSON.stringify({ tasks: scheduledTasks, deletedIds: deletedScheduledIds }),
      }).catch(() => {});
    }, 1200);
    return () => {
      if (scheduledSyncTimer.current) clearTimeout(scheduledSyncTimer.current);
    };
  }, [scheduledTasks, deletedScheduledIds, signedIn]);

  useEffect(() => {
    localStorage.setItem(PROJECTS_DELETED_KEY, JSON.stringify(deletedProjectIds));
  }, [deletedProjectIds]);

  useEffect(() => {
    localStorage.setItem(SCHEDULED_DELETED_KEY, JSON.stringify(deletedScheduledIds));
  }, [deletedScheduledIds]);

  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(COMPANY_KEY, JSON.stringify(company));
  }, [company]);

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
    localStorage.setItem(LANGUAGE_KEY, JSON.stringify(language));
  }, [language]);

  useEffect(() => {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
  }, [location]);

  useEffect(() => {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(SCHEDULED_KEY, JSON.stringify(scheduledTasks));
  }, [scheduledTasks]);

  useEffect(() => {
    localStorage.setItem(PLUGINS_KEY, JSON.stringify(pluginsEnabled));
  }, [pluginsEnabled]);

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

  function handleFontSizeChange(s: ChatFontSize) {
    persistFontSize(s);
    setFontSizeState(s);
  }

  function handleAssistantColorChange(c: AssistantColor) {
    persistAssistantColor(c);
    setAssistantColorState(c);
  }

  function handleReduceMotionChange(m: ReduceMotion) {
    persistReduceMotion(m);
    setReduceMotionState(m);
  }

  async function handleDeleteAccount() {
    try {
      await fetch("/api/account", { method: "DELETE" });
    } catch {
      // Best-effort server cleanup -- still sign the browser out below either way.
    }
    Object.keys(localStorage)
      .filter((k) => k.startsWith("chatgiza:"))
      .forEach((k) => localStorage.removeItem(k));
    await chatgizaSignOut();
  }

  // Idea #9: samples recent turns across the user's own saved conversations
  // (not just the currently open one) so the synthesized profile reflects
  // how they actually write/decide generally, not just today's chat.
  async function handleRegenerateDigitalTwin() {
    if (digitalTwinRegenerating) return;
    setDigitalTwinRegenerating(true);
    try {
      const sample = conversations
        .filter((c) => !c.temporary)
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

  function deleteConversation(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setDeletedIds((prev) => ({ ...prev, [id]: Date.now() }));
    if (activeId === id) setActiveId(null);
  }

  function archiveAllConversations() {
    setConversations((prev) => prev.map((c) => ({ ...c, archived: true, pinned: false })));
    setActiveId(null);
  }

  async function shareConversation(id: string) {
    const convo = conversations.find((c) => c.id === id);
    if (!convo) return;

    // Reuse the existing link instead of minting a new one on every click.
    let shareId = convo.shareId;
    if (!shareId) {
      try {
        const res = await fetch("/api/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: convo.title,
            messages: convo.messages
              .filter((m) => m.content)
              .map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Couldn't create a share link.");
        shareId = data.id as string;
      } catch {
        return;
      }
    }

    const url = `${window.location.origin}/share/${shareId}`;
    let shared = false;
    if (navigator.share) {
      try {
        await navigator.share({ title: convo.title, url });
        shared = true;
      } catch {
        // user cancelled or share failed; fall through to clipboard copy
      }
    }
    if (!shared) {
      try {
        await navigator.clipboard.writeText(url);
        shared = true;
      } catch {
        // clipboard unavailable; nothing more we can do here
      }
    }
    if (shared) {
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, shared: true, shareId } : c)));
    }
  }

  function unshareConversation(id: string) {
    const convo = conversations.find((c) => c.id === id);
    if (convo?.shareId) {
      fetch(`/api/share/${convo.shareId}`, { method: "DELETE" }).catch(() => {});
    }
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, shared: false, shareId: undefined } : c))
    );
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

  function createScheduledTask(prompt: string, runAt: string) {
    setScheduledTasks((prev) => [...prev, { id: crypto.randomUUID(), prompt, runAt, fired: false }]);
  }

  function deleteScheduledTask(id: string) {
    setScheduledTasks((prev) => prev.filter((t) => t.id !== id));
    setDeletedScheduledIds((prev) => ({ ...prev, [id]: Date.now() }));
  }

  function openSettingsTab(tab: SettingsTab) {
    setSettingsInitialTab(tab);
    setSettingsOpen(true);
  }

  const value: ChatGizaShellContextValue = {
    openSettingsTab,
    conversations,
    setConversations,
    syncHistoryNow,
    generating,
    setGenerating,
    deletedIds,
    setDeletedIds,
    activeId,
    setActiveId,
    temporaryMode,
    setTemporaryMode,
    scope,
    historyEnabled,
    setHistoryEnabled,
    shareConversation,
    unshareConversation,
    unarchiveConversation,
    deleteConversation,
    archiveAllConversations,
    exportAllData,
    clearAllHistory,
    profile,
    setProfile,
    memoryEnabled,
    setMemoryEnabled,
    memory,
    setMemory,
    language,
    setLanguage,
    digitalTwin,
    setDigitalTwin,
    digitalTwinUpdatedAt,
    digitalTwinRegenerating,
    handleRegenerateDigitalTwin,
    theme,
    handleThemeChange,
    contrast,
    handleContrastChange,
    fontSize,
    handleFontSizeChange,
    assistantColor,
    handleAssistantColorChange,
    reduceMotion,
    handleReduceMotionChange,
    notifyOnComplete,
    setNotifyOnComplete,
    notifyImageGen,
    setNotifyImageGen,
    allNotificationsEnabled,
    setAllNotificationsEnabled,
    privacyPrefs,
    setPrivacyPrefs,
    feedbackEmailsOptIn,
    setFeedbackEmailsOptIn,
    location,
    locationError,
    requestLocation,
    clearLocation,
    company,
    setCompany,
    companyRequests,
    setCompanyRequests,
    projects,
    setProjects,
    setDeletedProjectIds,
    pluginsEnabled,
    setPluginsEnabled,
    scheduledTasks,
    setScheduledTasks,
    createScheduledTask,
    deleteScheduledTask,
    scheduledOpen,
    setScheduledOpen,
    pluginsOpen,
    setPluginsOpen,
    librarySignal,
    projectsSignal,
    supportOpen,
    setSupportOpen,
    comingSoonTitle,
    setComingSoonTitle,
    handleDeleteAccount,
  };

  return (
    <ChatGizaShellContext.Provider value={value}>
      {children}

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
          onOpenSupport={() => window.open("https://support.wellxai.world", "_blank", "noopener,noreferrer")}
          onDeleteAccount={handleDeleteAccount}
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

      {scheduledOpen && (
        <ScheduledPanel
          tasks={scheduledTasks}
          onClose={() => setScheduledOpen(false)}
          onCreate={createScheduledTask}
          onDelete={deleteScheduledTask}
        />
      )}

      {pluginsOpen && (
        <PluginsPanel onClose={() => setPluginsOpen(false)} onOpenComingSoon={setComingSoonTitle} />
      )}

      {supportOpen && (
        <SupportModal defaultEmail={authSession?.user?.email ?? undefined} onClose={() => setSupportOpen(false)} />
      )}

      {comingSoonTitle === "Work" ? (
        <WorkModal onClose={() => setComingSoonTitle(null)} />
      ) : (
        comingSoonTitle && (
          <ComingSoonModal
            title={comingSoonTitle}
            description={COMING_SOON_DESCRIPTIONS[comingSoonTitle]}
            onClose={() => setComingSoonTitle(null)}
          />
        )
      )}
    </ChatGizaShellContext.Provider>
  );
}
