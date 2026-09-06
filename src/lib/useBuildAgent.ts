"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatContentPart } from "./ai";

// Minimal shape of the File System Access API's FileSystemDirectoryHandle
// -- only what's actually used here (name, walking into subfolders,
// getting/creating a file, removing an entry). Declared locally rather
// than relying on the ambient DOM type, which isn't present in every
// TypeScript lib configuration.
interface FsWritable {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}
interface FsFileHandle {
  createWritable(): Promise<FsWritable>;
}
interface FsDirHandle {
  name: string;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FsDirHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FsFileHandle>;
  removeEntry(name: string): Promise<void>;
}

// `step` messages are synthetic UI-only lines (e.g. "Wrote index.html",
// "Deployed: https://...") shown between the user's request and the
// model's final summary, one per tool call -- mirrors how AI CENTER's own
// chat shows each action ("Read and edited...", "Build succeeded...")
// as its own line instead of only a single wall-of-text answer at the end.
// `revert` is only set on a file-mutating step (write_file/replace_in_file/
// delete_file) -- it's the file's exact content immediately before this
// step ran (undefined if the file didn't exist yet, meaning "undo" means
// deleting it), so the UI can offer a real one-click undo per action
// instead of leaving a bad AI edit with no way back. `warning` flags a
// write_file that replaced an existing file with much shorter content --
// the concrete shape of the model "forgetting" the rest of the file and
// silently dropping it.
export type BuildChatMessage = {
  role: "user" | "assistant";
  content: string;
  step?: boolean;
  id?: string;
  revert?: { path: string; prevContent: string | undefined };
  reverted?: boolean;
  warning?: string;
  // Real +N -M line counts for a write_file/replace_in_file step (same
  // idea as `git diff --stat`) -- kept as its own field rather than baked
  // into `content` so the UI can render it as its own badge and also sum
  // it across a whole collapsed step group, instead of having to re-parse
  // numbers back out of a label string.
  diffStat?: { added: number; removed: number };
  // Marks a generic step regardless of its specific label text ("command"
  // for run_terminal_command, "tool" for a read/search/outline call) so
  // summarizeSteps can still group/count these correctly once the label
  // itself becomes more descriptive than a single fixed phrase.
  kind?: "command" | "tool";
  // Data URLs of any images attached to this (user) message -- display
  // only. The actual image_url content parts sent to the model live only
  // in that one turn's API payload, not in this stored/displayed history.
  imageUrls?: string[];
};

export type BuildProject = {
  id: string;
  name: string;
  files: Record<string, string>;
  messages: BuildChatMessage[];
  lastActivity: number;
  pinned?: boolean;
};

// Multiple build projects persist side by side (like Private Chat's
// multi-thread history), not just one active session -- "New chat"
// starts a fresh one without throwing the previous project away; History
// lets the user come back and reopen any of them.
const PROJECTS_KEY = "chatgiza_build_projects_v1";
const ACTIVE_ID_KEY = "chatgiza_build_active_id_v1";
// One-time migration source: the earlier version of this hook persisted
// a single project under this key with no history at all.
const LEGACY_STATE_KEY = "chatgiza_build_state_v1";

