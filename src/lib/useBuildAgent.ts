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
export type DiffLine = { type: "add" | "remove" | "context"; text: string };

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
  // The actual added/removed/context lines behind diffStat's counts, for
  // a step's own real diff view (click to expand -- see BuildWorkspace.tsx)
  // instead of just the +N -M count. Windowed down to a couple of lines of
  // context around each change (collapseToDiffHunks), NOT the whole file,
  // so a huge rewrite's message doesn't bloat localStorage with thousands
  // of unchanged lines nobody asked to see.
  diffLines?: DiffLine[];
  // The real tool result behind a read_file/search_workspace/
  // get_file_outline/list_files/run_terminal_command step -- click to
  // expand (see BuildWorkspace.tsx), same idea as diffLines for a file
  // edit. Without this there was no way to actually see what a read/
  // search/outline step found, only a generic "Used a tool" label.
  detail?: string;
  // The specific file this step is about (read_file/write_file/
  // replace_in_file/delete_file/get_file_outline) -- lets a detail/diff
  // view pick real syntax highlighting for that file's language. Not the
  // same thing as revert.path: this is set for every path-bearing step,
  // not just mutating ones a revert makes sense for.
  path?: string;
  // Marks a generic step regardless of its specific label text ("command"
  // for run_terminal_command, "tool" for a read/search/outline call) so
  // summarizeSteps can still group/count these correctly once the label
  // itself becomes more descriptive than a single fixed phrase.
  kind?: "command" | "tool";
  // Data URLs of any images attached to this (user) message -- display
  // only. The actual image_url content parts sent to the model live only
  // in that one turn's API payload, not in this stored/displayed history.
  imageUrls?: string[];
  // True when this reply ended its turn with zero tool calls -- i.e. the
  // model described/promised an action ("deploying now", "let me try")
  // without actually invoking the matching tool. Read back on the NEXT
  // send() as stalledLastTurn so the server can nudge the model to act
  // instead of narrating the same promise again (see wordOverlapRatio's
  // comment for the same "give it a concrete fact, not just a prompt
  // rule" approach applied to a different repeat failure mode).
  noAction?: boolean;
};

export type BuildProject = {
  id: string;
  name: string;
  files: Record<string, string>;
  messages: BuildChatMessage[];
  lastActivity: number;
  pinned?: boolean;
  // Set once push_to_github succeeds for this project -- lets the sidebar
  // group it under "GitHub Projects" instead of "Folder Projects" (see
  // BuildWorkspace.tsx's History rail).
  githubRepoUrl?: string;
  // Set once deploy_to_vercel succeeds for this project -- from then on,
  // every write_file/replace_in_file/delete_file auto-redeploys (see
  // syncFilesToVercel) instead of needing deploy_to_vercel called (and
  // confirmed) again by hand. Independent of githubRepoUrl -- a project
  // can be pushed to GitHub, deployed to Vercel, both, or neither.
  vercelProjectName?: string;
  // Set once create_supabase_project succeeds for this project -- from
  // then on, run_supabase_sql can be called against it without creating a
  // new project first. Independent of githubRepoUrl/vercelProjectName --
  // a project can have any combination of the three.
  supabaseProjectRef?: string;
  // Set from the onboarding modal's mandatory "name your project" step --
  // only ever needed when the user got through onboarding without either
  // connecting GitHub or a folder, so the project would otherwise have no
  // real identity at all for the sidebar's History groups to key off of.
  manualGroupName?: string;
  // Set by the "Rename" menu action. Once present it overrides
  // deriveProjectName() forever after (see the upsert effect below), the
  // same way manualGroupName already overrides automatic grouping --
  // without this, renaming a project would get silently clobbered back to
  // its auto-derived name the next time a message is sent in it.
  customName?: string;
  // Set by "Archive" -- hidden from the main History list until "Show
  // archived" is turned on (BuildWorkspace.tsx's sort/group menu).
  archived?: boolean;
  // Set by "Mark as unread"; cleared automatically the next time this
  // project is actually opened (see selectProject).
  unread?: boolean;
};

// Multiple build projects persist side by side (like Private Chat's
// multi-thread history), not just one active session -- "New chat"
// starts a fresh one without throwing the previous project away; History
// lets the user come back and reopen any of them.
const PROJECTS_KEY = "chatgiza_build_projects_v1";
const ACTIVE_ID_KEY = "chatgiza_build_active_id_v1";
// Every GitHub repo a project of this user's has EVER been linked to,
// remembered even after every project under it gets deleted -- without
// this, deleting the last chat in a repo's History group made the whole
// group vanish (the group is otherwise derived purely from currently-
// existing projects), which read as ChatGiZa forgetting the repo itself
// rather than just that one conversation. Only ever added to, never
// pruned by deleteProject -- see the upsert effect below.
const KNOWN_GITHUB_REPOS_KEY = "chatgiza_build_known_github_repos_v1";
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

// Detects the model repeating the same SUBSTANCE across replies (not just
// the same opening word extractOpener/openerHint already discourage) --
// e.g. insisting on the same wrong claim/workaround a second time after
// the user has already pushed back on it once. A prompt instruction alone
// asking the model not to do this isn't reliable once it's already
// anchored on an earlier answer in the same conversation (observed live:
// it kept repeating a claim, then doubled down harder each time asked
// again) -- this is a real, code-level check the system does FOR the
// model, not something left entirely to it noticing on its own. Cheap
// word-overlap on purpose (not a real diff/embedding) -- this only needs
// to catch "restated most of the same paragraph again", not judge
// nuanced rewording.
function wordOverlapRatio(a: string, b: string): number {
  const words = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length > 0)
    );
  const setA = words(a);
  const setB = words(b);
  if (setA.size < 8 || setB.size < 8) return 0; // too short a reply to judge meaningfully
  let shared = 0;
  for (const w of setA) if (setB.has(w)) shared++;
  return shared / Math.max(setA.size, setB.size);
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
// Collapses a full line-by-line diff down to just the changed lines plus a
// couple lines of surrounding context (same idea as `git diff`'s default
// context window) -- a step's message is what actually gets persisted to
// localStorage as part of the project, so a one-line change deep inside a
// 2,000-line file should cost a few lines here, not the whole file.
const DIFF_CONTEXT_LINES = 2;
function collapseToDiffHunks(lines: DiffLine[]): DiffLine[] {
  const keep = new Array<boolean>(lines.length).fill(false);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].type === "context") continue;
    for (let k = Math.max(0, i - DIFF_CONTEXT_LINES); k <= Math.min(lines.length - 1, i + DIFF_CONTEXT_LINES); k++) {
      keep[k] = true;
    }
  }
  const result: DiffLine[] = [];
  let i = 0;
  while (i < lines.length) {
    if (keep[i]) {
      result.push(lines[i]);
      i++;
      continue;
    }
    let j = i;
    while (j < lines.length && !keep[j]) j++;
    const skipped = j - i;
    result.push({ type: "context", text: `⋯ ${skipped} unchanged line${skipped === 1 ? "" : "s"} ⋯` });
    i = j;
  }
  return result;
}

// A real +N -M line count (same idea as `git diff --stat`) AND the actual
// diff lines behind it (windowed via collapseToDiffHunks above), computed
// via standard LCS -- not just a length/character comparison, which would
// call a one-line change at the top of a long file "the whole file
// changed". O(n*m) time and space, so skipped above a size guard where
// that stops being worth it -- this runs synchronously on the main thread
// during an active multi-step build, so it needs to stay cheap, not just
// correct. Wrapped defensively: this is a label/UI enhancement, not
// something that should ever be able to take down a build turn if it
// misbehaves on some unanticipated file content.
function computeLineDiff(before: string | undefined, after: string): { added: number; removed: number; lines: DiffLine[] } | null {
  try {
    // undefined (brand-new file) means zero lines, NOT one empty line --
    // "".split("\n") returns [""], which used to make a new file's diff
    // count a phantom removed line (an empty string LCS-matching nothing
    // in the new content) on top of every real added line.
    const beforeLines = before === undefined ? [] : before.split("\n");
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
    const lines: DiffLine[] = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (beforeLines[i] === afterLines[j]) {
        lines.push({ type: "context", text: beforeLines[i] });
        i++;
        j++;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
        lines.push({ type: "remove", text: beforeLines[i] });
        i++;
      } else {
        lines.push({ type: "add", text: afterLines[j] });
        j++;
      }
    }
    while (i < n) {
      lines.push({ type: "remove", text: beforeLines[i] });
      i++;
    }
    while (j < m) {
      lines.push({ type: "add", text: afterLines[j] });
      j++;
    }
    return { added: m - lcsLength, removed: n - lcsLength, lines: collapseToDiffHunks(lines) };
  } catch (err) {
    console.error("computeLineDiff failed, skipping the diff view for this step:", err);
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
): { label: string; kind?: "command" | "tool"; detail?: string; path?: string } | null {
  const path = typeof args.path === "string" ? args.path : undefined;
  switch (name) {
    case "write_file":
      return { label: `Wrote ${String(args.path ?? "")}`, path };
    case "replace_in_file":
      return result.startsWith("Edited ") ? { label: `Edited ${String(args.path ?? "")}`, path } : null;
    case "delete_file":
      return { label: `Deleted ${String(args.path ?? "")}`, path };
    case "push_to_github":
    case "deploy_to_vercel":
    case "create_supabase_project":
    case "run_supabase_sql":
      return { label: result };
    case "run_terminal_command":
      return { label: describeCommand(typeof args.command === "string" ? args.command : ""), kind: "command", detail: result };
    // A specific, real label ("Read X", "Searched Y") instead of a generic
    // "Used a tool" for every one of these -- and the real result kept as
    // `detail` so a click can actually show what was read/found, not just
    // that a tool ran. Previously the label was deliberately generic and
    // the result thrown away entirely; per feedback, every step here
    // should behave the same way a file edit's own diff does (a specific
    // line, with a real detail view behind it).
    case "read_file":
      return { label: `Read ${String(args.path ?? "")}`, kind: "tool", detail: result, path };
    case "list_files":
      return { label: "Listed files", kind: "tool", detail: result };
    case "search_workspace":
      return { label: `Searched ${String(args.query ?? "")}`, kind: "tool", detail: result };
    case "get_file_outline":
      return { label: `Outlined ${String(args.path ?? "")}`, kind: "tool", detail: result, path };
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
    case "create_supabase_project":
      return "Creating Supabase project…";
    case "run_supabase_sql":
      return "Updating the database…";
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
// A fresh Supabase project genuinely takes a few minutes to provision
// (unlike a GitHub push or Vercel deployment) -- a longer interval and a
// longer cap than the Vercel deploy poll above.
const SUPABASE_POLL_INTERVAL_MS = 5000;
const SUPABASE_MAX_POLLS = 48; // ~4 minutes

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

export type ConnectResult = "connected" | "blocked" | "not_configured" | "failed";

// Opens the OAuth popup for `service` if it isn't already connected, and
// waits for it to close before resolving -- lets push_to_github/
// deploy_to_vercel ask for the connection only when actually needed,
// triggered by the agent itself rather than a manual "Connect" button.
//
// The popup is opened blank, SYNCHRONOUSLY, before any of this function's
// own awaits -- not after the /api/connectors and /start round trips
// resolve (the previous order). Every browser's popup blocker only
// allows window.open() when it judges the call a direct, immediate
// response to a user gesture (the click that invoked this); two network
// round trips' worth of delay was often enough for that judgment to
// expire, so the exact same click would open the popup some of the time
// and get silently blocked other times, depending on nothing more than
// how fast those two requests happened to come back. Opening a blank
// window first and only pointing it at the real URL once /start resolves
// keeps the whole thing inside that same synchronous click.
// Once a service is confirmed connected in this page session, every later
// call skips the popup dance below entirely instead of re-opening (and
// immediately closing) a blank tab just to re-confirm what's already
// known. Without this, a repo-scoped project whose agent turn calls
// push_to_github/deploy_to_vercel more than once (on top of
// syncFilesToGithub's own automatic push) flashed a blank tab open-and-
// shut each time -- harmless, but read as something failing.
const connectedThisSession: Partial<Record<"github" | "vercel" | "supabase", true>> = {};

async function ensureConnected(service: "github" | "vercel" | "supabase"): Promise<ConnectResult> {
  if (connectedThisSession[service]) return "connected";

  // Deliberately WITHOUT noopener/noreferrer here, unlike a normal
  // external link -- both make window.open() return null even though a
  // window really did open (that's the whole point of noopener: deny the
  // opener a handle back). This function needs that handle to point the
  // still-blank window at the real URL once /start resolves below; opened
  // this way, the popup was blank forever, with no error and no visible
  // sign anything had gone wrong. The destination (github.com/vercel.com)
  // is trusted, so skipping these here is a fair trade.
  const popup = window.open("", "_blank");

  // A network hiccup, a cold-start blip, KV briefly unavailable -- any of
  // these throwing used to leave the caller's await hanging forever (an
  // unhandled rejection never resolves), which from the user's side looks
  // exactly like a popup that quietly vanished: the button just says
  // "Connecting..." indefinitely with no way out short of a refresh. Now
  // it resolves to "failed" instead, same as a clean failure would.
  try {
    const statusRes = await fetch("/api/connectors");
    const statusData = await statusRes.json();
    const entry = (statusData.connectors ?? []).find((c: { id: string }) => c.id === service);
    if (entry?.connected) {
      connectedThisSession[service] = true;
      popup?.close();
      return "connected";
    }
    if (!entry?.configured) {
      popup?.close();
      return "not_configured";
    }
    // Only NOW can a null popup be trusted as a genuine block -- earlier
    // than this it could just as easily have been the timing issue above.
    if (!popup) return "blocked";

    const startRes = await fetch(`/api/connectors/${service}/start`, { method: "POST" });
    const startData = await startRes.json();
    if (!startRes.ok || !startData.url) {
      popup.close();
      return "failed";
    }
    popup.location.href = startData.url;

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
    if (recheckEntry?.connected) {
      connectedThisSession[service] = true;
      return "connected";
    }
    return "failed";
  } catch (err) {
    console.error(`ensureConnected(${service}) failed:`, err);
    popup?.close();
    return "failed";
  }
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
  kind:
    | "push_to_github"
    | "deploy_to_vercel"
    | "create_supabase_project"
    | "run_supabase_sql"
    | "deploy_supabase_function"
    | "reconnect_service"
    | "run_terminal_command"
    | "write_file"
    | "replace_in_file"
    | "delete_file";
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
  // Real transcript of every run_terminal_command call this session -- the
  // Terminal button's bottom panel just renders this list; nothing here is
  // simulated, each entry is the actual command sent to /api/build/execute
  // and the actual output (or error) it returned.
  const [terminalHistory, setTerminalHistory] = useState<{ command: string; output: string }[]>([]);
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
  const [knownGithubRepos, setKnownGithubRepos] = useState<{ name: string; url: string }[]>([]);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KNOWN_GITHUB_REPOS_KEY);
      if (raw) setKnownGithubRepos(JSON.parse(raw));
    } catch {
      // corrupted/unavailable storage -- start with an empty list
    }
  }, []);
  const rememberGithubRepo = useCallback((url: string) => {
    const name = url.split("/").filter(Boolean).pop() || url;
    setKnownGithubRepos((prev) => {
      if (prev.some((r) => r.url === url)) return prev;
      const next = [...prev, { name, url }];
      try {
        window.localStorage.setItem(KNOWN_GITHUB_REPOS_KEY, JSON.stringify(next));
      } catch {
        // Non-fatal -- the repo's group just won't survive a reload after
        // its last project is deleted, same as before this existed.
      }
      return next;
    });
  }, []);
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
  // Set by the onboarding modal's "name your project" step right before
  // the deferred first message finally goes out -- the upsert effect below
  // reads it exactly once, when it mints a brand-new project id, then
  // clears it so it never leaks onto some later, unrelated project.
  const pendingManualGroupNameRef = useRef<string | null>(null);
  // Same idea as pendingManualGroupNameRef, for starting a fresh chat
  // from a GitHub-repo group's own "+" (see BuildWorkspace.tsx) -- the
  // new project is born already tied to that repo, so it skips the
  // "Where should this project live?" onboarding entirely.
  const pendingGithubRepoUrlRef = useRef<string | null>(null);
  // Same idea, for a Vercel-project group's own "+".
  const pendingVercelProjectNameRef = useRef<string | null>(null);
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
    const isNewProject = activeIdRef.current === null;
    const id = activeIdRef.current ?? newId();
    activeIdRef.current = id;
    const prev = projectsRef.current;
    const idx = prev.findIndex((p) => p.id === id);
    // Only consumed on the very first save of a brand-new project -- an
    // existing project just carries its own already-set value forward
    // forever after, same as githubRepoUrl below.
    const manualGroupName = isNewProject ? pendingManualGroupNameRef.current ?? undefined : prev[idx]?.manualGroupName;
    if (isNewProject) pendingManualGroupNameRef.current = null;
    const githubRepoUrl = isNewProject ? pendingGithubRepoUrlRef.current ?? undefined : prev[idx]?.githubRepoUrl;
    if (isNewProject) pendingGithubRepoUrlRef.current = null;
    const vercelProjectName = isNewProject ? pendingVercelProjectNameRef.current ?? undefined : prev[idx]?.vercelProjectName;
    if (isNewProject) pendingVercelProjectNameRef.current = null;
    // Carry the pin (and customName/archived/unread) forward -- without
    // this, every message sent in a pinned/renamed/archived/unread project
    // would silently reset it again on the next save.
    const customName = idx >= 0 ? prev[idx].customName : undefined;
    const entry: BuildProject = {
      id,
      name: customName ?? deriveProjectName(files, messages),
      files,
      messages,
      lastActivity: Date.now(),
      pinned: idx >= 0 ? prev[idx].pinned : undefined,
      githubRepoUrl,
      vercelProjectName,
      // Never set via a "pending" ref like githubRepoUrl/vercelProjectName
      // above -- a Supabase project is only ever created by the agent's
      // own create_supabase_project tool mid-conversation, never as part
      // of onboarding a brand-new project, so there's nothing to consume
      // on the very first save.
      supabaseProjectRef: idx >= 0 ? prev[idx]?.supabaseProjectRef : undefined,
      manualGroupName,
      customName,
      archived: idx >= 0 ? prev[idx].archived : undefined,
      unread: idx >= 0 ? prev[idx].unread : undefined,
    };
    const next = idx >= 0 ? [...prev.slice(0, idx), entry, ...prev.slice(idx + 1)] : [entry, ...prev];
    projectsRef.current = next;
    setProjects(next);
    persistProjects(next, id);
    if (githubRepoUrl) rememberGithubRepo(githubRepoUrl);
  }, [files, messages, rememberGithubRepo]);

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

  // Mirrors every file write to the connected GitHub repo too, the same
  // spirit as writeFileToLocalFolder mirroring to a connected local
  // folder -- except a project only gets a githubRepoUrl by being
  // started from that repo's own "+" in History (see
  // BuildWorkspace.tsx's group header), never as a side effect of the
  // agent's own push_to_github tool (that one stays an explicit,
  // confirmed, one-time action for a project that ISN'T already
  // repo-scoped this way). Debounced a couple seconds so a burst of
  // several write_file/replace_in_file/delete_file calls in the same
  // turn becomes one commit, not one per file -- still best-effort:
  // logged, never thrown, same as the local-folder mirror.
  const githubSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const githubSyncPushingRef = useRef(false);
  const syncFilesToGithub = useCallback(() => {
    const project = projectsRef.current.find((p) => p.id === activeIdRef.current);
    const repoUrl = project?.githubRepoUrl;
    if (!repoUrl) return;
    if (githubSyncTimeoutRef.current) clearTimeout(githubSyncTimeoutRef.current);
    githubSyncTimeoutRef.current = setTimeout(async () => {
      githubSyncTimeoutRef.current = null;
      // A push from an even earlier burst is still in flight -- that one
      // will already carry these same latest files once it starts
      // (filesRef.current is read fresh inside it), so there's nothing
      // for this tick to do; the timeout firing at all already means no
      // newer write has come in since.
      if (githubSyncPushingRef.current) return;
      githubSyncPushingRef.current = true;
      try {
        const repoName = repoUrl.split("/").filter(Boolean).pop() || repoUrl;
        const res = await fetch("/api/build/github/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: filesRef.current, repoName, commitMessage: "Update from ChatGiZa Build" }),
        });
        if (!res.ok) console.error("Auto-sync to GitHub failed:", res.status, await res.text());
      } catch (err) {
        console.error("Auto-sync to GitHub failed:", err);
      } finally {
        githubSyncPushingRef.current = false;
      }
    }, 2500);
  }, []);

  // Same idea as syncFilesToGithub, for a project that's already
  // Vercel-deployed (vercelProjectName set) -- a fresh production
  // deployment per debounced burst of edits, with no confirmation and no
  // separate deploy_to_vercel call needed. Fire-and-forget: unlike the
  // agent's own deploy_to_vercel tool call, nothing here waits for the
  // build to finish or reports a URL back into the conversation -- this
  // is a background sync, not something the user asked to see the
  // result of right now.
  const vercelSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vercelSyncDeployingRef = useRef(false);
  const syncFilesToVercel = useCallback(() => {
    const project = projectsRef.current.find((p) => p.id === activeIdRef.current);
    const projectName = project?.vercelProjectName;
    if (!projectName) return;
    if (vercelSyncTimeoutRef.current) clearTimeout(vercelSyncTimeoutRef.current);
    vercelSyncTimeoutRef.current = setTimeout(async () => {
      vercelSyncTimeoutRef.current = null;
      if (vercelSyncDeployingRef.current) return;
      vercelSyncDeployingRef.current = true;
      try {
        const res = await fetch("/api/build/vercel/deploy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: filesRef.current, projectName }),
        });
        if (!res.ok) console.error("Auto-deploy to Vercel failed:", res.status, await res.text());
      } catch (err) {
        console.error("Auto-deploy to Vercel failed:", err);
      } finally {
        vercelSyncDeployingRef.current = false;
      }
    }, 2500);
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
  // Returns the connected folder's real name on success (so a caller can
  // stamp it straight onto the project -- see setPendingManualGroupName --
  // without depending on the stale localFolderName closure of whatever
  // render it was called from), or null on failure/cancel.
  const connectLocalFolder = useCallback(async (): Promise<string | null> => {
    const picker = (window as unknown as { showDirectoryPicker?: () => Promise<FsDirHandle> }).showDirectoryPicker;
    if (!picker) return null;
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
      return handle.name;
    } catch (err) {
      // AbortError is just "the user closed the picker without choosing".
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        console.error("Local folder connection failed:", err);
      }
      return null;
    }
  }, [writeFileToLocalFolder]);

  const connectGithubNow = useCallback(async (): Promise<ConnectResult> => {
    const result = await ensureConnected("github");
    setGithubConnected(result === "connected");
    return result;
  }, []);

  // Lets the user switch to a DIFFERENT account for a service without
  // hunting down a disconnect button first -- clears both layers that
  // would otherwise make ensureConnected silently keep reusing the old
  // account: connectedThisSession's in-memory cache (which would skip the
  // popup entirely) and the actual stored token server-side (which would
  // make the popup's own account-already-authorized shortcut re-select
  // the same old account). Once both are cleared, ensureConnected behaves
  // exactly like a first-ever connect, prompting fresh.
  const reconnectService = useCallback(async (service: "github" | "vercel" | "supabase"): Promise<ConnectResult> => {
    delete connectedThisSession[service];
    try {
      await fetch(`/api/connectors/${service}`, { method: "DELETE" });
    } catch (err) {
      console.error(`Failed to clear the old ${service} connection before reconnecting:`, err);
    }
    return ensureConnected(service);
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
      "create_supabase_project",
      "run_supabase_sql",
      "deploy_supabase_function",
      "reconnect_service",
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
        syncFilesToGithub();
        syncFilesToVercel();
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
        syncFilesToGithub();
        syncFilesToVercel();
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
        syncFilesToGithub();
        syncFilesToVercel();
        return `Edited ${path} (${content.length} characters).`;
      }
      case "push_to_github": {
        const repoName = args.repoName as string;
        if (Object.keys(filesRef.current).length === 0) return "No files to push yet.";
        // A DIFFERENT existing chat already owns this exact repo name --
        // pushing from here anyway would silently send this chat's own,
        // completely unrelated files into that repo's PR branch, diverging
        // its real history with no warning anything was wrong. This is
        // exactly what starting a brand-new chat (instead of reopening the
        // existing one, or that repo's own "+" in History) and asking it
        // to push looks like from the outside -- refuse instead of quietly
        // corrupting the other chat's real repo.
        const conflictingProject = projectsRef.current.find(
          (p) =>
            p.id !== activeIdRef.current &&
            p.githubRepoUrl &&
            p.githubRepoUrl.split("/").filter(Boolean).pop() === repoName
        );
        if (conflictingProject) {
          return (
            `"${repoName}" is already the GitHub repo for a different existing chat ("${conflictingProject.name}") -- ` +
            "pushing from THIS chat would send this chat's own, different files into that same repo instead of " +
            "continuing the real project. Tell the user this repo already belongs to another chat, and they should " +
            "reopen that chat (or use that repo's own \"+\" in History) to continue it there instead of here. Do not " +
            "push again unless they explicitly confirm they want to push a different, unrelated project to this same repo name."
          );
        }
        const connected = await ensureConnected("github");
        if (connected === "blocked") {
          return "The user's browser blocked the GitHub connect popup. Tell them to allow popups for this site (check the browser's address bar for a blocked-popup icon) and try again.";
        }
        if (connected !== "connected") {
          return (
            "GitHub isn't connected yet. A sign-in window should have opened -- tell the user: sign in there (or " +
            "create a free GitHub account first if they don't have one), then approve the connection. If the " +
            "window closed before they finished (or they weren't ready), that's fine -- just ask you to push again " +
            "once they've connected, and it'll continue automatically from there with no further setup needed."
          );
        }
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
          if (activeIdRef.current) setProjectGithubRepo(activeIdRef.current, data.repoUrl);
          return data.prUrl
            ? `Pushed to GitHub as a pull request for review: ${data.prUrl} (repo: ${data.repoUrl}). Tell the user their existing repo already has content, so this update is waiting on a PR instead of landing on main directly -- merging it is their call.`
            : `Pushed to GitHub: ${data.repoUrl}`;
        } catch {
          return "Push failed: network error.";
        }
      }
      case "deploy_to_vercel": {
        const projectName = args.projectName as string;
        if (Object.keys(filesRef.current).length === 0) return "No files to deploy yet.";
        const connected = await ensureConnected("vercel");
        if (connected === "blocked") {
          return "The user's browser blocked the Vercel connect popup. Tell them to allow popups for this site (check the browser's address bar for a blocked-popup icon) and try again.";
        }
        if (connected !== "connected") {
          return (
            "Vercel isn't connected yet. A sign-in window should have opened -- tell the user: sign in there (or " +
            "create a free Vercel account first if they don't have one), then approve the connection. If the " +
            "window closed before they finished, that's fine -- just ask you to deploy again once they've " +
            "connected, and it'll continue automatically from there with no further setup needed."
          );
        }
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
          if (activeIdRef.current) setProjectVercelName(activeIdRef.current, projectName);

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
      case "create_supabase_project": {
        const activeProject = projectsRef.current.find((p) => p.id === activeIdRef.current);
        if (activeProject?.supabaseProjectRef) {
          return `This project is already connected to Supabase project ${activeProject.supabaseProjectRef} -- use run_supabase_sql for schema changes instead of creating another one.`;
        }
        const name = args.name as string;
        const connected = await ensureConnected("supabase");
        if (connected === "blocked") {
          return "The user's browser blocked the Supabase connect popup. Tell them to allow popups for this site (check the browser's address bar for a blocked-popup icon) and try again.";
        }
        if (connected === "not_configured") {
          return "Supabase isn't set up on ChatGiZa's side yet -- tell the user this feature isn't available right now.";
        }
        if (connected !== "connected") {
          return (
            "Supabase isn't connected yet. A sign-in window should have opened -- tell the user: if they don't " +
            "already have a Supabase account, they can create one right there (it takes a minute, may need email " +
            "verification), then sign in and approve the connection. If the window closed before they finished " +
            "signing up or verifying, that's completely fine -- just ask you to create the database again once " +
            "they're actually connected, and it'll continue automatically from there with no further setup needed. " +
            "Also mention the alternative: if they already have an existing Supabase project, they can instead just " +
            "paste its Project URL and anon/service-role keys (from Supabase's own Settings -> API page) directly " +
            "in chat, and you'll wire those into .env yourself immediately -- no connecting required in that case."
          );
        }
        const allowed = await requestConfirmation(
          "create_supabase_project",
          "Allow ChatGiZa to create a new Supabase project (a real database) for this app?",
          name
        );
        if (!allowed) return `The user declined to create a Supabase project named "${name}". Do not retry; ask what they'd like instead if relevant.`;
        try {
          const res = await fetch("/api/build/supabase/create-project", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
          });
          const data = await res.json();
          if (!res.ok) return `Supabase project creation failed: ${data.error ?? "unknown error"}`;
          const projectRef = data.projectRef as string;
          if (activeIdRef.current) setProjectSupabaseRef(activeIdRef.current, projectRef);

          for (let i = 0; i < SUPABASE_MAX_POLLS; i++) {
            await new Promise((r) => setTimeout(r, SUPABASE_POLL_INTERVAL_MS));
            const statusRes = await fetch(`/api/build/supabase/create-project/${projectRef}/status`);
            const statusData = await statusRes.json();
            if (!statusRes.ok) return `Supabase project creation failed while checking status: ${statusData.error ?? "unknown error"}`;
            if (statusData.ready) {
              const env = statusData.env as Record<string, string>;
              const existing = filesRef.current[".env"] ?? "";
              const keptLines = existing.split("\n").filter((line) => {
                const key = line.split("=")[0]?.trim();
                return key && !(key in env);
              });
              const newLines = Object.entries(env).map(([key, value]) => `${key}=${value}`);
              const content = [...keptLines, ...newLines].filter((l) => l.length > 0).join("\n") + "\n";
              const next = { ...filesRef.current, ".env": content };
              filesRef.current = next;
              setFiles(next);
              void writeFileToLocalFolder(".env", content);
              syncFilesToGithub();
              syncFilesToVercel();
              return (
                `Created Supabase project (ref: ${projectRef}) in organization "${data.orgName}" and added its ` +
                `connection details to .env. Use NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in ` +
                `client-side code, SUPABASE_SERVICE_ROLE_KEY only in server-side code (never expose it to the ` +
                `browser), and DATABASE_URL for any direct Postgres/ORM access. Use run_supabase_sql to create ` +
                `tables or change the schema.`
              );
            }
          }
          return "The Supabase project is still provisioning -- this can take a few minutes. It's already linked to this project, so schema changes can be tried again shortly.";
        } catch {
          return "Supabase project creation failed: network error.";
        }
      }
      case "run_supabase_sql": {
        const activeProject = projectsRef.current.find((p) => p.id === activeIdRef.current);
        const projectRef = activeProject?.supabaseProjectRef;
        if (!projectRef) return "This project isn't connected to Supabase yet -- call create_supabase_project first.";
        const sql = (args.sql as string) ?? "";
        if (!sql.trim()) return "No SQL given.";
        const allowed = await requestConfirmation("run_supabase_sql", "Allow ChatGiZa to run this database change on Supabase?", sql);
        if (!allowed) return "The user declined to run this database change. Do not retry; ask what they'd like instead if relevant.";
        try {
          const res = await fetch("/api/build/supabase/sql", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectRef, sql }),
          });
          const data = await res.json();
          if (!res.ok) return `Database change failed: ${data.error ?? "unknown error"}`;
          return "Database change applied successfully.";
        } catch {
          return "Database change failed: network error.";
        }
      }
      case "deploy_supabase_function": {
        const activeProject = projectsRef.current.find((p) => p.id === activeIdRef.current);
        const projectRef = activeProject?.supabaseProjectRef;
        if (!projectRef) return "This project isn't connected to Supabase yet -- call create_supabase_project first.";
        const slug = args.slug as string;
        const files = args.files as Record<string, string> | undefined;
        const entrypoint = (args.entrypoint as string | undefined) || "index.ts";
        const secrets = args.secrets as Record<string, string> | undefined;
        if (!slug || !files || Object.keys(files).length === 0) return "slug and files are required.";
        const allowed = await requestConfirmation(
          "deploy_supabase_function",
          `Allow ChatGiZa to deploy the "${slug}" Edge Function to Supabase?`,
          Object.entries(files)
            .map(([path, content]) => `// ${path}\n${content}`)
            .join("\n\n")
        );
        if (!allowed) return `The user declined to deploy the "${slug}" function. Do not retry; ask what they'd like instead if relevant.`;
        try {
          const res = await fetch("/api/build/supabase/deploy-function", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectRef, slug, files, entrypoint, secrets }),
          });
          const data = await res.json();
          if (!res.ok) return `Function deploy failed: ${data.error ?? "unknown error"}`;
          return (
            `Deployed the "${data.slug}" Edge Function: ${data.url} . Any secrets passed were set as real Supabase ` +
            "project secrets (Deno.env.get in the function), not written anywhere the browser can read. Write the " +
            "app's own client-side code to call this URL instead of the third-party API directly."
          );
        } catch {
          return "Function deploy failed: network error.";
        }
      }
      case "reconnect_service": {
        const service = args.service as "github" | "vercel" | "supabase" | undefined;
        if (service !== "github" && service !== "vercel" && service !== "supabase") {
          return "service must be one of: github, vercel, supabase.";
        }
        const allowed = await requestConfirmation(
          "reconnect_service",
          `Allow ChatGiZa to disconnect the current ${service} account and connect a different one?`,
          service
        );
        if (!allowed) return `The user declined to switch ${service} accounts. Do not retry; ask what they'd like instead if relevant.`;
        const result = await reconnectService(service);
        if (result === "blocked") {
          return `The user's browser blocked the ${service} connect popup. Tell them to allow popups for this site (check the browser's address bar for a blocked-popup icon) and try again.`;
        }
        if (result === "not_configured") {
          return `${service} isn't set up on ChatGiZa's side yet -- tell the user this feature isn't available right now.`;
        }
        if (result !== "connected") {
          return (
            `The old ${service} connection was cleared, and a fresh sign-in window should have opened -- tell the ` +
            "user to sign in with the DIFFERENT account they want to use and approve the connection there. If the " +
            "window closed before they finished, that's fine -- just ask you to try again once they're connected " +
            "with the right account."
          );
        }
        return `Connected to a new ${service} account. Ready to continue -- ask what they'd like to do with it (push, deploy, create a database, etc.).`;
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
          if (!res.ok) {
            setTerminalHistory((prev) => [...prev, { command, output: `Command failed: ${data.error ?? "unknown error"}` }]);
            return `Command failed: ${data.error ?? "unknown error"}`;
          }
          sandboxIdRef.current = data.sandboxId;
          const output = data.output || "(command produced no output)";
          setTerminalHistory((prev) => [...prev, { command, output }]);
          return output;
        } catch {
          setTerminalHistory((prev) => [...prev, { command, output: "Command failed: network error." }]);
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

      // True when the model's last two real replies (before this new user
      // message) were substantially the same -- see wordOverlapRatio's own
      // comment. Checked BEFORE this turn's request goes out (not after
      // the response streams back) since a streamed reply is already on
      // screen by the time it finishes -- there's no "decide whether to
      // show it" moment after the fact, so the only place to actually stop
      // a third repeat is by warning the model before it generates one.
      const recentFinalAnswers = messages
        .filter((m) => m.role === "assistant" && !m.step && m.content.trim())
        .slice(-2)
        .map((m) => m.content);
      const possibleRepeat =
        recentFinalAnswers.length === 2 && wordOverlapRatio(recentFinalAnswers[0], recentFinalAnswers[1]) > 0.6;

      // True when the model's last real reply ended its turn without
      // calling any tool at all -- see BuildChatMessage.noAction's comment.
      // Unlike possibleRepeat, this doesn't need a word-overlap check: a
      // short "I'll try now"/"deploying..." stall is exactly the failure
      // case wordOverlapRatio's own length guard (>=8 words each side) was
      // built to ignore, since it targets long fabricated-explanation
      // repeats, not short stalls that vary their wording every time.
      const lastRealAssistant = [...messages].reverse().find((m) => m.role === "assistant" && !m.step);
      const stalledLastTurn = lastRealAssistant?.noAction === true;

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
      // Holds a read_file's own result/path until it's clear whether the
      // model's very next tool call is an edit of that SAME file -- not to
      // merge them into one message (each keeps its own real, independently
      // expandable detail/diff -- see BuildWorkspace.tsx's summarizeSteps
      // special-casing a [read, matching edit] pair), but so the read still
      // lands immediately before its edit in the transcript even when the
      // model narrates a sentence in between the two tool calls, keeping
      // them one consecutive (and so groupable) run of step messages.
      let pendingRead: { path: string; detail: string } | null = null;
      const flushPendingRead = () => {
        if (!pendingRead) return;
        const { path, detail } = pendingRead;
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Read ${path}`, step: true, id: newId(), kind: "tool" as const, detail, path },
        ]);
        pendingRead = null;
      };

      // Mutable copy of stalledLastTurn -- starts at the historical value
      // (computed above from the LAST send() call's outcome) but flips to
      // true the moment ANY stall is observed within THIS loop, so the
      // very next retry already carries the corrective hint instead of
      // only some future call. autoStallRetries bounds how many times the
      // loop is allowed to silently retry a stall on the user's behalf
      // (see the toolCalls.length === 0 branch below) -- every stall gets
      // retried automatically now (not just a second consecutive one --
      // see that branch's comment for why), capped so a genuinely stuck
      // request still hands control back instead of burning turns
      // forever.
      let stalledForFetch = stalledLastTurn;
      let autoStallRetries = 0;
      const MAX_AUTO_STALL_RETRIES = 2;

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
            body: JSON.stringify({ messages: agentMessages, files: filesRef.current, recentOpeners, possibleRepeat, stalledLastTurn: stalledForFetch }),
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
            // Tagged noAction so the NEXT send() can tell the server this
            // reply ended without calling any tool -- see BuildChatMessage.
            // noAction's own comment for why this matters: without it, a
            // model that narrates "trying now" instead of acting looks
            // identical to a real finished answer, and the user has to
            // keep manually nudging it. Done BEFORE flushPendingRead() (and
            // by scanning for the last non-step assistant message rather
            // than assuming "the last message in the array") because
            // flushPendingRead appends its own step message -- tagging
            // after that flush, or by array position, would land noAction
            // on that read step instead of the real narration, and
            // stalledLastTurn's lookup filters step messages out entirely,
            // so a mistagged flag there would silently never be seen.
            if (!streamedAny) {
              setMessages((prev) => [...prev, { role: "assistant", content: doneEvent!.content ?? "", noAction: true }]);
            } else {
              setMessages((prev) => {
                const idx = [...prev].reverse().findIndex((m) => m.role === "assistant" && !m.step);
                if (idx === -1) return prev;
                const realIdx = prev.length - 1 - idx;
                const next = [...prev];
                next[realIdx] = { ...next[realIdx], noAction: true };
                return next;
              });
            }
            flushPendingRead();
            // Retry immediately and silently, every time -- live-verified
            // that waiting for a SECOND consecutive stall before retrying
            // still left a real, reported case stuck (the model narrated
            // "let me check", produced nothing, and the conversation just
            // sat there with no further action and no automatic recovery,
            // since that was still only the first stall in its own chain).
            // The user should never have to manually type "endelea" to
            // unstick this -- so now every zero-tool-call reply gets an
            // automatic in-loop retry with the corrective hint, up to
            // MAX_AUTO_STALL_RETRIES, before control ever goes back to the
            // user. This does cost an extra call on the rare genuine
            // finished-answer/question case (the model just gets a chance
            // to confirm "no further action needed" and that becomes the
            // shown reply instead), but a spurious extra turn is a far
            // smaller cost than a build silently going nowhere.
            stalledForFetch = true;
            if (autoStallRetries < MAX_AUTO_STALL_RETRIES) {
              autoStallRetries++;
              agentMessages.push({ role: "assistant", content: doneEvent.content ?? "" });
              continue;
            }
            return;
          }

          // A real tool call happened -- this turn is no longer stalled,
          // and any earlier stall in this same loop is resolved, so later
          // steps get a clean slate instead of being auto-retried off the
          // back of a problem that's already been fixed.
          stalledForFetch = false;
          autoStallRetries = 0;

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
              pendingRead = { path, detail: result };
              continue;
            }

            // A pending read always flushes as ITS OWN real message right
            // before whatever comes next (an edit of that same file or
            // not) -- it never merges into the following step's message.
            // The two end up consecutive, independently-expandable step
            // messages; when the next one is a matching edit,
            // BuildWorkspace.tsx's summarizeSteps recognizes that exact
            // [read, matching edit] pair and gives the pair the combined
            // "Read and edited X" summary label while keeping each step's
            // own detail/diff intact underneath.
            flushPendingRead();

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
              const diff =
                isDiffable && path && filesRef.current[path] !== undefined
                  ? computeLineDiff(prevContent, filesRef.current[path]) ?? undefined
                  : undefined;
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: step.label,
                  step: true,
                  id: newId(),
                  revert,
                  warning,
                  diffStat: diff ? { added: diff.added, removed: diff.removed } : undefined,
                  diffLines: diff?.lines,
                  detail: step.detail,
                  path: step.path,
                  kind: step.kind,
                },
              ]);
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

  // Replaces the whole file map at once, for loading a real GitHub repo's
  // existing content into a just-reset project (see BuildWorkspace.tsx's
  // startNewChatInGroup) -- unlike setFileContent/deleteFile, which only
  // ever add or remove one file at a time as the agent works.
  const loadImportedFiles = useCallback((imported: Record<string, string>) => {
    filesRef.current = imported;
    setFiles(imported);
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
    setTerminalHistory([]);
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
    setTerminalHistory([]);
    sandboxIdRef.current = undefined;
    // Opening a project always marks it read, same as any chat/email list.
    if (found.unread) {
      const next = projectsRef.current.map((p) => (p.id === id ? { ...p, unread: false } : p));
      projectsRef.current = next;
      setProjects(next);
      try {
        if (typeof window !== "undefined") window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
      } catch {
        // Non-fatal -- see below.
      }
    }
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

  // Marks the given project as GitHub-backed once push_to_github succeeds
  // for it -- moves it into the sidebar's "GitHub Projects" group from
  // then on, alongside every other project of its persisted fields.
  const setProjectGithubRepo = useCallback((id: string, url: string) => {
    const next = projectsRef.current.map((p) => (p.id === id ? { ...p, githubRepoUrl: url } : p));
    projectsRef.current = next;
    setProjects(next);
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
    } catch {
      // Non-fatal -- see selectProject above.
    }
    rememberGithubRepo(url);
  }, [rememberGithubRepo]);

  // Same idea as setProjectGithubRepo, marking the project Vercel-backed
  // once deploy_to_vercel succeeds -- from then on every file write
  // auto-redeploys (syncFilesToVercel) instead of needing another
  // confirmed deploy_to_vercel call.
  const setProjectVercelName = useCallback((id: string, name: string) => {
    const next = projectsRef.current.map((p) => (p.id === id ? { ...p, vercelProjectName: name } : p));
    projectsRef.current = next;
    setProjects(next);
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
    } catch {
      // Non-fatal -- see selectProject above.
    }
  }, []);

  // Same idea as setProjectGithubRepo/setProjectVercelName, marking the
  // project Supabase-backed once create_supabase_project succeeds.
  const setProjectSupabaseRef = useCallback((id: string, ref: string) => {
    const next = projectsRef.current.map((p) => (p.id === id ? { ...p, supabaseProjectRef: ref } : p));
    projectsRef.current = next;
    setProjects(next);
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
    } catch {
      // Non-fatal -- see selectProject above.
    }
  }, []);

  const renameProject = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const next = projectsRef.current.map((p) => (p.id === id ? { ...p, name: trimmed, customName: trimmed } : p));
    projectsRef.current = next;
    setProjects(next);
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
    } catch {
      // Non-fatal -- see selectProject above.
    }
  }, []);

  // null clears the group (moves the project back to ungrouped).
  const setProjectGroup = useCallback((id: string, groupName: string | null) => {
    const next = projectsRef.current.map((p) => (p.id === id ? { ...p, manualGroupName: groupName ?? undefined } : p));
    projectsRef.current = next;
    setProjects(next);
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
    } catch {
      // Non-fatal -- see selectProject above.
    }
  }, []);

  const toggleArchiveProject = useCallback((id: string) => {
    const next = projectsRef.current.map((p) => (p.id === id ? { ...p, archived: !p.archived } : p));
    projectsRef.current = next;
    setProjects(next);
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
    } catch {
      // Non-fatal -- see selectProject above.
    }
  }, []);

  const toggleUnreadProject = useCallback((id: string) => {
    const next = projectsRef.current.map((p) => (p.id === id ? { ...p, unread: !p.unread } : p));
    projectsRef.current = next;
    setProjects(next);
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
    } catch {
      // Non-fatal -- see selectProject above.
    }
  }, []);

  // Deep-copies a project's files and messages into a brand new one, then
  // switches to it -- its own id/name/lastActivity, kept in the same
  // group, but never the original's githubRepoUrl (a fork is an
  // independent local copy, not something already pushed to that remote).
  const forkProject = useCallback(
    (id: string) => {
      const found = projectsRef.current.find((p) => p.id === id);
      if (!found) return;
      const forkId = newId();
      const forkedName = `${found.name} (copy)`;
      const entry: BuildProject = {
        id: forkId,
        name: forkedName,
        customName: forkedName,
        files: { ...found.files },
        messages: [...found.messages],
        lastActivity: Date.now(),
        manualGroupName: found.manualGroupName,
      };
      const next = [entry, ...projectsRef.current];
      projectsRef.current = next;
      setProjects(next);
      try {
        if (typeof window !== "undefined") window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
      } catch {
        // Non-fatal -- see selectProject above.
      }
      selectProject(forkId);
    },
    [selectProject]
  );

  // Injects a plain assistant chat bubble without going through a real
  // model turn -- used for a deterministic, non-LLM question ChatGiZa
  // needs an answer to before it can proceed (e.g. "which of your
  // existing GitHub projects should I use?" -- see BuildWorkspace.tsx's
  // handleOnboardGithub). Goes through the exact same messages state
  // every real assistant reply does, so it saves/reloads with the
  // project like any other message.
  const addAssistantMessage = useCallback((content: string) => {
    setMessages((prev) => [...prev, { role: "assistant", content }]);
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
    loadImportedFiles,
    reset,
    projects,
    historyOpen,
    openHistory,
    closeHistory,
    selectProject,
    deleteProject,
    togglePinProject,
    renameProject,
    setProjectGroup,
    toggleArchiveProject,
    toggleUnreadProject,
    forkProject,
    pendingConfirmation,
    confirmPendingAction,
    localFolderName,
    connectLocalFolder,
    githubConnected,
    connectGithubNow,
    setPendingManualGroupName: (name: string) => {
      pendingManualGroupNameRef.current = name;
    },
    setPendingGithubRepo: (url: string) => {
      pendingGithubRepoUrlRef.current = url;
    },
    setPendingVercelProject: (name: string) => {
      pendingVercelProjectNameRef.current = name;
    },
    setProjectGithubRepo,
    setProjectVercelName,
    setProjectSupabaseRef,
    addAssistantMessage,
    knownGithubRepos,
    permissionMode,
    setPermissionMode,
    // A user rename (renameProject) only ever wrote to the saved
    // BuildProject record's own customName/name fields -- this was
    // computed as a totally separate, parallel derivation from the site's
    // own <title> tag or first message, so renaming never touched it and
    // the header kept showing the old derived name forever after. customName
    // wins here for the same reason it already does when a project record
    // is first saved (see the upsert effect below) -- an explicit rename
    // is a deliberate choice that should stick, not get overwritten by
    // whatever the page's own <title> happens to say.
    projectName:
      (projects.find((p) => p.id === activeIdRef.current)?.customName) || deriveProjectName(files, messages),
    // The saved BuildProject record behind whatever's currently loaded --
    // lets a caller show which group (repo/folder/manual name) this chat
    // belongs to, not just its own derived title. null before the very
    // first save (see the upsert effect) or right after reset().
    activeProject: projects.find((p) => p.id === activeIdRef.current) ?? null,
    terminalHistory,
  };
}