// A generated site's files can be sizable, and localStorage caps out
// around 5MB per origin -- an uncaught QuotaExceededError inside a
// useEffect can crash the whole component tree, which would silently
// break History entirely (exactly the "nothing ever shows up" failure
// mode, not just a missed save). Trim the oldest projects and retry once
// rather than letting that happen.
function persistProjects(list: BuildProject[], activeId: string) {
  try {
    window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
    window.localStorage.setItem(ACTIVE_ID_KEY, activeId);
  } catch (err) {
    console.error("Build history: localStorage write failed, trimming old projects and retrying:", err);
    try {
      const trimmed = list.slice(0, Math.max(1, Math.ceil(list.length / 2)));
      window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(trimmed));
      window.localStorage.setItem(ACTIVE_ID_KEY, activeId);
    } catch (err2) {
      console.error("Build history: still failing after trimming -- this project won't survive a reload, but the app keeps working:", err2);
    }
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `p_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

// A real page <title> is the most honest name for a project (it's
// literally what a browser tab would show); falling back to the user's
// own words when there's no title yet keeps History readable even for a
// project that's just getting started.
function deriveProjectName(files: Record<string, string>, messages: BuildChatMessage[]): string {
  const html = files["index.html"];
  if (html) {
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = match?.[1]?.trim();
    if (title) return title;
  }
  const firstUser = messages.find((m) => m.role === "user" && !m.step);
  if (firstUser?.content?.trim()) {
    const words = firstUser.content.trim().split(/\s+/).slice(0, 6).join(" ");
    return words.length > 40 ? `${words.slice(0, 40)}…` : words;
  }
  return "Untitled project";
}

// The prompt already asks the model not to open every narration line
// with the same word ("Now...", "First..."), but a text instruction
// alone turned out not to reliably change this in practice -- confirmed
// live on the real Build page, not assumed. This is a real, code-level
// backstop instead of just more prompt text: the model's own actual
// recent opening words are extracted and handed back to it by name in
// the next request (see send() below), so the instruction becomes
// concrete and specific ("you just used these, don't reuse them")
// rather than a general rule it's already shown it doesn't reliably
// self-enforce.
function extractOpener(text: string): string {
  const firstWord = text.trim().split(/\s+/)[0] ?? "";
  return firstWord.replace(/[.,:;!?]+$/, "");
}

// A real +N -M line count (same idea as `git diff --stat`), computed via
// standard LCS -- not just a length/character comparison, which would
// call a one-line change at the top of a long file "the whole file
// changed". O(n*m) time and space, so skipped above a size guard where
// that stops being worth it for what's only ever a summary label, not a
// real diff view -- this runs synchronously on the main thread during an
// active multi-step build, so it needs to stay cheap, not just correct.
// Wrapped defensively: this is a label enhancement, not something that
// should ever be able to take down a build turn if it misbehaves on some
// unanticipated file content.
function lineDiffStat(before: string | undefined, after: string): { added: number; removed: number } | null {
  try {
    const beforeLines = (before ?? "").split("\n");
    const afterLines = after.split("\n");
    const n = beforeLines.length;
    const m = afterLines.length;
    if (n * m > 400_000) return null;
    const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i][j] = beforeLines[i] === afterLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    const lcsLength = dp[0][0];
    return { added: m - lcsLength, removed: n - lcsLength };
  } catch (err) {
    console.error("lineDiffStat failed, skipping the diff badge for this step:", err);
    return null;
  }
}

// A specific, human-readable label for a terminal command instead of a
// flat "Ran a command" every time -- matches how a real coding agent
// narrates what a command actually verified ("Typechecked the code",
// "Ran a production build") rather than staying generic regardless of
// what ran. Falls back to the generic phrase for anything unrecognized.
function describeCommand(command: string): string {
  const cmd = command.toLowerCase();
  if (/\btsc\b|typecheck/.test(cmd)) return "Typechecked the code";
  if (/\beslint\b|\blint\b/.test(cmd)) return "Linted the code";
  if (/\b(next|npm run|yarn) build\b/.test(cmd)) return "Ran a production build";
  if (/\btest\b/.test(cmd)) return "Ran tests";
  if (/\bnpm (i|install)\b|\byarn\b(?!.*build)/.test(cmd)) return "Installed dependencies";
  return "Ran a command";
}

// Which tool calls are worth surfacing as a step line, and how to phrase
// them. A read/search/outline call still gets a line -- just a generic
// "Used a tool" rather than naming the file -- so a multi-step turn reads
// like a real coding agent's own collapsed action log (grouped into "Used N
// tools" by summarizeSteps below) instead of going completely silent
// between file writes, which read as the agent doing nothing for several
// seconds at a time. `kind` marks a step as a command/generic-tool
// regardless of its specific label text, so summarizeSteps can still group
// and count them correctly even once the label itself gets more specific
// (e.g. "Typechecked the code" instead of a fixed "Ran a command").
function describeStep(
  name: string,
  args: Record<string, unknown>,
  result: string
): { label: string; kind?: "command" | "tool" } | null {
  switch (name) {
    case "write_file":
      return { label: `Wrote ${String(args.path ?? "")}` };
    case "replace_in_file":
      return result.startsWith("Edited ") ? { label: `Edited ${String(args.path ?? "")}` } : null;
    case "delete_file":
      return { label: `Deleted ${String(args.path ?? "")}` };
    case "push_to_github":
    case "deploy_to_vercel":
      return { label: result };
    case "run_terminal_command":
      return { label: describeCommand(typeof args.command === "string" ? args.command : ""), kind: "command" };
    case "read_file":
    case "list_files":
    case "search_workspace":
    case "get_file_outline":
      return { label: "Used a tool", kind: "tool" };
    default:
      return null;
  }
}

// Present-tense, shown live in the status line WHILE a tool call is
// actually running -- describeStep above only appears AFTER a step
// finishes. Previously the status line only ever said generic
// "Running…" for the whole turn, giving no sense of which specific file
// was being touched or how far a multi-file build had gotten.
function describeCurrentAction(name: string, args: Record<string, unknown>): string | null {
  const path = typeof args.path === "string" ? args.path : undefined;
  switch (name) {
    case "write_file":
      return path ? `Writing ${path}…` : "Writing…";
    case "replace_in_file":
      return path ? `Editing ${path}…` : "Editing…";
    case "delete_file":
      return path ? `Deleting ${path}…` : "Deleting…";
    case "read_file":
      return path ? `Reading ${path}…` : "Reading…";
    case "list_files":
      return "Checking project files…";
    case "push_to_github":
      return "Pushing to GitHub…";
    case "deploy_to_vercel":
      return "Deploying to Vercel…";
    default:
      return null;
  }
}

type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
type AgentMessage =
  | { role: "user"; content: string | ChatContentPart[] }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

// Raised from 8 -- a real multi-file build (several files written, maybe
// a deploy) routinely needs more than 8 tool-call rounds, and
// push_to_github/deploy_to_vercel are already gated by their own
// confirmation modal regardless of this cap, so a higher ceiling doesn't
// change what the user has to approve, just how much can get done before
// this loop gives up and asks them to send another message to continue.
const MAX_STEPS = 25;
const DEPLOY_POLL_INTERVAL_MS = 3000;
const DEPLOY_MAX_POLLS = 40; // ~2 minutes

function safeParseArgs(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

const SEARCH_MAX_MATCHES = 200;

// Runs synchronously against the in-memory file map -- unlike the VS Code
// extension's searchWorkspace (real disk I/O), there's nothing to await
// here, Build's whole project already lives in memory.
function searchFiles(files: Record<string, string>, query: string, isRegex: boolean): string {
  let pattern: RegExp;
  try {
    pattern = isRegex ? new RegExp(query, "g") : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  } catch (err) {
    return `Invalid search pattern: ${err instanceof Error ? err.message : String(err)}`;
  }
  const results: string[] = [];
  for (const [path, content] of Object.entries(files)) {
    if (results.length >= SEARCH_MAX_MATCHES) break;
    const lines = content.split("\n");
    for (let i = 0; i < lines.length && results.length < SEARCH_MAX_MATCHES; i++) {
      pattern.lastIndex = 0;
      if (pattern.test(lines[i])) {
        results.push(`${path}:${i + 1}: ${lines[i].trim()}`);
      }
    }
  }
  return results.length > 0 ? results.join("\n") : "No matches found.";
}

// Lightweight regex heuristic for "what's declared in this file" -- there
// is no real language server in a browser tab (unlike VS Code's
// get_file_outline), so this can't be exhaustive or perfectly accurate,
// just a cheap first pass covering the common JS/TS/JSX and Python
// declaration shapes Build's own generated projects actually use.
const OUTLINE_PATTERNS: Array<{ kind: string; regex: RegExp }> = [
  { kind: "function", regex: /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/ },
  { kind: "class", regex: /^\s*(?:export\s+)?(?:default\s+)?class\s+([A-Za-z_$][\w$]*)/ },
  { kind: "const", regex: /^\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(?[^=]*=>/ },
  { kind: "def", regex: /^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)/ },
];

function getFileOutlineHeuristic(content: string): string {
  const lines: string[] = [];
  content.split("\n").forEach((line, i) => {
    for (const { kind, regex } of OUTLINE_PATTERNS) {
      const match = line.match(regex);
      if (match) {
        lines.push(`${kind} ${match[1]} (line ${i + 1})`);
        break;
      }
    }
  });
  return lines.length > 0
    ? lines.join("\n")
    : "No top-level functions/classes detected (this is a regex heuristic, not a real parser -- read_file to see the raw contents).";
}

// Opens the OAuth popup for `service` if it isn't already connected, and
// waits for it to close before resolving -- lets push_to_github/
// deploy_to_vercel ask for the connection only when actually needed,
// triggered by the agent itself rather than a manual "Connect" button.
async function ensureConnected(service: "github" | "vercel"): Promise<boolean> {
  const statusRes = await fetch("/api/connectors");
  const statusData = await statusRes.json();
  const entry = (statusData.connectors ?? []).find((c: { id: string }) => c.id === service);
  if (entry?.connected) return true;
  if (!entry?.configured) return false;

  const startRes = await fetch(`/api/connectors/${service}/start`, { method: "POST" });
  const startData = await startRes.json();
  if (!startRes.ok || !startData.url) return false;

  const popup = window.open(startData.url, "_blank", "noopener,noreferrer");
  if (!popup) return false;

  await new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      if (popup.closed) {
        clearInterval(interval);
        resolve();
      }
    }, 1000);
  });

  const recheckRes = await fetch("/api/connectors");
  const recheckData = await recheckRes.json();
  const recheckEntry = (recheckData.connectors ?? []).find((c: { id: string }) => c.id === service);
  return !!recheckEntry?.connected;
}

// Client-driven agent loop shared by the Build workspace (both the
// standalone /chatgiza/build page and the "Code" mode inline in the main
// chat page) -- structurally the same pattern as the VS Code extension's
// agent loop (see vscode-extension/src/extension.ts), just executing tool
// calls against an in-memory virtual file map instead of a real
// workspace. The server (/api/build/turn) only ever proposes tool calls;
// this hook is what actually "runs" them, including push_to_github and
// deploy_to_vercel -- there's no separate manual "Push"/"Deploy" button
// in the UI, the agent does it when the user asks in chat.
// push_to_github/deploy_to_vercel create real, external, public artifacts
// (an actual GitHub repo, an actual live URL) the instant the model calls
// them -- write_file/replace_in_file/delete_file only ever touched an
// in-memory, browser-only virtual file map with a real Revert already
// available on every step, which is why they weren't gated originally.
// Gated anyway now, at the user's explicit request, even knowing it means
// clicking Allow far more often on a normal multi-file build -- every
// file-mutating tool asks first, no exceptions for "it's reversible
// anyway". The VS Code extension already gates its own equivalent actions
// (write_file, run_terminal_command) behind a real confirmation modal
// before they run.
export type PendingBuildConfirmation = {
  kind: "push_to_github" | "deploy_to_vercel" | "run_terminal_command" | "write_file" | "replace_in_file" | "delete_file";
  detail: string;
  // The exact command/path rendered in its own monospace block, separate
  // from `detail`'s human question -- matches the VS Code extension's own
  // confirmation, which always shows the real thing about to run/change,
  // not just a paraphrase of it.
  code?: string;
};

export function useBuildAgent() {
  const [files, setFiles] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<BuildChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Unlike sendingStats.tokens (reset to 0 at the start of every turn),
  // this accumulates for the lifetime of the whole session -- the real
  // number behind the usage popover's "Tokens used this session" line.
  const [sessionTokens, setSessionTokens] = useState(0);
  // Live, real stats for the "Nm Ns - N tokens - N tasks" status line
  // shown while the agent works -- null when nothing is in flight.
  // currentAction names the specific file/action actually in progress
  // right now (e.g. "Writing index.html…") -- previously the status line
  // only ever said generic "Running…", giving no sense of which file was
  // being touched or how far along a multi-file build had gotten.
  const [sendingStats, setSendingStats] = useState<{
    startedAt: number;
    tokens: number;
    tasksRun: number;
    currentAction: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<BuildProject[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingBuildConfirmation | null>(null);
  const pendingConfirmationRef = useRef<PendingBuildConfirmation | null>(null);
  pendingConfirmationRef.current = pendingConfirmation;
  const confirmResolveRef = useRef<((allowed: boolean) => void) | null>(null);
  // A real local folder, granted via the File System Access API -- every
  // write_file/replace_in_file/delete_file call mirrors to it once set, in
  // addition to the in-memory virtual file map everything else here still
  // uses (the live preview, History, Revert all keep working off that
  // same virtual map regardless of whether a folder is connected). Only a
  // FileSystemDirectoryHandle, not a path string -- the browser never
  // exposes a real filesystem path for privacy reasons, only the picked
  // folder's own name. Chromium-only (Chrome/Edge/Opera); Firefox/Safari
  // don't implement this API at all, so this whole feature stays opt-in
  // rather than a hard requirement.
  const [localFolderName, setLocalFolderName] = useState<string | null>(null);
  const localDirHandleRef = useRef<FsDirHandle | null>(null);
  const [githubConnected, setGithubConnected] = useState<boolean | null>(null);
  const filesRef = useRef(files);
  filesRef.current = files;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  // null until the active project has actually been written to once --
  // a brand new "New chat" project has no id (and no history entry) yet.
  const activeIdRef = useRef<string | null>(null);
  // Set once run_terminal_command creates a real E2B sandbox, so a later
  // call in the same session reuses it (keeping node_modules from an
  // earlier "npm install" around for a later "npm test") instead of
  // starting fresh every time. Reset on New chat (see reset() below).
  const sandboxIdRef = useRef<string | undefined>(undefined);

  // Restored one tick after mount (not as the initial useState value) so
  // server-rendered HTML and the client's first hydration pass agree --
  // reading localStorage during the initial render would mismatch them.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      let list: BuildProject[] = [];
      const rawProjects = window.localStorage.getItem(PROJECTS_KEY);
      if (rawProjects) {
        const parsed = JSON.parse(rawProjects);
        if (Array.isArray(parsed)) list = parsed;
      }

      // One-time migration from the earlier single-project persistence.
      if (list.length === 0) {
        const legacyRaw = window.localStorage.getItem(LEGACY_STATE_KEY);
        if (legacyRaw) {
          try {
            const legacy = JSON.parse(legacyRaw);
            const hasContent = legacy?.files && Array.isArray(legacy.messages) && (Object.keys(legacy.files).length > 0 || legacy.messages.length > 0);
            if (hasContent) {
              const id = newId();
              list = [{ id, name: deriveProjectName(legacy.files, legacy.messages), files: legacy.files, messages: legacy.messages, lastActivity: Date.now() }];
              window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
              window.localStorage.setItem(ACTIVE_ID_KEY, id);
            }
          } catch {
            // corrupted legacy entry -- nothing to migrate
          }
          window.localStorage.removeItem(LEGACY_STATE_KEY);
        }
      }

      projectsRef.current = list;
      setProjects(list);

      const activeId = window.localStorage.getItem(ACTIVE_ID_KEY);
      const active = activeId ? list.find((p) => p.id === activeId) : undefined;
      if (active) {
        activeIdRef.current = active.id;
        filesRef.current = active.files;
        setFiles(active.files);
        setMessages(active.messages);
      }
    } catch {
      // corrupted/unavailable storage -- start fresh
    }
  }, []);

  // Upserts the active project into the list on every change -- there is
  // no separate "save" step, exactly like Private Chat's conversation
  // list. A brand new project only gets an id (and a history entry) the
  // first time it actually has content, so an empty "New chat" never
  // shows up in History.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (Object.keys(files).length === 0 && messages.length === 0) return;
    const id = activeIdRef.current ?? newId();
    activeIdRef.current = id;
    const prev = projectsRef.current;
    const idx = prev.findIndex((p) => p.id === id);
    // Carry the pin forward -- without this, every message sent in a
    // pinned project would silently unpin it again on the next save.
    const entry: BuildProject = {
      id,
      name: deriveProjectName(files, messages),
      files,
      messages,
      lastActivity: Date.now(),
      pinned: idx >= 0 ? prev[idx].pinned : undefined,
    };
    const next = idx >= 0 ? [...prev.slice(0, idx), entry, ...prev.slice(idx + 1)] : [entry, ...prev];
    projectsRef.current = next;
    setProjects(next);
    persistProjects(next, id);
  }, [files, messages]);

  // Mirrors write_file/replace_in_file/delete_file to a real local folder
  // once one is connected -- best-effort, logged not thrown, so a failed
  // disk write (permission revoked mid-session, folder deleted, etc.)
  // never breaks the in-memory build the rest of the app depends on.
  const writeFileToLocalFolder = useCallback(async (path: string, content: string) => {
    const dir = localDirHandleRef.current;
    if (!dir) return;
    try {
      const parts = path.split("/").filter(Boolean);
      const fileName = parts.pop();
      if (!fileName) return;
      let current = dir;
      for (const part of parts) current = await current.getDirectoryHandle(part, { create: true });
      const fileHandle = await current.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    } catch (err) {
      console.error(`Failed to mirror ${path} to the local folder:`, err);
    }
  }, []);

  const deleteFileFromLocalFolder = useCallback(async (path: string) => {
    const dir = localDirHandleRef.current;
    if (!dir) return;
    try {
      const parts = path.split("/").filter(Boolean);
      const fileName = parts.pop();
      if (!fileName) return;
      let current = dir;
      for (const part of parts) current = await current.getDirectoryHandle(part);
      await current.removeEntry(fileName);
    } catch (err) {
      console.error(`Failed to delete ${path} from the local folder:`, err);
    }
  }, []);

  // showDirectoryPicker needs a real user gesture (a click), so this is
  // always called directly from a button handler, never automatically.
  // Typed through a minimal local interface rather than the ambient
  // FileSystemDirectoryHandle DOM type -- that type isn't in every
  // TypeScript lib config, and this is the only shape actually used here.
  const connectLocalFolder = useCallback(async (): Promise<boolean> => {
    const picker = (window as unknown as { showDirectoryPicker?: () => Promise<FsDirHandle> }).showDirectoryPicker;
    if (!picker) return false;
    try {
      const handle = await picker();
      localDirHandleRef.current = handle;
      setLocalFolderName(handle.name);
      // Mirror whatever's already been built before the folder was
      // connected (connecting partway through a project, not only at the
      // very start) instead of only writing files created from here on.
      for (const [path, content] of Object.entries(filesRef.current)) {
        await writeFileToLocalFolder(path, content);
      }
      return true;
    } catch (err) {
      // AbortError is just "the user closed the picker without choosing".
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        console.error("Local folder connection failed:", err);
      }
      return false;
    }
  }, [writeFileToLocalFolder]);

  const connectGithubNow = useCallback(async (): Promise<boolean> => {
    const connected = await ensureConnected("github");
    setGithubConnected(connected);
    return connected;
  }, []);

  // Which kinds the user has picked "Always allow" for -- checked before
  // ever showing the modal, so once granted for e.g. write_file, every
  // later write_file in the SAME session goes straight through with no
  // further prompts. Session-only (a plain ref, not persisted) -- a fresh
  // page load starts asking again, same as the VS Code extension's own
  // "Always allow" only lasting the one workspace session.
  const alwaysAllowedRef = useRef<Set<PendingBuildConfirmation["kind"]>>(new Set());
  // The Mode selector's coarse version of the same thing -- picking Auto
  // or Accept edits pre-populates alwaysAllowedRef with a whole group of
  // kinds at once (see setPermissionMode below) instead of the user
  // having to grant each one individually the first time it comes up.
  // The two mechanisms share the one underlying set, so they can diverge
  // (e.g. picking "Accept edits" then separately Always-allowing
  // push_to_github on one real prompt) the same way Claude Code's own
  // mode + per-tool always-allow can.
  const [permissionMode, setPermissionModeState] = useState<"manual" | "acceptEdits" | "auto">("manual");
  const setPermissionMode = useCallback((mode: "manual" | "acceptEdits" | "auto") => {
    const fileKinds: PendingBuildConfirmation["kind"][] = ["write_file", "replace_in_file", "delete_file"];
    const allKinds: PendingBuildConfirmation["kind"][] = [
      ...fileKinds,
      "push_to_github",
      "deploy_to_vercel",
      "run_terminal_command",
    ];
    alwaysAllowedRef.current = new Set(mode === "auto" ? allKinds : mode === "acceptEdits" ? fileKinds : []);
    setPermissionModeState(mode);
  }, []);

  // Shows the confirmation modal and suspends here until the user
  // clicks Allow/Always allow/Deny -- mirrors vscode.window.showWarningMessage's
  // await-a-modal-choice shape in the VS Code extension's own
  // write_file/run_terminal_command gate.
  const requestConfirmation = useCallback(
    (kind: PendingBuildConfirmation["kind"], detail: string, code?: string): Promise<boolean> => {
      if (alwaysAllowedRef.current.has(kind)) return Promise.resolve(true);
      return new Promise((resolve) => {
        confirmResolveRef.current = resolve;
        setPendingConfirmation({ kind, detail, code });
      });
    },
    []
  );

  const confirmPendingAction = useCallback((allowed: boolean, always?: boolean) => {
    if (always && allowed && pendingConfirmationRef.current) {
      alwaysAllowedRef.current.add(pendingConfirmationRef.current.kind);
    }
    confirmResolveRef.current?.(allowed);
    confirmResolveRef.current = null;
    setPendingConfirmation(null);
  }, []);

  const executeTool = useCallback(async (name: string, args: Record<string, unknown>): Promise<string> => {
    switch (name) {
      case "list_files":
        return JSON.stringify(Object.keys(filesRef.current));
      case "search_workspace":
        return searchFiles(filesRef.current, (args.query as string) ?? "", !!args.isRegex);
      case "get_file_outline": {
        const path = args.path as string;
        const content = filesRef.current[path];
        return content !== undefined ? getFileOutlineHeuristic(content) : `(no such file: ${path})`;
      }
      case "read_file": {
        const path = args.path as string;
        const content = filesRef.current[path];
        return content !== undefined ? content : `(no such file: ${path})`;
      }
      case "write_file": {
        const path = args.path as string;
        const content = (args.content as string) ?? "";
        const existed = filesRef.current[path] !== undefined;
        const allowed = await requestConfirmation(
          "write_file",
          existed ? `Allow ChatGiZa to rewrite ${path}?` : `Allow ChatGiZa to create ${path}?`,
          path
        );
        if (!allowed) return `The user declined to write ${path}. Do not retry; ask what they'd like instead if relevant.`;
        const next = { ...filesRef.current, [path]: content };
        filesRef.current = next;
        setFiles(next);
        void writeFileToLocalFolder(path, content);
        return `Wrote ${path} (${content.length} characters).`;
      }
      case "delete_file": {
        const path = args.path as string;
        const allowed = await requestConfirmation("delete_file", `Allow ChatGiZa to delete ${path}?`, path);
        if (!allowed) return `The user declined to delete ${path}. Do not retry; ask what they'd like instead if relevant.`;
        const next = { ...filesRef.current };
        delete next[path];
        filesRef.current = next;
        setFiles(next);
        void deleteFileFromLocalFolder(path);
        return `Deleted ${path}.`;
      }
      case "replace_in_file": {
        const path = args.path as string;
        const oldText = (args.oldText as string) ?? "";
        const newText = (args.newText as string) ?? "";
        const current = filesRef.current[path];
        if (current === undefined) {
          return `(no such file: ${path} -- use write_file to create it first)`;
        }
        const firstIndex = current.indexOf(oldText);
        if (firstIndex === -1) {
          return `oldText not found in ${path} -- it must match the file's exact current content. Call read_file on ${path} first, then retry with an exact match.`;
        }
        if (current.indexOf(oldText, firstIndex + 1) !== -1) {
          return `oldText appears more than once in ${path} -- include more surrounding context so it matches exactly one place, then retry.`;
        }
        const allowed = await requestConfirmation("replace_in_file", `Allow ChatGiZa to edit ${path}?`, path);
        if (!allowed) return `The user declined to edit ${path}. Do not retry; ask what they'd like instead if relevant.`;
        const content = current.slice(0, firstIndex) + newText + current.slice(firstIndex + oldText.length);
        const next = { ...filesRef.current, [path]: content };
        filesRef.current = next;
        setFiles(next);
        void writeFileToLocalFolder(path, content);
        return `Edited ${path} (${content.length} characters).`;
      }
      case "push_to_github": {
        const repoName = args.repoName as string;
        if (Object.keys(filesRef.current).length === 0) return "No files to push yet.";
        const connected = await ensureConnected("github");
        if (!connected) return "The user needs to connect GitHub first -- a connect popup should have opened.";
        const allowed = await requestConfirmation("push_to_github", "Allow ChatGiZa to push this project to GitHub?", repoName);
        if (!allowed) return `The user declined to push to GitHub as "${repoName}". Do not retry; ask what they'd like instead if relevant.`;
        try {
          const res = await fetch("/api/build/github/push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ files: filesRef.current, repoName }),
          });
          const data = await res.json();
          if (!res.ok) return `Push failed: ${data.error ?? "unknown error"}`;
          return `Pushed to GitHub: ${data.repoUrl}`;
        } catch {
          return "Push failed: network error.";
        }
      }
      case "deploy_to_vercel": {
        const projectName = args.projectName as string;
        if (Object.keys(filesRef.current).length === 0) return "No files to deploy yet.";
        const connected = await ensureConnected("vercel");
        if (!connected) return "The user needs to connect Vercel first -- a connect popup should have opened.";
        const allowed = await requestConfirmation(
          "deploy_to_vercel",
          "Allow ChatGiZa to deploy this project to Vercel?",
          projectName
        );
        if (!allowed) return `The user declined to deploy "${projectName}" to Vercel. Do not retry; ask what they'd like instead if relevant.`;
        try {
          const res = await fetch("/api/build/vercel/deploy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ files: filesRef.current, projectName }),
          });
          const data = await res.json();
          if (!res.ok) return `Deploy failed: ${data.error ?? "unknown error"}`;
          const deploymentId = data.deploymentId as string;

          for (let i = 0; i < DEPLOY_MAX_POLLS; i++) {
            await new Promise((r) => setTimeout(r, DEPLOY_POLL_INTERVAL_MS));
            const statusRes = await fetch(`/api/build/vercel/deploy/${deploymentId}/status`);
            const statusData = await statusRes.json();
            if (!statusRes.ok) return `Deploy failed while checking status: ${statusData.error ?? "unknown error"}`;
            if (statusData.state === "READY") return `Deployed: ${statusData.url}`;
            if (statusData.state === "ERROR" || statusData.state === "CANCELED") {
              return `Deployment ${String(statusData.state).toLowerCase()}.`;
            }
          }
          return "Deployment is taking longer than expected -- check Vercel directly.";
        } catch {
          return "Deploy failed: network error.";
        }
      }
      case "run_terminal_command": {
        const command = (args.command as string) ?? "";
        if (!command.trim()) return "No command given.";
        const allowed = await requestConfirmation("run_terminal_command", "Allow ChatGiZa to run this command?", command);
        if (!allowed) return `The user declined to run: ${command}. Do not retry; ask what they'd like instead if relevant.`;
        try {
          const res = await fetch("/api/build/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ files: filesRef.current, command, sandboxId: sandboxIdRef.current }),
          });
          const data = await res.json();
          if (!res.ok) return `Command failed: ${data.error ?? "unknown error"}`;
          sandboxIdRef.current = data.sandboxId;
          return data.output || "(command produced no output)";
        } catch {
          return "Command failed: network error.";
        }
      }
      default:
        return `Unknown tool: ${name}`;
    }
  }, [requestConfirmation]);

  const send = useCallback(
    async (userText: string, images?: { dataUrl: string; name: string }[]) => {
      const hasImages = !!images && images.length > 0;
      if ((!userText.trim() && !hasImages) || sending) return;
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setSending(true);
      setError(null);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: userText, imageUrls: hasImages ? images.map((i) => i.dataUrl) : undefined },
      ]);
      // Real, live stats for the "N tokens - N tasks - running" status
      // line -- token counts come straight from the API's own usage
      // field (never fabricated), tasksRun counts actual tool calls
      // executed, and startedAt lets the UI tick its own elapsed-time
      // clock without this hook re-rendering every second itself.
      setSendingStats({ startedAt: Date.now(), tokens: 0, tasksRun: 0, currentAction: null });

      const userContent: string | ChatContentPart[] = hasImages
        ? [
            { type: "text", text: userText || "See attached image(s)." },
            ...images.map((i): ChatContentPart => ({ type: "image_url", image_url: { url: i.dataUrl } })),
          ]
        : userText;

      const agentMessages: AgentMessage[] = [
        ...messages.filter((m) => !m.step).map((m): AgentMessage => ({ role: m.role, content: m.content })),
        { role: "user", content: userContent },
      ];

      // The model's own actual recent narration openers, handed back to
      // it explicitly -- see extractOpener's comment for why a plain
      // "vary your wording" instruction alone wasn't enough in practice.
      const recentOpeners = messages
        .filter((m) => m.role === "assistant" && !m.step && m.content.trim())
        .slice(-3)
        .map((m) => extractOpener(m.content))
        .filter(Boolean);

      // A read_file immediately followed by an edit to the SAME file reads
      // as one action ("Read and edited X"), not a generic "Used a tool"
      // line right before the edit that was the actual point of it --
      // mirrors how a real coding agent's own transcript folds a
      // read-before-edit together instead of surfacing both. Declared
      // outside the step loop (not reset each turn) because the system
      // prompt has the model narrate between calls, so the read and its
      // edit are almost always in two separate turns/steps, not the same
      // tool_calls batch -- resetting this per-turn meant the merge could
      // never actually fire.
      let pendingRead: { path: string } | null = null;
      const flushPendingRead = () => {
        if (!pendingRead) return;
        setMessages((prev) => [...prev, { role: "assistant", content: "Used a tool", step: true, id: newId(), kind: "tool" as const }]);
        pendingRead = null;
      };

      try {
        for (let step = 0; step < MAX_STEPS; step++) {
          // filesRef.current is read fresh on every loop iteration (not
          // captured once outside the loop) so a file written by an
          // earlier tool call *within this same turn* is already
          // reflected in the manifest the model sees on its very next
          // step, not just on the following user message.
          const res = await fetch("/api/build/turn", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: agentMessages, files: filesRef.current, recentOpeners }),
            signal: controller.signal,
          });
          if (!res.ok || !res.body) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error ?? "The Build agent ran into a problem.");
          }

          // Newline-delimited JSON: "content" events carry narration/
          // summary text as the model actually generates it -- appended
          // live to a message as it streams in (typing in, the way a
          // coding agent's own output does), not shown all at once once
          // the whole turn finishes. A trailing "done" event carries the
          // fully-assembled tool call(s), which only mean anything once
          // complete. Appending to "the last message" is safe here
          // because nothing else gets inserted mid-stream -- step lines
          // for tool calls only get added after "done" arrives.
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let streamedAny = false;
          type DoneEvent = {
            toolCalls: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
            content: string | null;
            usage: { totalTokens: number } | null;
          };
          let doneEvent: DoneEvent | null = null;
          let streamError: string | null = null;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.trim()) continue;
              let event: { type: string; [k: string]: unknown };
              try {
                event = JSON.parse(line);
              } catch {
                continue;
              }
              if (event.type === "content" && typeof event.text === "string") {
                const text = event.text;
                if (!streamedAny) {
                  streamedAny = true;
                  setMessages((prev) => [...prev, { role: "assistant", content: text }]);
                } else {
                  setMessages((prev) => {
                    const next = [...prev];
                    const last = next[next.length - 1];
                    next[next.length - 1] = { ...last, content: last.content + text };
                    return next;
                  });
                }
              } else if (event.type === "done") {
                doneEvent = event as unknown as DoneEvent;
              } else if (event.type === "error" && typeof event.error === "string") {
                streamError = event.error;
              }
            }
          }

          if (streamError) throw new Error(streamError);
          if (!doneEvent) throw new Error("The Build agent ran into a problem.");

          const turnTokens = typeof doneEvent.usage?.totalTokens === "number" ? doneEvent.usage.totalTokens : 0;
          if (turnTokens > 0) {
            setSendingStats((s) => (s ? { ...s, tokens: s.tokens + turnTokens } : s));
            setSessionTokens((t) => t + turnTokens);
          }

          if (doneEvent.toolCalls.length === 0) {
            // Final answer -- already fully streamed into the UI above,
            // nothing left to push. A read that never got its matching
            // edit (the model narrated to a stop instead) still deserves
            // its own line rather than silently vanishing.
            flushPendingRead();
            if (!streamedAny) {
              setMessages((prev) => [...prev, { role: "assistant", content: doneEvent!.content ?? "" }]);
            }
            return;
          }

          // tool_calls: execute each locally against the virtual file map
          // (or, for push_to_github/deploy_to_vercel, against the real
          // GitHub/Vercel APIs), append results, and loop back for the
          // model's next step.
          agentMessages.push({ role: "assistant", content: doneEvent.content, tool_calls: doneEvent.toolCalls });
          for (const call of doneEvent.toolCalls) {
            const args = safeParseArgs(call.function.arguments);
            const path = typeof args.path === "string" ? args.path : undefined;
            const isMutating = call.function.name === "write_file" || call.function.name === "replace_in_file" || call.function.name === "delete_file";
            // Captured before the tool actually runs -- this is the file's
            // real content one step ago, which is exactly what "undo" needs
            // to restore. undefined means the file didn't exist yet, so
            // undoing a write_file that created it means deleting it.
            const prevContent = isMutating && path ? filesRef.current[path] : undefined;

            const currentAction = describeCurrentAction(call.function.name, args);
            if (currentAction) setSendingStats((s) => (s ? { ...s, currentAction } : s));

            const result = await executeTool(call.function.name, args);
            agentMessages.push({ role: "tool", tool_call_id: call.id, content: result });
            setSendingStats((s) => (s ? { ...s, tasksRun: s.tasksRun + 1 } : s));

            if (call.function.name === "read_file" && path) {
              flushPendingRead();
              pendingRead = { path };
              continue;
            }

            const mergesWithPendingRead =
              pendingRead !== null &&
              path === pendingRead.path &&
              (call.function.name === "write_file" || call.function.name === "replace_in_file");
            if (!mergesWithPendingRead) flushPendingRead();

            const step = describeStep(call.function.name, args, result);
            if (step) {
              const revert = isMutating && path ? { path, prevContent } : undefined;
              // A write_file that replaced an existing, non-trivial file
              // with much shorter content is the concrete shape of the
              // model regenerating from memory instead of what was
              // actually there -- flag it visibly rather than letting it
              // look like any other successful step.
              let warning: string | undefined;
              if (call.function.name === "write_file" && path && typeof prevContent === "string" && prevContent.length > 200) {
                const newLength = filesRef.current[path]?.length ?? 0;
                if (newLength < prevContent.length * 0.5) {
                  warning = "This rewrite is much shorter than the file's previous version -- some of it may have been dropped.";
                }
              }
              const isDiffable = call.function.name === "write_file" || call.function.name === "replace_in_file";
              const diffStat =
                isDiffable && path && filesRef.current[path] !== undefined
                  ? lineDiffStat(prevContent, filesRef.current[path]) ?? undefined
                  : undefined;
              const label = mergesWithPendingRead
                ? `Read and ${step.label.charAt(0).toLowerCase()}${step.label.slice(1)}`
                : step.label;
              if (mergesWithPendingRead) pendingRead = null;
              setMessages((prev) => [...prev, { role: "assistant", content: label, step: true, id: newId(), revert, warning, diffStat, kind: step.kind }]);
            }
          }
          // Deliberately NOT flushing any still-pending read here at the
          // end of a turn -- the whole point is that the matching edit
          // usually arrives in the *next* turn (the model narrates in
          // between), so flushing per-turn would fire before that edit
          // ever shows up. It only gets flushed when something proves it
          // isn't coming: a non-matching call arrives (inside the loop
          // above), or the turn ends with no tool calls at all (the
          // zero-tool-calls branch above already flushes before returning).
        }
        // Hit the step cap without a natural stop -- flush whatever read is
        // still pending rather than dropping it silently.
        flushPendingRead();
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `This is taking more than ${MAX_STEPS} steps, so I'm pausing here rather than continuing unbounded. Everything done so far is saved in this chat -- just ask me to continue and I'll pick up exactly where I left off.`,
          },
        ]);
      } catch (err) {
        // A user-initiated stop() aborts the in-flight fetch -- not a real
        // failure, so it shouldn't surface as an error banner. Whatever
        // text had already streamed in stays in place, same as a
        // "stop generating" button elsewhere.
        if (err instanceof DOMException && err.name === "AbortError") {
          // no-op
        } else {
          setError(err instanceof Error ? err.message : "Something went wrong.");
        }
      } finally {
        abortControllerRef.current = null;
        setSending(false);
        setSendingStats(null);
      }
    },
    [messages, sending, executeTool]
  );

  // Lets the composer's Send button double as a Stop button while the
  // agent is mid-turn -- aborts the in-flight /api/build/turn fetch.
  // Doesn't attempt to cancel a tool call already in progress (a GitHub
  // push or Vercel deploy that's actually started keeps running), only
  // the network request for the model's own text/tool-call response.
  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  // Restores a single file to exactly what it was immediately before one
  // specific step ran (or deletes it, if that step is what created it) --
  // a real, one-click safety net for a bad AI edit, not just a warning
  // with no way back. Marks the step "reverted" so it can't be undone
  // twice and so the UI can show it struck through.
  const revertStep = useCallback((id: string) => {
    const step = messagesRef.current.find((m) => m.id === id);
    if (!step?.revert || step.reverted) return;
    const { path, prevContent } = step.revert;
    setFiles((prev) => {
      const next = { ...prev };
      if (prevContent === undefined) delete next[path];
      else next[path] = prevContent;
      filesRef.current = next;
      return next;
    });
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, reverted: true } : m)));
  }, []);

  const setFileContent = useCallback((path: string, content: string) => {
    setFiles((prev) => {
      const next = { ...prev, [path]: content };
      filesRef.current = next;
      return next;
    });
  }, []);

  const deleteFile = useCallback((path: string) => {
    setFiles((prev) => {
      const next = { ...prev };
      delete next[path];
      filesRef.current = next;
      return next;
    });
  }, []);

  // Starts a fresh, untitled project -- the previous one is already saved
  // in `projects` (via the upsert effect above), so nothing is lost, it
  // just stops being the active one until reopened from History.
  const reset = useCallback(() => {
    activeIdRef.current = null;
    filesRef.current = {};
    setFiles({});
    setMessages([]);
    setError(null);
    sandboxIdRef.current = undefined;
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(ACTIVE_ID_KEY);
    } catch {
      // localStorage unavailable (private mode, etc.) -- in-memory state
      // above already updated, so the app keeps working this session.
    }
  }, []);

  const openHistory = useCallback(() => setHistoryOpen(true), []);
  const closeHistory = useCallback(() => setHistoryOpen(false), []);

  const selectProject = useCallback((id: string) => {
    const found = projectsRef.current.find((p) => p.id === id);
    if (!found) return;
    activeIdRef.current = found.id;
    filesRef.current = found.files;
    setFiles(found.files);
    setMessages(found.messages);
    setError(null);
    sandboxIdRef.current = undefined;
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(ACTIVE_ID_KEY, found.id);
    } catch {
      // Non-fatal -- the switch to this project still works for the rest
      // of the session, it just might not survive a reload.
    }
    setHistoryOpen(false);
  }, []);

  const deleteProject = useCallback((id: string) => {
    const next = projectsRef.current.filter((p) => p.id !== id);
    projectsRef.current = next;
    setProjects(next);
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
    } catch {
      // Non-fatal -- see selectProject above.
    }
    if (activeIdRef.current === id) {
      activeIdRef.current = null;
      filesRef.current = {};
      setFiles({});
      setMessages([]);
      try {
        if (typeof window !== "undefined") window.localStorage.removeItem(ACTIVE_ID_KEY);
      } catch {
        // Non-fatal -- see selectProject above.
      }
    }
  }, []);

  const togglePinProject = useCallback((id: string) => {
    const next = projectsRef.current.map((p) => (p.id === id ? { ...p, pinned: !p.pinned } : p));
    projectsRef.current = next;
    setProjects(next);
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
    } catch {
      // Non-fatal -- see selectProject above.
    }
  }, []);

  return {
    files,
    messages,
    sending,
    sendingStats,
    error,
    send,
    stop,
    sessionTokens,
    revertStep,
    setFileContent,
    deleteFile,
    reset,
    projects,
    historyOpen,
    openHistory,
    closeHistory,
    selectProject,
    deleteProject,
    togglePinProject,
    pendingConfirmation,
    confirmPendingAction,
    localFolderName,
    connectLocalFolder,
    githubConnected,
    connectGithubNow,
    permissionMode,
    setPermissionMode,
    projectName: deriveProjectName(files, messages),
  };
}
