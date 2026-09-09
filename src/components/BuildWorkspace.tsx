"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { javascript } from "@codemirror/lang-javascript";
import { EditorView } from "@codemirror/view";
import { normalizeSpacing } from "@/lib/pdfMarkers";
import remarkGfm from "remark-gfm";
import BuildPreviewFrame from "@/components/BuildPreviewFrame";
import BuildFileTree from "@/components/BuildFileTree";
import { useBuildAgent, type BuildChatMessage, type BuildProject } from "@/lib/useBuildAgent";
import { validateBuildFiles, MAX_BUILD_SINGLE_FILE_BYTES } from "@/lib/buildFileLimits";
import { useChatGizaShell } from "@/components/ChatGizaShell";
import AccountMenu from "@/components/AccountMenu";
import LanguagePanel from "@/components/LanguagePanel";
import { resolveAddressBarUrl } from "@/lib/addressBar";
import type { SearchHit } from "@/lib/ai";

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;


// A short kebab-case handle, same convention push_to_github already uses
// for repoName -- "Shure | Professional Audio Equipment" as a folder/tab
// shortcut label reads like a page title, not a project handle.
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 30);
  return slug || "project";
}

// Real numbers only -- every stat here is derived from Build's own stored
// project history (localStorage), nothing fabricated to look impressive.
// That does mean some things a richer dashboard might show (total tokens
// ever spent, a favorite model, a peak hour) aren't included: this data
// model only ever kept one lastActivity timestamp per PROJECT, not a
// timestamp per message or a running token counter, so day-level activity
// (and streaks built from it) is the ceiling of what can be shown
// honestly without adding new tracking first.
function toDayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function computeBuildStats(projects: BuildProject[]) {
  const sessions = projects.length;
  const messages = projects.reduce((sum, p) => sum + p.messages.filter((m) => !m.step).length, 0);
  const dayKeySet = new Set(projects.map((p) => toDayKey(p.lastActivity)));
  const dayKeys = Array.from(dayKeySet).sort();
  const dayTimes = dayKeys.map((k) => new Date(k).getTime());
  const DAY_MS = 86400000;

  let longestStreak = 0;
  let run = 0;
  for (let i = 0; i < dayTimes.length; i++) {
    run = i > 0 && dayTimes[i] - dayTimes[i - 1] === DAY_MS ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
  }

  let currentStreak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!dayKeySet.has(toDayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  while (dayKeySet.has(toDayKey(cursor.getTime()))) {
    currentStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Last 70 days (10 weeks), oldest first, for a compact GitHub-style
  // activity grid -- binary (touched a project that day, or didn't),
  // since day-level is all the data actually supports.
  const heatmapDays: { key: string; active: boolean }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 69; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = toDayKey(d.getTime());
    heatmapDays.push({ key, active: dayKeySet.has(key) });
  }

  return { sessions, messages, activeDays: dayKeys.length, currentStreak, longestStreak, heatmapDays };
}

function BuildStatsCard({ projects }: { projects: BuildProject[] }) {
  const stats = computeBuildStats(projects);
  const cells: { label: string; value: number }[] = [
    { label: "Projects", value: stats.sessions },
    { label: "Messages", value: stats.messages },
    { label: "Active days", value: stats.activeDays },
    { label: "Current streak", value: stats.currentStreak },
    { label: "Longest streak", value: stats.longestStreak },
  ];
  return (
    <div className="w-full rounded-2xl border border-border bg-surface-2 p-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {cells.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-surface p-3">
            <p className="text-xs text-muted">{c.label}</p>
            <p className="mt-0.5 text-xl font-semibold text-foreground">{c.value}</p>
          </div>
        ))}
      </div>
      {/* 10 weeks x 7 days, oldest at the left -- same GitHub-contributions
          shape, just binary (a day either has activity or it doesn't) since
          that's the granularity the underlying data actually supports. */}
      <div className="mt-4 flex justify-center gap-[3px] overflow-x-auto py-1">
        {Array.from({ length: 10 }, (_, week) => (
          <div key={week} className="flex flex-col gap-[3px]">
            {stats.heatmapDays.slice(week * 7, week * 7 + 7).map((d) => (
              <div
                key={d.key}
                title={d.key}
                className={`h-2.5 w-2.5 rounded-[2px] ${d.active ? "bg-blue-500" : "bg-border"}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// One collapsed header line for a whole run of step messages (e.g.
// "Wrote 3 files"), matching a coding-agent's own collapsed action-log
// summary -- the individual "Wrote index.html" lines only show once
// expanded, instead of always taking up vertical space. The diff total is
// the sum of every step's own +N -M in the group, same as `git diff
// --stat`'s final total line summing every file's own count above it.
function summarizeSteps(steps: BuildChatMessage[]): { label: string; diffStat?: { added: number; removed: number } } {
  const totalDiff = steps.reduce(
    (acc, s) => (s.diffStat ? { added: acc.added + s.diffStat.added, removed: acc.removed + s.diffStat.removed } : acc),
    { added: 0, removed: 0 }
  );
  const diffStat = totalDiff.added > 0 || totalDiff.removed > 0 ? totalDiff : undefined;
  if (steps.length === 1) return { label: steps[0].content, diffStat };
  // "Read and wrote/edited X" (a read immediately folded into the edit it
  // preceded) counts the same as a plain "Wrote/Edited X" here.
  const written = steps.filter((s) => s.content.startsWith("Wrote ") || s.content.startsWith("Read and wrote ")).length;
  const edited = steps.filter((s) => s.content.startsWith("Edited ") || s.content.startsWith("Read and edited ")).length;
  const deleted = steps.filter((s) => s.content.startsWith("Deleted ")).length;
  // Commands (run_terminal_command) and generic tool calls (read_file/
  // list_files/search_workspace/get_file_outline) are counted via `kind`,
  // not by matching a fixed label string -- describeStep gives commands a
  // specific label now ("Typechecked the code") rather than always the
  // same generic phrase, so string-matching a literal "Ran a command"
  // would silently stop counting most of them.
  const commands = steps.filter((s) => s.kind === "command").length;
  const genericTools = steps.filter((s) => s.kind === "tool").length;
  const other = steps.length - written - edited - deleted - commands - genericTools;
  const parts: string[] = [];
  if (written > 0) parts.push(`Wrote ${written} file${written === 1 ? "" : "s"}`);
  if (edited > 0) parts.push(`Edited ${edited} file${edited === 1 ? "" : "s"}`);
  if (deleted > 0) parts.push(`Deleted ${deleted} file${deleted === 1 ? "" : "s"}`);
  if (commands > 0) parts.push(commands === 1 ? "Ran a command" : `Ran ${commands} commands`);
  if (genericTools > 0) parts.push(genericTools === 1 ? "used a tool" : `used ${genericTools} tools`);
  if (other > 0) parts.push(`${other} more step${other === 1 ? "" : "s"}`);
  const joined = parts.length > 0 ? parts.join(", ") : `${steps.length} steps`;
  // "used a tool" is written lowercase above so it reads naturally after a
  // comma ("Ran a command, used a tool") -- capitalize it back only when it
  // ends up leading the sentence on its own ("Used 4 tools").
  const label = joined.charAt(0).toUpperCase() + joined.slice(1);
  return { label, diffStat };
}

// Colored like a real git-style diff stat (green add / red remove), a touch
// bolder than the surrounding text so it stands out without dominating the
// line -- text-base/font-bold (a prior pass) read as too large once seen
// live, so this settles on the same size as the label with just semibold
// weight and color to differentiate it.
function DiffStatBadge({ stat }: { stat: { added: number; removed: number } }) {
  return (
    <span className="ml-1 shrink-0 whitespace-nowrap text-sm font-semibold">
      {stat.added > 0 && <span className="text-green-600 dark:text-green-500">+{stat.added}</span>}
      {stat.added > 0 && stat.removed > 0 && " "}
      {stat.removed > 0 && <span className="text-red-500 dark:text-red-400">-{stat.removed}</span>}
    </span>
  );
}

// Renders the full narration text every time, no "Show more" truncation --
// the user explicitly asked for text to appear as-is rather than getting cut
// with a toggle to expand it. Classes match the main chat's own assistant
// text exactly (ChatMessageBubble.tsx) -- `assistant-reply` picks up the
// theme's assistant color (including the "warm" alt mode), and
// `markdown-tight` is the same tighter list/paragraph spacing main uses,
// not the looser `markdown-roomy` this used before.
function TruncatedAssistantText({ content }: { content: string }) {
  return (
    <div className="markdown markdown-tight assistant-reply chat-text w-full max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{normalizeSpacing(content)}</ReactMarkdown>
    </div>
  );
}


// Same Web Speech API pattern as ChatComposer.tsx's voice input -- real
// speech-to-text, not a decorative mic icon.
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

// Clamp range for the Live window's width -- just wide enough to be
// useful, capped so dragging it can never squeeze chat away entirely.
const MIN_PREVIEW_WIDTH = 320;
const MAX_PREVIEW_WIDTH = 1000;
const DEFAULT_PREVIEW_WIDTH = 460;
// Chat always keeps at least this much room, no matter how far any panel
// is dragged wider. 420 was a workaround for the header breaking at
// anything narrower (the title badge and 5-icon toolbar were two
// independently absolutely-positioned corners with no way to know about
// each other's real size) -- now that they're one real flex row instead
// (title min-w-0/truncate, icons shrink-0), the header can't overlap at
// any width, so this floor only needs to cover the icon toolbar's own
// minimum (~190px) plus just enough for the composer to stay usable.
// Per feedback, a panel should be draggable until chat is genuinely
// small, not stopped this far short of the screen's actual edge.
const MIN_CHAT_WIDTH = 240;

// Same cap as the main ChatComposer's auto-growing textarea -- scrolls
// internally past this height instead of pushing the send button (and the
// Auto/model row below it) off the bottom of a short panel.
const MAX_COMPOSER_HEIGHT = 240;

// The command-confirmation dialog's code snippet used to render as plain
// muted text -- same font/color as the surrounding paragraph, no different
// from any other sentence. Real syntax highlighting (same VS Code theme the
// Files panel's own CodeMirror already uses) makes it unmistakably "this is
// code, read it carefully" before approving. Compact chrome (no gutter/line
// numbers, small font) since this is a one-or-two-line snippet, not a file.
const confirmationCodeChrome = EditorView.theme({
  "&": { fontSize: "12.5px", backgroundColor: "transparent" },
  ".cm-gutters": { display: "none" },
  ".cm-content": { padding: "0" },
  "&.cm-editor.cm-focused": { outline: "none" },
});

// Chat messages are the only place push/deploy results ever show up now
// (no manual "Push"/"Deploy" buttons) -- linkify URLs so a "Deployed:
// https://..." message is actually clickable. split() with a capturing
// group interleaves [text, match, text, match, ...], so odd indices are
// always the URL matches -- avoids re-testing a stateful global regex.
function renderWithLinks(text: string) {
  return text.split(URL_PATTERN).map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={part} target="_blank" rel="noreferrer" className="underline text-foreground">
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// A "return/enter" arrow, not a plain up-arrow -- matches the shape asked
// for directly, still sitting in the same blue circle as before.
const SendIcon = (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ fill: "currentColor", stroke: "none" }}>
    <path d="M19.3 0a.7.7 0 0 1 .7.7v8.278a6.7 6.7 0 0 1-6.699 6.698l-10.996-.001l3.131 3.13a.7.7 0 0 1-.99.99l-4.24-4.241a.7.7 0 0 1 0-.99l4.241-4.241a.7.7 0 1 1 .99.99l-2.965 2.963h10.83A5.3 5.3 0 0 0 18.6 8.978V.7a.7.7 0 0 1 .7-.7" />
  </svg>
);

// Shown in place of SendIcon while the agent is mid-turn -- the same
// button doubles as Stop, so clicking it cancels the in-flight request
// instead of sending another message. Just the frame, no checkmark inside.
const StopIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M0 0h24v24H0z" fill="none" />
    <path
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M4 12V5c0-.55.45-1 1-1h14c.55 0 1 .45 1 1v14c0 .55-.45 1-1 1H5c-.55 0-1-.45-1-1Z"
    />
  </svg>
);

// Same toolbar icon set as ChatSidebar's app-mode header (see
// src/components/ChatSidebar.tsx's AppToolbar* icons) -- kept as its own
// copy here since the Build page doesn't mount ChatSidebar at all.
const ToolbarMenuIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M0 0h24v24H0z" fill="none" />
    <path
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M4 6h16M4 12h16M4 18h7"
    />
  </svg>
);
const ToolbarSidebarIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
  </svg>
);
const ToolbarSearchIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);
const CodePillIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="m7.375 16.781l1.25-1.562L4.601 12l4.024-3.219l-1.25-1.562l-5 4a1 1 0 0 0 0 1.562zm9.25-9.562l-1.25 1.562L19.399 12l-4.024 3.219l1.25 1.562l5-4a1 1 0 0 0 0-1.562zm-1.649-4.003l-4 18l-1.953-.434l4-18z"
    />
  </svg>
);
const AskPillIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 9c0 3.87-3.36 7-7.5 7l-.93 1.12l-.55.66c-.47.56-1.37.44-1.68-.23L5 14.6C3.18 13.32 2 11.29 2 9c0-3.87 3.36-7 7.5-7c3.02 0 5.63 1.67 6.8 4.07c.45.89.7 1.88.7 2.93" />
    <path d="M22 12.86c0 2.29-1.18 4.32-3 5.6l-1.34 2.95c-.31.67-1.21.8-1.68.23l-1.48-1.78c-2.42 0-4.58-1.07-5.93-2.74L9.5 16c4.14 0 7.5-3.13 7.5-7c0-1.05-.25-2.04-.7-2.93c3.27.75 5.7 3.51 5.7 6.79M7 9h5" />
  </svg>
);
const ToolbarBackIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);
const ToolbarForwardIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
const PencilIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
    <path d="m15 5 4 4" />
  </svg>
);
// Graduation cap -- the "Learn to code" rail button, right below "New chat".
const LearnIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10 12 5 2 10l10 5 10-5Z" />
    <path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
  </svg>
);
// Sits in front of the project-name badge at the row's top-left corner.
const ProjectBadgeIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 17h-.5a1.5 1.5 0 0 0 0 3h17a1.5 1.5 0 0 0 0-3H20M4 17h16M4 17V8.2c0-1.12 0-1.68.218-2.108c.192-.377.497-.682.874-.874C5.52 5 6.08 5 7.2 5h9.6c1.12 0 1.68 0 2.107.218c.377.192.683.497.875.874c.218.427.218.987.218 2.105V17" />
  </svg>
);
// The Browse panel -- ported as-is from chatgiza/page.tsx's own globe-icon
// panel (same feature, same icons/behavior), just wired to this page's
// globe button instead of a separate one.
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
// The onboarding row for connecting a real GitHub account.
const GitHubGlyphIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55v-2.17c-3.2.7-3.88-1.35-3.88-1.35-.52-1.34-1.28-1.7-1.28-1.7-1.04-.72.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.14v3.17c0 .3.21.66.79.55A10.51 10.51 0 0 0 23.5 12c0-6.35-5.15-11.5-11.5-11.5Z" />
  </svg>
);
// The two quick-start cards on the first-time landing screen, below.
const WebsiteStartIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);
const AppStartIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.5 6h3m-8 13V5a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3h-7a3 3 0 0 1-3-3" />
  </svg>
);
const CloseIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);
// The "Progress" panel's own icon -- graduation cap, specific to the
// coding-school/Learn-to-code side of Build, leftmost in the icon group.
const StudentPanelIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.3 2.05a4.6 4.6 0 0 1 1.38 0c.515.08 1.01.279 1.84.612l7.19 2.9c.554.224 1 .404 1.33.57c.317.162.634.363.797.68c.111.215.166.45.166.685v8a.5.5 0 0 1-1 0v-6.62c-.324.162-.759.337-1.29.552l-.708.285v5.78c0 1.92-1.24 3.3-2.92 4.18s-3.9 1.32-6.08 1.32s-4.39-.437-6.07-1.32c-1.69-.88-2.93-2.27-2.93-4.18v-5.78l-.709-.286c-.554-.224-1-.404-1.33-.571c-.317-.161-.633-.362-.797-.68a1.5 1.5 0 0 1 0-1.37c.163-.316.48-.517.797-.678c.328-.167.775-.348 1.33-.571l7.18-2.9c.827-.334 1.32-.533 1.84-.613zm1.22.987a3.5 3.5 0 0 0-1.07 0c-.387.06-.768.21-1.68.577l-7.1 2.86c-.583.235-.988.4-1.27.544c-.3.153-.355.233-.362.246a.5.5 0 0 0 0 .457c.007.013.062.094.362.246c.284.145.689.31 1.27.544l7.1 2.86c.907.366 1.29.517 1.68.577a3.5 3.5 0 0 0 1.07 0c.387-.06.768-.21 1.68-.576l7.1-2.86c.583-.235.989-.4 1.27-.544c.3-.153.355-.233.362-.246a.5.5 0 0 0 0-.457c-.007-.013-.062-.093-.362-.246c-.284-.145-.69-.309-1.27-.544l-7.1-2.86c-.907-.366-1.29-.516-1.68-.576zm1.99 9.29l5.48-2.21v5.38c0 1.41-.888 2.52-2.39 3.3c-1.5.784-3.54 1.2-5.61 1.2s-4.11-.419-5.61-1.2c-1.5-.782-2.39-1.89-2.39-3.3v-5.37l5.47 2.21c.827.334 1.32.533 1.84.613c.456.07.921.07 1.38 0c.515-.08 1.01-.279 1.84-.612z"
    />
  </svg>
);
const GlobeIcon = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);
const ServerIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.485 2 2 6.485 2 12s4.485 10 10 10s10-4.485 10-10S17.515 2 12 2m8.46 9.25h-3.495c-.195-3.475-1.7-6-2.925-7.49c3.465.86 6.095 3.845 6.415 7.49zM12 20.245c-.975-.945-3.21-3.53-3.465-7.495h6.935c-.26 3.965-2.49 6.545-3.465 7.495zM12 3.76c.975.945 3.21 3.53 3.465 7.495H8.53c.26-3.965 2.49-6.545 3.465-7.495zm-2.045 0a12.95 12.95 0 0 0-2.925 7.49H3.54c.32-3.645 2.95-6.63 6.415-7.49M3.54 12.75h3.495c.195 3.475 1.7 6 2.925 7.49c-3.465-.86-6.095-3.845-6.415-7.49zm10.505 7.49a12.95 12.95 0 0 0 2.925-7.49h3.495c-.32 3.645-2.95 6.63-6.415 7.49z" />
  </svg>
);
// The rest of this "window" browser-chrome set: tab strip (+ new tab,
// more-options), toolbar (reload, extensions, expand-to-new-tab) and OS
// window controls (minimize/maximize/close) -- all decorative except
// reload, close, and Download, which stay real actions.
const PlusTabIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const MicIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
    <path d="M12 18v4" />
    <path d="M8 22h8" />
  </svg>
);
const KebabIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="12" cy="19" r="1.5" />
  </svg>
);
// History row menu -- pin/unpin and delete a saved project.
const PinIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 17v5" />
    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
  </svg>
);
const DeleteRowIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="12" height="20" x="6" y="2" rx="2" />
  </svg>
);
// Collapsed-by-default step group toggle -- points right, rotates down
// when expanded, same idiom as a coding-agent's own collapsible action log.
const ChevronRightIcon = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 6 6 6-6 6" />
  </svg>
);
const MinimizeIcon = (
  <svg width="14" height="14" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M28 6h14v14m0 9.474V39a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h9m7.8 16.2L41.1 6.9" />
  </svg>
);
const MaximizeIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 9l5-5m0 0v4m0-4h-4M9 15l-5 5m0 0v-4m0 4h4" />
  </svg>
);
const BrowserWindowIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <g fill="none">
      <path d="M3 21h18V3H3z" />
      <path stroke="currentColor" strokeWidth="2" d="M21 12v9H3v-9m18 0H3m18 0V3H3v9m3.998-4.5h.004v.004h-.004zm0 9h.004v.004h-.004z" />
    </g>
  </svg>
);
const BuildingCardIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" />
      <path d="M10 13a2 2 0 1 0 4 0a2 2 0 1 0-4 0m0-7h4M9 18h6" />
    </g>
  </svg>
);
// The chat column's own small toolbar (terminal/new-window/globe/more) --
// decorative chrome matching a familiar coding-agent header, distinct
// from the preview window's own browser-chrome further right.
const TerminalIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m4 6 5 5-5 5" />
    <path d="M12 17h8" />
  </svg>
);
const ReloadIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 3v6h-6" />
  </svg>
);
const DevicePreviewIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.5 6h3m-8 13V5a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3h-7a3 3 0 0 1-3-3" />
  </svg>
);
// Rounds out the address bar to actually look like a real browser's --
// open-externally, edit, and device preview.
const ToolbarEditIcon = (
  <svg width="13" height="13" viewBox="0 0 256 256" fill="currentColor">
    <path d="M168 132.69L214.08 115l.33-.13a16 16 0 0 0-1.41-29.8L52.92 32.8A15.95 15.95 0 0 0 32.8 52.92L85.07 213a15.82 15.82 0 0 0 14.41 11h.78a15.84 15.84 0 0 0 14.61-9.59l.13-.33L132.69 168L184 219.31a16 16 0 0 0 22.63 0l12.68-12.68a16 16 0 0 0 0-22.63ZM195.31 208L144 156.69a16 16 0 0 0-26 4.93c0 .11-.09.22-.13.32l-17.65 46L48 48l159.85 52.2l-45.95 17.64l-.32.13a16 16 0 0 0-4.93 26L208 195.31Z" />
  </svg>
);
const ComposeIcon = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M8.08.1c.19-.06.39-.09.59-.09L8.66 0c.2 0 .4.03.59.09c.43.14.72.43 1.14.849l.67.669c.43.42.71.709.85 1.14c.12.39.12.799 0 1.18c-.14.43-.43.719-.85 1.14l-5.46 5.46c-.12.13-.21.22-.34.31c-.11.08-.23.15-.36.2a2.5 2.5 0 0 1-.429.127l-.01.002l-3.22.81c-.08.03-.16.03-.24.03c-.26 0-.52-.1-.71-.29a.98.98 0 0 1-.26-.95l.81-3.22l.002-.01c.039-.165.069-.292.128-.43c.05-.13.12-.25.2-.36c.09-.12.19-.22.31-.34L6.94.948C7.37.518 7.65.24 8.08.1m.87.949a.9.9 0 0 0-.28-.04v.01c-.1 0-.19.01-.28.04c-.2.06-.38.24-.74.6l-.642.642l2.7 2.7l.649-.648l.094-.097c.288-.295.442-.453.506-.643c.06-.18.06-.38 0-.56c-.06-.2-.24-.38-.6-.739l-.67-.669l-.096-.094c-.296-.288-.453-.442-.643-.505zm.054 4.66l-2.7-2.7l-4.1 4.11q-.056.062-.098.104a.9.9 0 0 0-.202.286c-.019.037-.03.082-.045.143q-.013.057-.035.136l-.81 3.22l3.22-.81c.14-.03.21-.05.28-.079c.06-.03.12-.06.17-.1c.06-.04.11-.09.22-.2l4.1-4.1z"
      clipRule="evenodd"
    />
  </svg>
);
const UploadIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21V9" />
    <path d="m7 14 5-5 5 5" />
    <path d="M5 3h14" />
  </svg>
);
// Same glyphs as ChatComposer.tsx's own attach menu (ImageIcon/FileIcon)
// and ProjectsPanel.tsx's FolderIcon, reused here rather than drawn fresh
// -- one icon per concept across the app, not a slightly different one
// per place it happens to appear.
const AttachImageIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);
const AttachFileIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6" />
  </svg>
);
const AttachFolderIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </svg>
);
const PlayIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);
// No existing "connector/plug" glyph anywhere else in the app to reuse --
// this one's new, kept in the same stroke-based style as the three above.
const ConnectorsIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3v4M15 3v4M9 21v-4M15 21v-4" />
    <rect x="5" y="7" width="14" height="10" rx="2" />
  </svg>
);

// The Build experience: starts identical in spirit to the Home landing
// screen (a centered composer, nothing else) so it doesn't front-load
// UI the user hasn't earned yet. The workspace (chat history, file tree,
// live preview, push/deploy) only appears once the agent has actually
// written something -- "opens by itself" as the user builds, rather than
// showing three empty panes from the first paint.
export default function BuildWorkspace() {
  const { openSettingsTab, setSupportOpen, language, setLanguage } = useChatGizaShell();
  const [languageOpen, setLanguageOpen] = useState(false);
  const {
    files,
    messages,
    sending,
    sendingStats,
    error,
    send,
    stop,
    sessionTokens,
    setFileContent,
    deleteFile,
    reset,
    projects,
    selectProject,
    deleteProject,
    togglePinProject,
    pendingConfirmation,
    confirmPendingAction,
    localFolderName,
    connectLocalFolder,
    githubConnected,
    connectGithubNow,
    setPendingManualGroupName,
    permissionMode,
    setPermissionMode,
    projectName,
    activeProject,
    terminalHistory,
  } = useBuildAgent();
  const [input, setInput] = useState("");
  const inputRef = useRef(input);
  inputRef.current = input;
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Grows the composer upward as the message wraps to more lines, same
  // behavior as the main ChatComposer -- reset to "auto" first so a
  // shrinking message actually shrinks back down too, not just grows.
  useEffect(() => {
    const el = messageInputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_COMPOSER_HEIGHT)}px`;
  }, [input]);
  const [attachedImages, setAttachedImages] = useState<{ dataUrl: string; name: string }[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const uploadNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (uploadNoticeTimerRef.current) clearTimeout(uploadNoticeTimerRef.current);
  }, []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [modelInfoOpen, setModelInfoOpen] = useState(false);
  const [buildUsage, setBuildUsage] = useState<{ used: number; limit: number; resetsInSeconds: number } | null>(null);
  // The globe icon's "Browse" panel -- ported as-is from chatgiza/page.tsx.
  // A plain server-rendered screenshot of whatever URL is loaded (not an
  // iframe, which most real sites block via X-Frame-Options/CSP), or a
  // Tavily-backed web search if the input isn't a URL. Doubles as the AI's
  // own live-build view (see `showLiveInBrowse` and its JSX further down):
  // whenever this project actually has files and the user hasn't explicitly
  // searched/typed a URL, it defaults to showing BuildPreviewFrame instead
  // of the idle "search the web" placeholder -- covers the whole span the
  // user asked for, start to finish (while the AI is actively writing,
  // right after it finishes, and on reopening an older chat that already
  // has a site), not just the narrow moment `sending` happens to be true.
  const [browsePanelOpen, setBrowsePanelOpen] = useState(false);
  useEffect(() => {
    // A fresh turn starting is also what should clear out any manual
    // browse/search the user left this panel in -- otherwise a chat
    // reopened mid-search would keep showing that stale search instead of
    // snapping back to the live build the moment new work starts.
    if (sending) {
      setBrowsePanelOpen(true);
      setBrowseUrl("");
      setBrowseSearchResults(null);
    }
  }, [sending]);
  // The Terminal icon's own panel -- independent of Browse (both can be
  // open at once), sliding up from the bottom of the chat column instead
  // of sharing Browse's side-panel space. Shows the real transcript of
  // every run_terminal_command call this session (see terminalHistory in
  // useBuildAgent.ts) -- never simulated output.
  const [terminalPanelOpen, setTerminalPanelOpen] = useState(false);
  // The "Files" icon's own panel -- browse/edit/delete the project's real
  // virtual files directly (BuildFileTree already existed, built but never
  // wired to anything). Independent of Terminal/Browse, same as those two
  // are independent of each other.
  const [filesPanelOpen, setFilesPanelOpen] = useState(false);
  // The "Progress" panel -- real steps from this chat's own history (each
  // assistant reply so far), not a fabricated lesson tracker. Independent
  // of Files/Terminal/Browse, same as those three are independent of each
  // other.
  const [progressPanelOpen, setProgressPanelOpen] = useState(false);
  // Which Progress steps are showing their full text instead of the
  // truncated first line -- a plain CSS ellipsis gave no hint a step could
  // be expanded at all. The chevron (rotates open) matches this app's own
  // "Ran N commands ›" collapsible-summary pattern elsewhere.
  const [expandedProgressSteps, setExpandedProgressSteps] = useState<Set<number>>(new Set());
  const [progressWidth, setProgressWidth] = useState(380);
  const progressResizing = useRef(false);
  const progressPendingX = useRef<number | null>(null);
  const progressRafId = useRef<number | null>(null);
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!progressResizing.current) return;
      // Recording the latest cursor position on every raw event is cheap
      // (just a ref write, no re-render); the actual setState -- which IS
      // expensive, since it re-renders this whole component including the
      // message list -- only runs once per animation frame via the RAF
      // below. Without this, a fast mouse could fire far more mousemoves
      // than the screen can actually paint, and the panel visibly
      // jittered/lagged trying to re-render on every single one of them.
      progressPendingX.current = e.clientX;
      if (progressRafId.current !== null) return;
      progressRafId.current = requestAnimationFrame(() => {
        progressRafId.current = null;
        const clientX = progressPendingX.current;
        if (clientX === null) return;
        const next = window.innerWidth - clientX;
        const maxWidth = maxWidthFor("progress", MIN_CHAT_WIDTH);
        setProgressWidth(Math.min(Math.max(next, 320), maxWidth));
      });
    }
    function handleMouseUp() {
      progressResizing.current = false;
      setIsDragActive(false);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (progressRafId.current !== null) cancelAnimationFrame(progressRafId.current);
    };
  }, []);
  const [filesWidth, setFilesWidth] = useState(420);
  const filesResizing = useRef(false);
  const filesPendingX = useRef<number | null>(null);
  const filesRafId = useRef<number | null>(null);
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!filesResizing.current) return;
      filesPendingX.current = e.clientX;
      if (filesRafId.current !== null) return;
      filesRafId.current = requestAnimationFrame(() => {
        filesRafId.current = null;
        const clientX = filesPendingX.current;
        if (clientX === null) return;
        const next = window.innerWidth - clientX;
        const maxWidth = maxWidthFor("files", MIN_CHAT_WIDTH);
        setFilesWidth(Math.min(Math.max(next, 320), maxWidth));
      });
    }
    function handleMouseUp() {
      filesResizing.current = false;
      setIsDragActive(false);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (filesRafId.current !== null) cancelAnimationFrame(filesRafId.current);
    };
  }, []);
  // The "Live" panel -- a real rendered preview of the project (via
  // BuildPreviewFrame's srcDoc iframe), not the code text itself. Sits at
  // the row's left edge, in History's own spot -- per feedback, that's
  // specifically where it belongs, not appended after Files like
  // Progress/Terminal/Browse. A real fixed, shrink-0 width with its own
  // handle either way; the width itself starts bigger than the other
  // panels' defaults, per feedback that it should open noticeably wide.
  const [livePanelOpen, setLivePanelOpen] = useState(false);
  const [liveWidth, setLiveWidth] = useState(900);
  const liveResizing = useRef(false);
  const livePendingX = useRef<number | null>(null);
  const liveRafId = useRef<number | null>(null);
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!liveResizing.current) return;
      livePendingX.current = e.clientX;
      if (liveRafId.current !== null) return;
      liveRafId.current = requestAnimationFrame(() => {
        liveRafId.current = null;
        const clientX = livePendingX.current;
        if (clientX === null) return;
        // Anchored to the row's LEFT edge, not window.innerWidth -- Live
        // sits first in the row (History's spot), so its width is how far
        // the cursor is from the row's own left edge, not from the
        // window's right edge like every other (right-side) panel here.
        const rowLeft = rowRef.current?.getBoundingClientRect().left ?? 0;
        const next = clientX - rowLeft;
        // No chat reserve -- chat is hidden while Live is open, so the
        // only room worth protecting is whatever Files (and any other
        // still-open panel) is using.
        const maxWidth = maxWidthFor("live", 0);
        setLiveWidth(Math.min(Math.max(next, 320), maxWidth));
      });
    }
    function handleMouseUp() {
      liveResizing.current = false;
      setIsDragActive(false);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (liveRafId.current !== null) cancelAnimationFrame(liveRafId.current);
    };
  }, []);
  // Wraps setFileContent so a real edit (not the AI's own writes, which
  // call setFileContent directly elsewhere) is the one thing that pops
  // Live open automatically -- typing a fix into a file is exactly the
  // moment where seeing it rendered live, without a manual click, is the
  // whole point of the feature.
  function handleFileEdit(path: string, content: string) {
    setFileContent(path, content);
    setLivePanelOpen(true);
  }
  function handleFileCreate(path: string) {
    setFileContent(path, "");
  }
  const [terminalWidth, setTerminalWidth] = useState(420);
  const terminalResizing = useRef(false);
  const terminalPendingX = useRef<number | null>(null);
  const terminalRafId = useRef<number | null>(null);
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!terminalResizing.current) return;
      terminalPendingX.current = e.clientX;
      if (terminalRafId.current !== null) return;
      terminalRafId.current = requestAnimationFrame(() => {
        terminalRafId.current = null;
        const clientX = terminalPendingX.current;
        if (clientX === null) return;
        const next = window.innerWidth - clientX;
        const maxWidth = maxWidthFor("terminal", MIN_CHAT_WIDTH);
        setTerminalWidth(Math.min(Math.max(next, 320), maxWidth));
      });
    }
    function handleMouseUp() {
      terminalResizing.current = false;
      setIsDragActive(false);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (terminalRafId.current !== null) cancelAnimationFrame(terminalRafId.current);
    };
  }, []);
  const [browseInput, setBrowseInput] = useState("");
  const [browseUrl, setBrowseUrl] = useState("");
  const [browseSearchResults, setBrowseSearchResults] = useState<SearchHit[] | null>(null);
  const [browseSearchLoading, setBrowseSearchLoading] = useState(false);
  const [browseScreenshotLoaded, setBrowseScreenshotLoaded] = useState(false);
  const [browseScreenshotError, setBrowseScreenshotError] = useState(false);
  const [browseWidth, setBrowseWidth] = useState(950);
  const browseResizing = useRef(false);
  const browsePendingX = useRef<number | null>(null);
  const browseRafId = useRef<number | null>(null);
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!browseResizing.current) return;
      browsePendingX.current = e.clientX;
      if (browseRafId.current !== null) return;
      browseRafId.current = requestAnimationFrame(() => {
        browseRafId.current = null;
        const clientX = browsePendingX.current;
        if (clientX === null) return;
        const next = window.innerWidth - clientX;
        const maxWidth = maxWidthFor("browse", MIN_CHAT_WIDTH);
        setBrowseWidth(Math.min(Math.max(next, 320), maxWidth));
      });
    }
    function handleMouseUp() {
      browseResizing.current = false;
      setIsDragActive(false);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (browseRafId.current !== null) cancelAnimationFrame(browseRafId.current);
    };
  }, []);
  // Keeps every panel's resize ceiling aware of how much room the OTHER
  // open panels are already using -- without this, several panels each
  // independently allowed up to ~1000px could combine to squeeze chat down
  // to nothing, or (for Live's flex-grow fill) bring back the exact dead-
  // space bug fixed above the moment a second panel opens alongside it.
  // Updated on every render, not inside an effect -- each resize handler's
  // closure above only runs once (mounted with `[]`), so without this ref
  // it would keep reading the OTHER panels' widths from whenever it first
  // mounted instead of their current values.
  const panelWidthsRef = useRef({ progress: 0, files: 0, terminal: 0, browse: 0, live: 0 });
  panelWidthsRef.current = {
    progress: progressPanelOpen ? progressWidth : 0,
    files: filesPanelOpen ? filesWidth : 0,
    terminal: terminalPanelOpen ? terminalWidth : 0,
    browse: browsePanelOpen ? browseWidth : 0,
    live: livePanelOpen ? liveWidth : 0,
  };
  // Every panel here (Progress/Files/Terminal/Browse/Live) shares the row
  // with chat, so each one's ceiling reserves room for chat (reserveForChat)
  // plus whatever the OTHER open panels are already using -- that alone is
  // what keeps a drag from squeezing chat or another panel away to nothing.
  // No hardCap by default (Infinity) -- per feedback, every panel should be
  // able to open genuinely wide, not stop at an arbitrary number while
  // there's still real room on the screen; a hardCap of 1000 was tried
  // first and it's exactly what capped how far a panel could be dragged
  // even on a large monitor with plenty of space left.
  function maxWidthFor(panel: keyof typeof panelWidthsRef.current, reserveForChat: number, hardCap = Infinity) {
    const others = Object.entries(panelWidthsRef.current)
      .filter(([key]) => key !== panel)
      .reduce((sum, [, w]) => sum + w, 0);
    // window.innerWidth minus the row's own LEFT edge (where ChatSidebar
    // ends), not the row's own rendered WIDTH -- the row has no width cap
    // of its own (it just grows to fit flex-1 chat + every panel's current
    // width), so measuring its width was circular: a panel already dragged
    // too wide inflates the very number meant to be its ceiling, and the
    // row (and whichever panel is widest) simply overflows the viewport
    // instead of ever being stopped. The row's left edge, by contrast,
    // never moves regardless of how wide its children get, so subtracting
    // it from window.innerWidth gives the real, stable available width.
    const rowLeft = rowRef.current?.getBoundingClientRect().left ?? 0;
    const available = window.innerWidth - rowLeft;
    return Math.max(320, Math.min(hardCap, available - reserveForChat - others));
  }
  // Drives the full-screen drag-overlay below. Live's own body is a real
  // IFRAME (a separate browsing context via srcDoc) -- once the cursor
  // passes over it mid-drag, that iframe (not this page) starts receiving
  // mouse events, which is what made dragging near Live jitter, get "stuck"
  // partway (a mouseup landing inside the iframe never reaches this page's
  // own listener, leaving the *Resizing ref stuck true), and show a native
  // text-selection highlight or a "not-allowed" cursor instead of the
  // resize cursor -- all symptoms of the browser trying to select text or
  // start a native drag instead of running our own resize logic. Every
  // panel's onMouseDown below sets this true and calls preventDefault (to
  // stop that native selection/drag from starting in the first place); the
  // transparent overlay it renders then catches every mouse event for the
  // rest of the drag so none of them can fall through into the iframe.
  const [isDragActive, setIsDragActive] = useState(false);
  // Belt-and-braces alongside preventDefault above -- suppresses text
  // selection for the WHOLE page (not just the resize handle) for as long
  // as a drag is active, so a fast drag that briefly outruns the overlay
  // can't still leave stray selected/highlighted text behind.
  useEffect(() => {
    document.body.style.userSelect = isDragActive ? "none" : "";
    return () => {
      document.body.style.userSelect = "";
    };
  }, [isDragActive]);
  // Triggered by pressing Send on a brand-new project's very first
  // message, not sitting as standalone buttons on the landing screen --
  // the actual message is held here until the sequence (GitHub, then a
  // local folder) finishes or is skipped, then it goes out for real.
  // Each step needs its own separate click even though the whole thing
  // reads as one flow: showDirectoryPicker() requires a real, fresh user
  // gesture, and that "recent click" expires while a GitHub OAuth popup
  // is open (which can take the user as long as they need) -- chaining
  // both off a single click would make the folder picker silently fail.
  // One combined screen -- GitHub, folder, and typed-name all offered
  // together as equal, independent choices, not a forced sequence of
  // separate steps (that's what produced the "connects GitHub but then
  // also asks for a folder, then also asks for a name" confusion before).
  // Picking any ONE of the three is enough to proceed.
  // A one-time, purely cosmetic welcome (name, then role) shown only the
  // very first time anyone ever opens Build on this browser -- unlike
  // onboardOpen below, it's not about where a project's files live, it's
  // just a friendlier first impression before that. Neither answer
  // changes any later behavior. Checked directly against localStorage
  // (not the projects state, which loads asynchronously in useBuildAgent
  // and would otherwise flash this for an instant on every load) so an
  // existing user with real history never sees it, and a genuinely new
  // one only ever does once.
  const [welcomeStep, setWelcomeStep] = useState<"name" | "role" | null>(null);
  const [welcomeName, setWelcomeName] = useState("");
  const [welcomeRole, setWelcomeRole] = useState("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const WELCOME_KEY = "chatgiza_build_welcomed_v1";
    if (window.localStorage.getItem(WELCOME_KEY)) return;
    if (window.localStorage.getItem("chatgiza_build_projects_v1")) {
      // Already had projects before this existed -- don't retroactively
      // greet an existing user, just mark it seen.
      window.localStorage.setItem(WELCOME_KEY, "1");
      return;
    }
    setWelcomeStep("name");
  }, []);
  function finishWelcome() {
    try {
      window.localStorage.setItem("chatgiza_build_welcomed_v1", "1");
    } catch {
      // Non-fatal -- worst case it asks again next visit.
    }
    setWelcomeStep(null);
  }

  const [onboardOpen, setOnboardOpen] = useState(false);
  const [onboardNameInput, setOnboardNameInput] = useState("");
  const [onboardBusy, setOnboardBusy] = useState<"github" | "folder" | null>(null);
  const pendingSubmitRef = useRef<{ text: string; images: { dataUrl: string; name: string }[] } | null>(null);
  const folderSupported = typeof window !== "undefined" && "showDirectoryPicker" in window;

  function runPendingSubmit() {
    const pending = pendingSubmitRef.current;
    pendingSubmitRef.current = null;
    if (pending) send(pending.text, pending.images.length > 0 ? pending.images : undefined);
  }

  function finishOnboarding() {
    setOnboardOpen(false);
    setOnboardNameInput("");
    runPendingSubmit();
  }

  async function handleOnboardGithub() {
    setOnboardBusy("github");
    const ok = await connectGithubNow();
    setOnboardBusy(null);
    if (ok) finishOnboarding();
  }

  async function handleOnboardFolder() {
    setOnboardBusy("folder");
    const folderName = await connectLocalFolder();
    setOnboardBusy(null);
    if (!folderName) return;
    // Stamped onto the project itself (same mechanism as the typed-name
    // option) rather than relying on the live localFolderName state --
    // that resets to null on every reload, so grouping off it directly
    // would silently un-group every folder project the moment the page
    // reloads, even though the same real folder would reconnect fine.
    setPendingManualGroupName(folderName);
    finishOnboarding();
  }

  function handleOnboardName() {
    const name = onboardNameInput.trim();
    if (!name) return;
    setPendingManualGroupName(name);
    finishOnboarding();
  }

  // Puts this new project into an ALREADY-existing folder/manual group
  // instead of a fresh one -- the user's own explicit choice each time,
  // never assumed automatically (that's what silently reused a stale
  // group like "HELLO" for an unrelated new project before this).
  function handleOnboardExisting(groupName: string) {
    setPendingManualGroupName(groupName);
    finishOnboarding();
  }

  // Shared by every quick-start card on the first-time landing screen
  // (Learn to code, Build a website, Build an app) -- always starts a
  // fresh project (like "New chat" does) and immediately sends a fixed
  // opening instruction, instead of leaving the user to type it
  // themselves. Goes through the same identity gate a first real message
  // would (not `started`-gated like onSubmit -- reset() just ran, so this
  // project is about to be blank regardless of what the current render's
  // `started` still says).
  //
  // Always opens the picker for a brand-new project rather than silently
  // reusing whatever GitHub/folder connection is still active from a
  // previous one this session -- per explicit feedback, the user wants to
  // choose that fresh each time (new group vs. an existing one, listed as
  // its own option in the modal), not have it decided for them.
  function startWithPrompt(text: string) {
    reset();
    pendingSubmitRef.current = { text, images: [] };
    setOnboardOpen(true);
  }

  const LEARN_TO_CODE_PROMPT =
    "Teach me to code step by step -- explain what you're doing and why as you go, check that I understand before moving on, and let me try writing parts myself instead of just building it for me.";
  const startLearnToCode = () => startWithPrompt(LEARN_TO_CODE_PROMPT);
  const startWebsite = () => startWithPrompt("Help me build a website. Ask me what it's for before you start.");
  const startApp = () => startWithPrompt("Help me build an app. Ask me what it should do before you start.");

  function toggleListening() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
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
      setInput(inputRef.current ? `${inputRef.current} ${transcript}` : transcript);
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
  const started = messages.length > 0 || Object.keys(files).length > 0;
  // Shown next to the chat's own title at the top of the page -- which
  // group (repo/folder/manual name) this specific chat lives under, the
  // same context the History rail's group headers already give, just
  // surfaced here too so it doesn't only exist one click away.
  const activeGroupName = activeProject?.githubRepoUrl
    ? activeProject.githubRepoUrl.split("/").filter(Boolean).pop()
    : activeProject?.manualGroupName;
  // Pinned projects float to the top (like a pinned chat/email), then
  // everything else by most-recently-active.
  const sortedProjects = [...projects].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return b.lastActivity - a.lastActivity;
  });
  // Groups are labeled with the REAL name the user gave -- the actual repo
  // name a GitHub-linked project pushed to, or the actual folder name
  // connected on this device -- never a generic "GitHub"/"Folder" label.
  // Each distinct repo a project has been pushed to gets its own group
  // (mirrors a project picker where each repo/folder is its own named
  // container, with the individual chats nested under it), and every
  // folder-only project nests under the one connected folder's own name
  // (only one folder can be connected at a time today).
  function repoNameFromUrl(url: string): string {
    const parts = url.split("/").filter(Boolean);
    return parts[parts.length - 1] || url;
  }
  // Keyed by a normalized (trimmed, lowercased) form of the name so the
  // same folder or repo picked/typed again -- possibly with different
  // capitalization or stray whitespace -- always lands in the ONE existing
  // group instead of quietly spawning a second, near-identical-looking
  // one. The group keeps whichever exact casing it first appeared with.
  function groupByName(list: BuildProject[]): Map<string, BuildProject[]> {
    const map = new Map<string, { displayName: string; projects: BuildProject[] }>();
    for (const p of list) {
      const displayName = p.githubRepoUrl ? repoNameFromUrl(p.githubRepoUrl) : (p.manualGroupName as string);
      const key = displayName.trim().toLowerCase();
      const existing = map.get(key);
      if (existing) existing.projects.push(p);
      else map.set(key, { displayName: displayName.trim(), projects: [p] });
    }
    const result = new Map<string, BuildProject[]>();
    for (const { displayName, projects: list } of map.values()) result.set(displayName, list);
    return result;
  }
  const githubGroupMap = groupByName(sortedProjects.filter((p) => p.githubRepoUrl));
  // Everything else groups by manualGroupName -- set from onboarding's
  // "name this project" step for a typed name, or (just as often) from the
  // real connected-folder name once handleOnboardFolder stamps it there.
  // Either way it's a real, project-owned value stored once and carried
  // forward forever after (see the upsert effect in useBuildAgent.ts), so
  // it survives a reload instead of depending on the live localFolderName
  // state, which resets to null every time. Onboarding is meant to make
  // this mandatory going forward, so ungroupedProjects should really only
  // ever hold projects saved before this existed.
  const manualGroupMap = groupByName(sortedProjects.filter((p) => !p.githubRepoUrl && p.manualGroupName));
  const ungroupedProjects = sortedProjects.filter((p) => !p.githubRepoUrl && !p.manualGroupName);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  function toggleGroup(name: string) {
    setCollapsedGroups((cur) => ({ ...cur, [name]: !cur[name] }));
  }
  const [historyMenuId, setHistoryMenuId] = useState<string | null>(null);
  // One row inside a History group (either a repo-name group or the
  // folder group) -- shared so neither renders its own copy of this markup.
  function renderProjectRow(p: BuildProject) {
    return (
      <div key={p.id} className="group relative flex items-center gap-1 rounded-xl px-2 py-1.5 hover:bg-surface-2">
        {p.pinned && <span className="shrink-0 text-muted">{PinIcon}</span>}
        <button onClick={() => selectProject(p.id)} className="min-w-0 flex-1 truncate text-left text-sm font-medium">
          {p.name}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setHistoryMenuId((cur) => (cur === p.id ? null : p.id));
          }}
          aria-label="Project options"
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-border hover:text-foreground ${
            historyMenuId === p.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          {KebabIcon}
        </button>
        {historyMenuId === p.id && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-full z-10 mt-1 w-32 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg"
          >
            <button
              onClick={() => {
                togglePinProject(p.id);
                setHistoryMenuId(null);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium hover:bg-surface-2"
            >
              {PinIcon} {p.pinned ? "Unpin" : "Pin"}
            </button>
            <button
              onClick={() => {
                deleteProject(p.id);
                setHistoryMenuId(null);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-red-500 hover:bg-surface-2"
            >
              {DeleteRowIcon} Delete
            </button>
          </div>
        )}
      </div>
    );
  }
  // Keyed by the group's first message index -- which step-groups the user
  // has manually collapsed. Expanded by DEFAULT now (inverted from the
  // original "collapsed unless opened" design) -- the request was to see
  // every step as it happens, the way a coding-agent's own transcript
  // does, not a summary that has to be clicked open every time.
  const [collapsedStepGroups, setCollapsedStepGroups] = useState<Set<number>>(new Set());

  // Consecutive step messages ("Wrote index.html", "Wrote styles.css", ...)
  // collapse into one group with a single summary header -- computed fresh
  // each render since messages changes constantly while streaming.
  type RenderItem = { kind: "message"; index: number } | { kind: "stepGroup"; startIndex: number; steps: BuildChatMessage[] };
  const renderItems: RenderItem[] = [];
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].step) {
      const steps: BuildChatMessage[] = [];
      let j = i;
      while (j < messages.length && messages[j].step) {
        steps.push(messages[j]);
        j++;
      }
      renderItems.push({ kind: "stepGroup", startIndex: i, steps });
      i = j - 1;
    } else {
      renderItems.push({ kind: "message", index: i });
    }
  }

  // A single work panel (Preview/Files tabs), not two permanent side
  // columns -- the chat is the primary, full-width view like any normal
  // chat. The panel opens itself the moment the AI has actually written a
  // file (not merely once the user has sent a first message -- "started"
  // goes true immediately on send, before the agent has produced anything,
  // which was opening an empty file-tree + "preview will appear here"
  // panel for no reason). Mirrors how ChatGiZa's own "Artifacts" panel
  // behaves: it appears when there's something to show, not as a fixed
  // 3-way split from message one. The user can close it and reopen it
  // manually afterwards without it forcing itself back open.
  const hasFiles = Object.keys(files).length > 0;
  const [panelOpen, setPanelOpen] = useState(false);
  // Removed again -- the panel was rendering blank for a real project, and
  // the user wants Code to just be the same single-column layout as Ask
  // for now. The globe icon stays visible in the header (grouped with the
  // other 3 icons, per request) but is inert until a genuinely new panel
  // design is built later -- not wired to open this. Widened to `boolean`
  // on purpose: a literal-`false` guard makes TypeScript treat the gated
  // branch as unreachable and stop narrowing types inside it, surfacing
  // unrelated "possibly null" errors in code nothing changed.
  const liveSectionRemoved: boolean = true;
  // Bumped to force BuildPreviewFrame to remount -- the browser-chrome
  // reload button's one real effect (Sandpack has no imperative refresh
  // API of its own, so remounting it is the actual reload).
  const [previewReloadKey, setPreviewReloadKey] = useState(0);
  // The address bar's own typed text, separate from `projectName` -- once
  // the user searches/navigates, the bar shows what they typed (like a
  // real browser's does) instead of snapping back to the project name.
  const [previewAddressInput, setPreviewAddressInput] = useState<string | null>(null);

  // Real second/third/... tabs, sitting alongside the fixed first "app"
  // tab (BuildPreviewFrame, never closable via the tab strip -- Close
  // there still closes the whole panel, same as before). Each one is a
  // plain iframe navigated to whatever the address bar sends it -- stays
  // visually inside this box, which means Google, GitHub, and any other
  // site that blocks being framed (their own server header, not something
  // this app controls) shows blank rather than opening a separate window.
  // That trade-off (blank-but-contained vs. shows-but-in-its-own-window)
  // was a deliberate choice, not an oversight.
  type ExternalTab = { id: string; label: string; url: string | null };
  const [externalTabs, setExternalTabs] = useState<ExternalTab[]>([]);
  const [activeExtTabId, setActiveExtTabId] = useState<string | null>(null);
  const activeExtTab = externalTabs.find((t) => t.id === activeExtTabId) ?? null;

  function openNewPreviewTab() {
    const id = crypto.randomUUID();
    setExternalTabs((prev) => [...prev, { id, label: "New tab", url: null }]);
    setActiveExtTabId(id);
    setPreviewAddressInput(null);
  }

  function closePreviewTab(id: string) {
    setExternalTabs((prev) => prev.filter((t) => t.id !== id));
    if (activeExtTabId === id) {
      setActiveExtTabId(null);
      setPreviewAddressInput(null);
    }
  }

  // Typing straight into the address bar while the app tab is showing
  // used to open externally (there's nothing to embed a page *into* on
  // that tab -- it's the live app, not a browsing surface) -- which read
  // as "it left the box" even though clicking + first, then typing the
  // exact same thing, stayed contained. Auto-creating the tab here removes
  // that inconsistency: typing anything in the address bar always lands
  // inline now, whichever tab happens to be active when you do it.
  function handleAddressBarSubmit(rawQuery: string) {
    const trimmed = rawQuery.trim();
    if (!trimmed) return;
    const url = resolveAddressBarUrl(trimmed);
    if (!activeExtTabId) {
      const id = crypto.randomUUID();
      setExternalTabs((prev) => [...prev, { id, label: trimmed, url }]);
      setActiveExtTabId(id);
      setPreviewAddressInput(null);
      return;
    }
    setExternalTabs((prev) => prev.map((t) => (t.id === activeExtTabId ? { ...t, label: trimmed, url } : t)));
  }

  useEffect(() => {
    if (hasFiles) setPanelOpen(true);
  }, [hasFiles]);

  // The Live window sits beside the chat column, sharing the row with it
  // (not floating on top and covering it) -- growing Live actually shrinks
  // chat's own width to make room, so nothing chat is showing ever ends up
  // hidden underneath Live. Resized via a full-height strip running down
  // its LEFT edge -- dragging it further left grows Live (and narrows
  // chat by the same amount); dragging it right shrinks Live back (and
  // gives chat that room back). Live's right edge just naturally sits at
  // the row's own right edge, same as any other flex child.
  const [previewWidth, setPreviewWidth] = useState(DEFAULT_PREVIEW_WIDTH);
  const isResizingRef = useRef(false);
  // Mirrors isResizingRef purely to drive the drag-overlay's render below
  // -- the ref itself is what onMouseMove reads (a ref survives inside the
  // effect's closure without re-subscribing it on every change; state read
  // there would go stale). Most of Live's body is the Sandpack live-
  // preview IFRAME, which has its own separate browser event context -- a
  // mouseup that lands over it never reaches this page's own mouseup
  // listener at all, so a resize-drag that ends there left isResizingRef
  // stuck "on", and the window kept growing/shrinking on its own with no
  // button even held. The overlay below covers the whole window while
  // resizing so every mouse event lands on this page's own DOM instead of
  // falling through into the iframe, which is what actually closes that
  // gap.
  const [deadPreviewDragActive, setDeadPreviewDragActive] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, width: 0 });
  // Wraps chat + Live (not the rail) -- its rect bounds how large Live can
  // grow, so chat is never squeezed away to nothing.
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function stopResizing() {
      isResizingRef.current = false;
      setDeadPreviewDragActive(false);
      document.body.style.cursor = "";
    }
    function onMouseMove(e: MouseEvent) {
      if (!isResizingRef.current) return;
      // If the mouse button was released outside the window (over the
      // taskbar, a different app, another monitor) the browser never
      // fires mouseup here, so this could get stuck "on" forever --
      // e.buttons === 0 means no button is currently held regardless of
      // where it was released, so this self-corrects on the very next
      // move instead of staying stuck.
      if (e.buttons !== 1) {
        stopResizing();
        return;
      }
      const row = rowRef.current;
      if (!row) return;
      const rect = row.getBoundingClientRect();
      const start = dragStartRef.current;
      // Moving the cursor LEFT (negative dx) grows Live -- the strip being
      // dragged is Live's left edge, so pulling it further from the fixed
      // right edge makes Live wider (and chat correspondingly narrower).
      const dx = e.clientX - start.mouseX;
      const maxWidth = Math.min(MAX_PREVIEW_WIDTH, rect.width - MIN_CHAT_WIDTH);
      const nextWidth = Math.min(maxWidth, Math.max(MIN_PREVIEW_WIDTH, start.width - dx));
      setPreviewWidth(nextWidth);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", stopResizing);
    // Belt-and-braces for the same "released outside the window" case --
    // if focus leaves the page entirely mid-drag, there's no mouseup at
    // all to catch.
    window.addEventListener("blur", stopResizing);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stopResizing);
      window.removeEventListener("blur", stopResizing);
    };
  }, []);

  function startResizingPreview(e: React.MouseEvent) {
    e.preventDefault();
    isResizingRef.current = true;
    setDeadPreviewDragActive(true);
    // previewWidth is only the FLOOR Live was last explicitly set/dragged
    // to -- its actual on-screen width is very often larger than that,
    // because flex-grow keeps it filling any extra room the row has
    // beyond what chat needs (see the panel's own comment above). Starting
    // the drag from previewWidth instead of the real rendered width meant
    // a modest drag frequently couldn't out-pace how far flex-grow had
    // already stretched it, so nothing visibly moved until you dragged
    // well past that point -- reading the actual DOM width here instead
    // makes every drag track the cursor 1:1 from wherever the window
    // already visually is, not from a floor that's stopped meaning
    // anything.
    const panelEl = (e.currentTarget as HTMLElement).closest<HTMLElement>("[data-live-panel]");
    const actualWidth = panelEl?.getBoundingClientRect().width ?? previewWidth;
    dragStartRef.current = { mouseX: e.clientX, width: actualWidth };
    document.body.style.cursor = "col-resize";
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    // pendingConfirmation is its own dependency, not just messages -- the
    // confirmation card is a separate element appended after the message
    // list, not a message itself, so without this the view never
    // re-scrolled when it appeared, leaving it sitting stranded just
    // outside (or barely inside) the visible area instead of properly
    // brought into view -- the "cuts into view strangely" symptom.
  }, [messages, pendingConfirmation]);

  // Ticks the "Working..." status line's elapsed time once a second
  // while the agent is actually running -- real seconds, not a canned
  // animation, so the status line looks the way a coding agent's own
  // live progress does (time/tokens/tasks all changing as it goes).
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    if (!sendingStats) return;
    const tick = () => setElapsedSeconds(Math.max(0, Math.round((Date.now() - sendingStats.startedAt) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [sendingStats]);

  // Same three shortcuts the VS Code extension's own confirmation modal
  // uses -- Esc to deny, Ctrl+Enter for a one-time allow, Ctrl+Shift+Enter
  // to allow every future prompt of that same kind for the rest of the
  // session. Only bound while a confirmation is actually showing.
  useEffect(() => {
    if (!pendingConfirmation) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        confirmPendingAction(false);
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        confirmPendingAction(true, true);
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        confirmPendingAction(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pendingConfirmation, confirmPendingAction]);

  useEffect(() => {
    if (!historyMenuId) return;
    function onClick() {
      setHistoryMenuId(null);
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [historyMenuId]);

  useEffect(() => {
    if (!modelInfoOpen) return;
    function onClick() {
      setModelInfoOpen(false);
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [modelInfoOpen]);

  useEffect(() => {
    if (!modeMenuOpen) return;
    function onClick() {
      setModeMenuOpen(false);
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [modeMenuOpen]);

  useEffect(() => {
    if (!attachMenuOpen) return;
    function onClick() {
      setAttachMenuOpen(false);
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [attachMenuOpen]);

  // Fetched fresh on every open -- a peek, not a consuming request, so
  // just looking at this popover never itself counts toward the limit.
  useEffect(() => {
    if (!modelInfoOpen) return;
    let cancelled = false;
    fetch("/api/build/usage")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setBuildUsage(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [modelInfoOpen]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text && attachedImages.length === 0) return;
    setInput("");
    const images = attachedImages;
    setAttachedImages([]);
    // Only a brand-new project's first message triggers the identity
    // picker -- a follow-up message on a project already in progress just
    // sends normally, same as before. Always opens it fresh rather than
    // silently reusing a still-active GitHub/folder connection from a
    // previous project -- see startWithPrompt's comment for why.
    if (!started) {
      pendingSubmitRef.current = { text, images };
      setOnboardOpen(true);
      return;
    }
    send(text, images.length > 0 ? images : undefined);
  }

  // Unlike attachedImages (staged, sent as a chat message part on submit),
  // an uploaded file lands directly in the project's file map -- there's
  // no equivalent "generic file" chat attachment type on the wire (see
  // ChatContentPart in src/lib/ai.ts), and the point of this button is to
  // add real project source (an HTML/JS/CSS file the user already has) as
  // if the agent had just written it, not to describe it to the model.
  function readAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("not text")));
      reader.onerror = () => reject(reader.error ?? new Error("read failed"));
      reader.readAsText(file);
    });
  }

  async function handleUploadFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const added: string[] = [];
    const skipped: string[] = [];
    const next = { ...files };

    for (const file of Array.from(fileList)) {
      if (file.size > MAX_BUILD_SINGLE_FILE_BYTES) {
        skipped.push(`${file.name} (too large)`);
        continue;
      }
      let text: string;
      try {
        text = await readAsText(file);
      } catch {
        skipped.push(`${file.name} (unreadable)`);
        continue;
      }
      if (text.includes(String.fromCharCode(0))) {
        skipped.push(`${file.name} (binary, not text)`);
        continue;
      }
      // No folder picker here -- files land at the project root under
      // their own name, same place a fresh write_file("name.ext", ...)
      // from the agent would put them; the user (or the agent afterward)
      // can still move/rename it like any other project file.
      next[file.name] = text;
      added.push(file.name);
    }

    const sizeError = validateBuildFiles(next);
    if (sizeError) {
      setUploadNotice(sizeError);
    } else {
      for (const name of added) setFileContent(name, next[name]);
      setUploadNotice(
        [added.length > 0 ? `Added ${added.join(", ")}` : "", skipped.length > 0 ? `Skipped ${skipped.join(", ")}` : ""]
          .filter(Boolean)
          .join(" -- ") || null
      );
    }
    if (uploadNoticeTimerRef.current) clearTimeout(uploadNoticeTimerRef.current);
    uploadNoticeTimerRef.current = setTimeout(() => setUploadNotice(null), 4000);
  }

  const MAX_ATTACHED_IMAGES = 4;
  const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

  function handleImageFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_ATTACHED_IMAGES - attachedImages.length;
    if (remaining <= 0) return;
    Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, remaining)
      .forEach((file) => {
        if (file.size > MAX_IMAGE_BYTES) return;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result;
          if (typeof dataUrl === "string") {
            setAttachedImages((prev) => [...prev, { dataUrl, name: file.name }]);
          }
        };
        reader.readAsDataURL(file);
      });
  }

  // Same width and footer as Home's ChatSidebar (var(--sidebar-width),
  // AccountMenu at the bottom) so switching the Home/Code pill feels like
  // one product, not two differently-shaped tools.
  const rail = (
    <div className="flex h-full w-[var(--sidebar-width)] shrink-0 flex-col gap-3 border-r border-border bg-sidebar px-3 pt-0">
      <div className="flex w-full items-center justify-between text-muted">
        <Link href="/chatgiza" aria-label="Menu" className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface-2 hover:text-foreground">
          {ToolbarMenuIcon}
        </Link>
        <Link href="/chatgiza" aria-label="Toggle sidebar" className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface-2 hover:text-foreground">
          {ToolbarSidebarIcon}
        </Link>
        <Link href="/chatgiza" aria-label="Search chats" className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface-2 hover:text-foreground">
          {ToolbarSearchIcon}
        </Link>
        <button onClick={() => window.history.back()} aria-label="Back" className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface-2 hover:text-foreground">
          {ToolbarBackIcon}
        </button>
        <button onClick={() => window.history.forward()} aria-label="Forward" className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface-2 hover:text-foreground">
          {ToolbarForwardIcon}
        </button>
      </div>
      <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1">
        <Link href="/chatgiza" className="flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1 text-center text-sm font-medium text-muted transition-colors hover:text-foreground">
          {AskPillIcon}
          Ask
        </Link>
        <span className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-surface px-2 py-1 text-center text-sm font-medium text-foreground shadow-sm">
          {CodePillIcon}
          Code
        </span>
      </div>
      <button
        onClick={reset}
        className="flex h-10 w-full items-center gap-2 rounded-xl border border-border px-2 text-sm font-medium shadow-sm transition-all hover:bg-surface-2 hover:shadow-md"
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">{PencilIcon}</span>
        New chat
      </button>
      <button
        onClick={startLearnToCode}
        className="flex h-10 w-full items-center gap-2 rounded-xl px-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">{LearnIcon}</span>
        Learn to code
      </button>

      {/* History right here in the rail, below New chat, always visible.
          Grouped by the REAL name behind each project -- the actual repo
          name it was pushed to, or the actual folder name connected on
          this device -- never a generic "GitHub"/"Folder" label, matching
          how a project picker names each container after the real project
          it is. Each group collapses independently and has its own "+" to
          start a new chat. */}
      {(githubGroupMap.size > 0 || manualGroupMap.size > 0 || ungroupedProjects.length > 0) && (
        <div className="sidebar-scroll flex min-h-0 flex-1 flex-col overflow-y-auto">
          {/* Plain rows, no group header -- only ever projects saved
              before onboarding made naming mandatory. A header only ever
              appears once a project actually has a real name. */}
          {ungroupedProjects.length > 0 && <div className="space-y-0.5 pb-1">{ungroupedProjects.map(renderProjectRow)}</div>}

          {[...githubGroupMap.entries(), ...manualGroupMap.entries()].map(([groupName, list]) => (
            <div key={groupName} className="flex shrink-0 flex-col">
              <div className="group/header flex items-center gap-1 rounded-lg px-1 py-1 hover:bg-surface-2">
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="flex min-w-0 flex-1 items-center gap-1.5 px-1.5 py-1 text-left text-sm font-medium text-foreground"
                >
                  <span className={`shrink-0 transition-transform ${!collapsedGroups[groupName] ? "rotate-90" : ""}`}>{ChevronRightIcon}</span>
                  <span className="truncate">{groupName}</span>
                </button>
                <button
                  onClick={reset}
                  aria-label={`New chat in ${groupName}`}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted opacity-0 transition-colors hover:bg-border hover:text-foreground group-hover/header:opacity-100"
                >
                  {PlusTabIcon}
                </button>
              </div>
              {!collapsedGroups[groupName] && <div className="space-y-0.5 pb-1">{list.map(renderProjectRow)}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Same AccountMenu Home's footer uses -- Settings/Upgrade/Support
          all live in ChatGizaShell (a shared ancestor of both this page
          and Home's page.tsx), so they open as overlays right here, no
          navigating away from Code to reach them. Language is the one
          panel that's still Home-page-local, so it's rendered below,
          right where Home renders its own copy. */}
      <div className="mt-auto flex items-center border-t border-border py-3">
        <AccountMenu
          variant="expanded"
          onOpenSettings={openSettingsTab}
          onOpenLanguage={() => setLanguageOpen(true)}
          onOpenSupport={() => window.open("https://support.wellxai.world", "_blank", "noopener,noreferrer")}
        />
      </div>
    </div>
  );

  if (welcomeStep) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-background px-6 text-center text-foreground">
        {welcomeStep === "name" ? (
          <>
            <h1 className="text-3xl font-semibold tracking-tight">What's your name?</h1>
            <p className="mt-2 text-sm text-muted">So ChatGiZa knows what to call you.</p>
            <div className="mt-6 w-full max-w-sm">
              <input
                autoFocus
                value={welcomeName}
                onChange={(e) => setWelcomeName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && welcomeName.trim()) setWelcomeStep("role");
                }}
                placeholder="Your name"
                className="w-full rounded-full border border-border bg-surface px-5 py-3 text-center text-sm outline-none focus:border-foreground/40"
              />
              <button
                type="button"
                disabled={!welcomeName.trim()}
                onClick={() => setWelcomeStep("role")}
                className="btn-primary mt-3 w-full rounded-full px-5 py-3 text-sm font-medium disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-semibold tracking-tight">What kind of work do you do?</h1>
            <p className="mt-2 text-sm text-muted">Just for a nicer first impression -- it doesn't change how Build works.</p>
            <div className="mt-6 w-full max-w-sm">
              <select
                value={welcomeRole}
                onChange={(e) => setWelcomeRole(e.target.value)}
                className="w-full rounded-full border border-border bg-surface px-5 py-3 text-center text-sm outline-none focus:border-foreground/40"
              >
                <option value="">Select your role</option>
                <option value="engineer">Software engineer</option>
                <option value="designer">Designer</option>
                <option value="business">Business owner</option>
                <option value="student">Student</option>
                <option value="other">Other</option>
              </select>
              {welcomeRole && (
                <button type="button" onClick={finishWelcome} className="btn-primary mt-3 w-full rounded-full px-5 py-3 text-sm font-medium">
                  Continue
                </button>
              )}
              <button type="button" onClick={finishWelcome} className="mt-4 text-sm text-muted transition-colors hover:text-foreground">
                Set up later
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (!started) {
    return (
      <>
      <div className="flex h-full w-full overflow-hidden">
        {rail}
        {projects.length > 0 ? (
          // A returning user (real history to show): content starts right
          // under the top bar and scrolls independently, while the
          // composer stays pinned to the bottom edge -- same as every
          // other chat/composer in this app, which the previous version
          // of this layout broke by letting the composer sit wherever the
          // content above it happened to end, stranding it mid-page with
          // a dead gap below instead of at the bottom where it's always
          // been.
          <div className="mx-auto flex w-full max-w-[var(--max-w-chat)] flex-1 flex-col overflow-hidden px-4">
            <div className="sidebar-scroll flex-1 overflow-y-auto pb-4 pt-8">
              <h1 className="text-xl font-semibold tracking-tight">What should ChatGiZa build?</h1>
              <div className="mt-4 w-full">
                <BuildStatsCard projects={projects} />
              </div>
            </div>
            <form onSubmit={onSubmit} className="pb-6 pt-2">
              <div className="flex items-center gap-2 rounded-2xl border border-composer-border bg-composer px-4 py-3 shadow-sm">
                <input
                  autoFocus
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g. Build a landing page for a bakery"
                  className="flex-1 bg-transparent text-sm outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  aria-label="Send"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-500 disabled:opacity-40"
                >
                  {SendIcon}
                </button>
              </div>
              {error && <p className="mt-3 text-center text-sm text-red-500">{error}</p>}
            </form>
          </div>
        ) : (
          // A genuinely first-time user, nothing to show yet. Used to be
          // just the heading + composer with nothing else -- per feedback,
          // that landed people on a blank box with no sense of what Build
          // can actually do. Quick-start cards (mirroring how a fresh
          // coding-agent session offers "design a system" / "debug" /
          // "build a prototype" style starting points) go first; the
          // composer right below still covers "I have my own idea" for
          // anyone who'd rather just type it themselves.
          <div className="relative mx-auto flex w-full max-w-[var(--max-w-chat)] flex-1 flex-col items-center justify-center px-4">
            <h1 className="text-3xl font-semibold tracking-tight">What should ChatGiZa build?</h1>
            <div className="mt-6 grid w-full gap-2.5 sm:grid-cols-3">
              <button
                type="button"
                onClick={startWebsite}
                className="flex flex-col items-start gap-2 rounded-2xl border border-border p-4 text-left transition-colors hover:border-foreground/40 hover:bg-surface-2"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-muted">{WebsiteStartIcon}</span>
                <span className="text-sm font-medium text-foreground">Build a website</span>
              </button>
              <button
                type="button"
                onClick={startApp}
                className="flex flex-col items-start gap-2 rounded-2xl border border-border p-4 text-left transition-colors hover:border-foreground/40 hover:bg-surface-2"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-muted">{AppStartIcon}</span>
                <span className="text-sm font-medium text-foreground">Build an app</span>
              </button>
              <button
                type="button"
                onClick={startLearnToCode}
                className="flex flex-col items-start gap-2 rounded-2xl border border-border p-4 text-left transition-colors hover:border-foreground/40 hover:bg-surface-2"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-muted">{LearnIcon}</span>
                <span className="text-sm font-medium text-foreground">Learn to code</span>
              </button>
            </div>
            <form onSubmit={onSubmit} className="mt-4 w-full">
              <div className="flex items-center gap-2 rounded-2xl border border-composer-border bg-composer px-4 py-3 shadow-sm">
                <input
                  autoFocus
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Or describe your own idea -- e.g. Build a landing page for a bakery"
                  className="flex-1 bg-transparent text-sm outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  aria-label="Send"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-500 disabled:opacity-40"
                >
                  {SendIcon}
                </button>
              </div>
              {error && <p className="mt-3 text-center text-sm text-red-500">{error}</p>}
            </form>
          </div>
        )}
      </div>
      {languageOpen && (
        <LanguagePanel language={language} onSelect={setLanguage} onClose={() => setLanguageOpen(false)} />
      )}
      {onboardOpen && (
        // Wider than a typical small modal and anchored near the bottom of
        // the screen, right above the composer. Redrawn as a plain list of
        // full-width rows (a single hairline between them, via divide-y)
        // instead of three separately bordered, separately colored boxes
        // -- that read as a form; this reads as one clean menu, monochrome
        // throughout like the rest of the app, each row's own icon circle
        // the only real ink change and pressed for its whole width, not
        // just a small button inside it.
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:p-6" role="alertdialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-2 shadow-lg">
            <p className="px-3 pb-2 pt-3 text-base font-semibold text-foreground">Where should this project live?</p>
            {manualGroupMap.size > 0 && (
              <>
                <p className="px-3 pb-1 text-xs font-medium text-muted">Continue an existing project</p>
                <div className="divide-y divide-border">
                  {Array.from(manualGroupMap.keys()).map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleOnboardExisting(name)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-foreground">{AttachFolderIcon}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{name}</span>
                      <span className="shrink-0 text-muted">{ChevronRightIcon}</span>
                    </button>
                  ))}
                </div>
                <p className="px-3 pb-1 pt-3 text-xs font-medium text-muted">Or start something new</p>
              </>
            )}
            <div className="divide-y divide-border">
              <button
                type="button"
                onClick={handleOnboardGithub}
                disabled={onboardBusy !== null}
                className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-2 disabled:opacity-60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-foreground">{GitHubGlyphIcon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {onboardBusy === "github" ? "Connecting…" : "Connect GitHub"}
                  </span>
                  <span className="block text-xs text-muted">Saves to a real repository as you build</span>
                </span>
                <span className="shrink-0 text-muted">{ChevronRightIcon}</span>
              </button>
              {folderSupported && (
                <button
                  type="button"
                  onClick={handleOnboardFolder}
                  disabled={onboardBusy !== null}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-2 disabled:opacity-60"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-foreground">{AttachFolderIcon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">
                      {onboardBusy === "folder" ? "Choosing…" : "Choose a folder on this device"}
                    </span>
                    <span className="block text-xs text-muted">Every file gets written there too as it's built</span>
                  </span>
                  <span className="shrink-0 text-muted">{ChevronRightIcon}</span>
                </button>
              )}
              <div className="flex w-full items-center gap-3 px-3 py-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-foreground">{PencilIcon}</span>
                <input
                  autoFocus
                  value={onboardNameInput}
                  onChange={(e) => setOnboardNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleOnboardName();
                  }}
                  placeholder="Or just give it a name -- e.g. Bakery landing page"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
                />
                <button
                  type="button"
                  disabled={!onboardNameInput.trim()}
                  onClick={handleOnboardName}
                  aria-label="Continue"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-30"
                >
                  {ChevronRightIcon}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </>
    );
  }

  return (
    <>
    <div className="flex h-full w-full overflow-hidden">
      {/* History steps out of the way while Live is open -- per feedback,
          Live specifically belongs in this exact spot (not appended after
          Files like Progress/Terminal/Browse), so it gets the room History
          just vacated instead of squeezing in in addition to it. Comes
          back the instant Live closes (with Files, or by hand). */}
      {!livePanelOpen && rail}
      {/* min-w-0 -- without it, this row (itself a flex item next to
          ChatSidebar) defaulted to a content-based min-width, so it could
          render wider than the space it was actually given and rely on the
          page-level overflow-hidden to hide the difference, rather than
          genuinely shrinking. That's what let the whole row -- chat
          included -- balloon past the viewport instead of chat ever
          reaching a truly narrow width. */}
      <div ref={rowRef} className="relative flex min-h-0 min-w-0 flex-1">
        {/* Sits at the row's LEFT edge, in History's own spot, per
            feedback -- a real fixed, shrink-0 width with its own handle,
            same mechanics as every other panel (Files included, which
            stays fully independent of this one). Resizes from its RIGHT
            edge since it's the leftmost thing in the row now; the handle
            anchors to rowRef's own left edge rather than window.innerWidth
            like the right-side panels. Bigger default width than the
            other panels start at -- per feedback, it should open noticeably
            wide by default, not the same modest size as Progress/Terminal. */}
        {livePanelOpen && (
          <div
            className="relative flex min-w-0 shrink-0 flex-col overflow-hidden rounded-r-2xl border-r border-border bg-surface mr-4"
            style={{ width: liveWidth }}
          >
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                liveResizing.current = true;
                setIsDragActive(true);
              }}
              // Widened from the original w-2 (8px) -- per feedback, that
              // was easy to miss by a couple of pixels and get nothing in
              // response, reading as the drag being stuck rather than a
              // near-miss (same fix already applied to Live's own handle
              // further down, extended here to every other panel).
              className="absolute -right-2 top-0 z-10 h-full w-4 cursor-col-resize"
            />
            <div className="flex shrink-0 items-center justify-between border-b border-border p-2">
              <span className="px-1 text-sm font-semibold text-foreground">Live</span>
              <button
                onClick={() => setLivePanelOpen(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                {CloseIcon}
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <BuildPreviewFrame files={files} />
            </div>
          </div>
        )}
        {!livePanelOpen && (
        <div
          // The live preview section is removed (see `liveSectionRemoved`
          // above). flex-1 (not w-full) so the Browse panel below, when
          // open, shares this row as a sibling instead of overlaying on
          // top of it -- chat shrinks to make room rather than getting
          // covered. relative (not just the outer row) so the title badge
          // and icon group below -- both absolutely positioned against
          // THIS div now, not the outer row -- shrink back in together
          // with the chat column as the Browse panel opens, instead of
          // staying pinned to the full row's edge and ending up stranded
          // over the now-open panel. No max-width HERE anymore, though --
          // that constraint moved down onto the header/composer/scroll-
          // content wrappers individually below, so the SCROLL CONTAINER
          // itself spans this whole column and its native scrollbar
          // renders at the column's true right edge (flush with the icon
          // group above) instead of hugging the narrow --content-width
          // column's own edge, which read as a scrollbar stranded in the
          // middle of the page.
          className="relative flex min-h-0 min-w-0 flex-1 flex-col p-3"
        >
          {/* A single real flex row (title on the left, icon toolbar on the
              right) instead of two independently absolutely-positioned
              corners -- those had no way to know about each other's actual
              size, so at a narrow enough chat width the title's own
              max-w-[50%] budget (measured against the whole row, not what
              the icon group left over) could still exceed the real leftover
              space and get squeezed down to just a few unreadable pixels.
              A real flex row can't do that: the title's min-w-0 + truncate
              only ever shrinks it into whatever the shrink-0 icon group
              didn't take, down to 0 if it must, but never negative/overlapping. */}
          <div className="relative z-10 flex shrink-0 items-center justify-between gap-2 px-3 pt-3">
            {started ? (
              <div className="flex min-w-0 items-center gap-2">
                {/* Icon and the chat's own name are plain, no background --
                    the pill belongs ONLY on the group name after them (the
                    actual folder/repo this chat lives in), not the chat name
                    itself. */}
                <span className="shrink-0 text-foreground">{ProjectBadgeIcon}</span>
                <span className="min-w-0 truncate text-sm font-bold text-foreground">{projectName}</span>
                {activeGroupName && (
                  <span className="shrink-0 truncate rounded-md bg-surface-2 px-2 py-1 text-xs font-bold text-foreground">
                    {activeGroupName}
                  </span>
                )}
              </div>
            ) : (
              <span />
            )}
            <div className="flex shrink-0 items-center gap-0.5 text-foreground">
            <button
              onClick={() => setProgressPanelOpen((v) => !v)}
              aria-label="Progress"
              aria-pressed={progressPanelOpen}
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors [&>svg]:h-4 [&>svg]:w-4 ${
                progressPanelOpen ? "bg-blue-500 text-white" : "text-foreground hover:bg-surface-2"
              }`}
            >
              {StudentPanelIcon}
            </button>
            <button
              onClick={() => setTerminalPanelOpen((v) => !v)}
              aria-label="Terminal"
              aria-pressed={terminalPanelOpen}
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors [&>svg]:h-4 [&>svg]:w-4 ${
                terminalPanelOpen ? "bg-blue-500 text-white" : "text-foreground hover:bg-surface-2"
              }`}
            >
              {TerminalIcon}
            </button>
            <button
              onClick={() => setFilesPanelOpen((v) => !v)}
              aria-label="Files"
              aria-pressed={filesPanelOpen}
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors [&>svg]:h-4 [&>svg]:w-4 ${
                filesPanelOpen ? "bg-blue-500 text-white" : "text-foreground hover:bg-surface-2"
              }`}
            >
              {BuildingCardIcon}
            </button>
            {/* Live is otherwise fully independent of Files now (see its
                panel further down) -- per feedback, treating it as a
                special satellite of Files (positioned first in the row,
                hiding chat/History, closing together) was itself the bug:
                two panels sharing one "slot" in the layout is what kept
                breaking. It still opens itself automatically the moment a
                real edit happens (see handleFileEdit), but this toggle
                lets it be opened/closed by hand too, exactly like Progress/
                Terminal/Browse. */}
            <button
              onClick={() => setLivePanelOpen((v) => !v)}
              aria-label="Live"
              aria-pressed={livePanelOpen}
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors [&>svg]:h-4 [&>svg]:w-4 ${
                livePanelOpen ? "bg-blue-500 text-white" : "text-foreground hover:bg-surface-2"
              }`}
            >
              {DevicePreviewIcon}
            </button>
            <button
              onClick={() => setBrowsePanelOpen((v) => !v)}
              aria-label="Browse"
              aria-pressed={browsePanelOpen}
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors [&>svg]:h-4 [&>svg]:w-4 ${
                browsePanelOpen ? "bg-blue-500 text-white" : "text-foreground hover:bg-surface-2"
              }`}
            >
              {GlobeIcon}
            </button>
            <button aria-label="More" className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-surface-2 [&>svg]:h-[18px] [&>svg]:w-[18px]">
              {KebabIcon}
            </button>
            </div>
          </div>
          {/* No card chrome at all here -- no border, no fill. The live
              window is the only one styled as a bordered "window"; the
              chat side just sits plainly on the page. */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* The SCROLL CONTAINER stays full-width (so its native
                scrollbar still sits at the true page edge, per the
                earlier fix) -- but the actual message content inside it is
                centered (mx-auto) at 900px, matching the header above.
                Confirmed centered correctly at --content-width (679px)
                first, then widened a bit further per request while
                staying centered. px-4/py-8 still matches the main Ask
                chat's own padding scale. space-y-1 (rather than main's
                space-y-4) stays deliberately tight because this list also
                holds the dense step-log lines -- real chat turns get
                their own breathing room below via a margin on the
                "message" render item itself instead, so steps don't
                inherit gaps this size. */}
            {/* overflow-x-hidden (only overflow-y was ever set here) --
                without it, a wide descendant (a long code snippet, an
                unbroken URL) doesn't just scroll horizontally in place, it
                pushes this whole flex-1 min-w-0 chat column wider to fit,
                overriding the width panel-dragging is actually supposed to
                leave it. */}
            {/* Per feedback: the thin .sidebar-scroll treatment already
                used elsewhere in the app is the actual target here, same
                as the main Ask chat. */}
            <div ref={scrollRef} className="sidebar-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <div className="mx-auto w-full max-w-[800px] space-y-1 px-4 py-8">
              {renderItems.map((item) => {
                if (item.kind === "stepGroup") {
                  const isExpanded = !collapsedStepGroups.has(item.startIndex);
                  // Surfaced on the collapsed header too, not just once
                  // expanded -- a dropped-content warning shouldn't depend
                  // on the user happening to click a group open.
                  const hasWarning = item.steps.some((s) => s.warning && !s.reverted);
                  const summary = summarizeSteps(item.steps);
                  // A single-step group's header already says everything
                  // there is to say -- expanding it used to just repeat the
                  // exact same label inside a bordered box underneath,
                  // which read as a pointless duplicate rather than real
                  // detail. Only a multi-step group ("Wrote 3 files") has
                  // anything genuinely new to reveal (which specific files).
                  const canExpand = item.steps.length > 1;
                  // A single-step group's own revert state isn't captured by
                  // `summary` at all (summarizeSteps only knows labels/diff
                  // stats) -- read it straight off the one step so a
                  // reverted single write still shows struck-through with
                  // "(reverted)", same as it would inside an expanded group.
                  const soloReverted = !canExpand && item.steps[0].reverted;
                  // Chevron goes at the END of the line ("Used 3 tools ›"),
                  // not the front -- matches the reference transcript style
                  // the user pointed to, where every line's arrow trails
                  // the text instead of leading it.
                  const headerContent = (
                    <>
                      {hasWarning && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-label="Warning" />}
                      <span className={`min-w-0 flex-1 truncate ${soloReverted ? "line-through" : ""}`}>{summary.label}</span>
                      {!soloReverted && summary.diffStat && <DiffStatBadge stat={summary.diffStat} />}
                      {soloReverted && <span className="shrink-0 text-xs no-underline">(reverted)</span>}
                      {canExpand && (
                        <span className={`shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}>{ChevronRightIcon}</span>
                      )}
                    </>
                  );
                  return (
                    <div key={`group-${item.startIndex}`} className="my-1">
                      {canExpand ? (
                        <button
                          type="button"
                          onClick={() =>
                            setCollapsedStepGroups((prev) => {
                              const next = new Set(prev);
                              if (next.has(item.startIndex)) next.delete(item.startIndex);
                              else next.add(item.startIndex);
                              return next;
                            })
                          }
                          className="flex w-full items-center gap-1.5 rounded-lg px-1 py-1.5 text-left text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                        >
                          {headerContent}
                        </button>
                      ) : (
                        <div className="px-1 py-1.5">
                          <div className="flex w-full items-center gap-1.5 text-sm text-muted">{headerContent}</div>
                          {hasWarning && !item.steps[0].reverted && (
                            <p className="mt-0.5 pl-5 text-xs text-amber-500">{item.steps[0].warning}</p>
                          )}
                        </div>
                      )}
                      {/* Plain stacked lines, same font/weight as the header
                          -- no border or background box. A box here just
                          repeated what the header already said for the
                          common single-step case, and added visual weight
                          the collapsed-action-log style (matching the host
                          app's own tool-call transcript) doesn't have. */}
                      {canExpand && isExpanded && (
                        <div className="ml-5 mt-0.5 space-y-1">
                          {item.steps.map((s, si) => (
                            <div key={si}>
                              <p className={`flex items-center gap-1.5 text-sm ${s.reverted ? "text-muted line-through" : "text-muted"}`}>
                                <span>{renderWithLinks(s.content)}</span>
                                {!s.reverted && s.diffStat && <DiffStatBadge stat={s.diffStat} />}
                                {s.reverted && <span className="shrink-0 text-xs no-underline">(reverted)</span>}
                              </p>
                              {!s.reverted && s.warning && <p className="mt-0.5 text-xs text-amber-500">{s.warning}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                const m = messages[item.index];
                // Same bubble layout as the main ChatGiZa chat
                // (ChatMessageBubble.tsx) instead of Build's earlier flat,
                // full-width block for every message: user text sits in a
                // right-aligned `.user-bubble` pill, assistant text is
                // plain floating markdown on the left with no box at all --
                // ported over per request, so both surfaces read as the
                // same chat instead of two differently-shaped ones.
                return (
                  <div key={item.index} className={`flex flex-col py-1.5 ${m.role === "user" ? "items-end" : "items-start"}`}>
                    {m.role === "user" ? (
                      <>
                        {m.imageUrls && m.imageUrls.length > 0 && (
                          <div className="mb-1.5 flex flex-wrap justify-end gap-1.5">
                            {m.imageUrls.map((url, i) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={i} src={url} alt="" className="h-16 w-16 rounded-lg border border-border object-cover" />
                            ))}
                          </div>
                        )}
                        {m.content && (
                          <p className="chat-text user-bubble max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3">
                            {renderWithLinks(m.content)}
                          </p>
                        )}
                      </>
                    ) : (
                      // Real markdown rendering (same renderer/CSS as the
                      // main chat) -- previously this was raw text, so
                      // "**bold**" and "- list" markers showed up as
                      // literal asterisks and dashes instead of actually
                      // being bold or a list.
                      <TruncatedAssistantText content={m.content} />
                    )}
                  </div>
                );
              })}
              {sending && sendingStats && (
                <p className="flex items-center gap-1.5 px-1 py-1 text-[13px] font-medium text-muted">
                  <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-orange-500" />
                  <span>
                    {elapsedSeconds >= 60 ? `${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s` : `${elapsedSeconds}s`}
                    {sendingStats.tokens > 0 &&
                      ` · ${sendingStats.tokens >= 1000 ? `${(sendingStats.tokens / 1000).toFixed(1)}k` : sendingStats.tokens} tokens`}
                    {sendingStats.tasksRun > 0 && ` · ${sendingStats.tasksRun} task${sendingStats.tasksRun === 1 ? "" : "s"}`}
                    {` · ${sendingStats.currentAction ?? "Running…"}`}
                  </span>
                </p>
              )}
              {error && <p className="px-1 py-1 text-[13px] font-medium text-red-500">{error}</p>}
              {/* Inline, full-width, no dark backdrop -- not the floating
                  centered/bottom-sheet dialog it used to be, which read as
                  a disconnected popup rather than part of the conversation.
                  Renders right where a new step would naturally land, at
                  the bottom of the same scrolling list every other message
                  and step lives in. */}
              {pendingConfirmation && (
                <div className="rounded-xl border border-border bg-surface-2 p-3">
                  <p className="text-sm font-medium text-foreground">{pendingConfirmation.detail}</p>
                  <p className="mt-1 text-xs text-muted">
                    {pendingConfirmation.kind === "deploy_to_vercel"
                      ? "This creates a real, public deployment."
                      : pendingConfirmation.kind === "run_terminal_command"
                        ? "This runs in a real sandboxed environment, not a simulation."
                        : pendingConfirmation.kind === "push_to_github"
                          ? "This creates or updates a real GitHub repository."
                          : pendingConfirmation.kind === "delete_file"
                            ? "This removes the file from the project."
                            : "This changes the project's files."}
                  </p>
                  {/* The exact command/path/name, not just the paraphrase
                      above -- same as the VS Code extension's own
                      confirmation always showing the real thing about to
                      run, in its own monospace block. */}
                  {pendingConfirmation.code && (
                    <div className="mt-2 overflow-hidden rounded-lg bg-[#1e1e1e] px-3 py-2">
                      <CodeMirror
                        value={pendingConfirmation.code}
                        theme={vscodeDark}
                        extensions={[javascript(), confirmationCodeChrome, EditorView.lineWrapping]}
                        editable={false}
                        basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: false }}
                      />
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => confirmPendingAction(false)}
                      className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                    >
                      Deny
                      <span className="rounded border border-border px-1 py-px text-[10px] font-normal text-muted">Esc</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmPendingAction(true, true)}
                      className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
                    >
                      Always allow
                      <span className="rounded border border-border px-1 py-px text-[10px] font-normal text-muted">Ctrl ⇧ Enter</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmPendingAction(true)}
                      className="btn-primary flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
                    >
                      Allow once
                      <span className="rounded border border-background/30 px-1 py-px text-[10px] font-normal text-background/80">
                        Ctrl Enter
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            </div>
            <form onSubmit={onSubmit} className="mx-auto w-full max-w-[800px] p-3 pb-4">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  handleImageFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <input
                ref={uploadInputRef}
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  handleUploadFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              {/* webkitdirectory is non-standard but broadly supported in
                  every Chromium/Firefox browser -- the one way to let a
                  file picker return a whole folder's worth of files
                  instead of one at a time. Reuses handleUploadFiles as-is,
                  which reads each file by its flat .name -- subfolder
                  structure inside the picked folder isn't preserved, a
                  real simplification worth calling out, not silently. */}
              <input
                ref={folderInputRef}
                type="file"
                multiple
                hidden
                {...({ webkitdirectory: "" } as Record<string, string>)}
                onChange={(e) => {
                  handleUploadFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              {uploadNotice && <p className="mb-2 px-1 text-[13px] font-medium text-muted">{uploadNotice}</p>}
              {attachedImages.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2 px-1">
                  {attachedImages.map((img, i) => (
                    <div key={i} className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.dataUrl} alt={img.name} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setAttachedImages((prev) => prev.filter((_, idx) => idx !== i))}
                        aria-label={`Remove ${img.name}`}
                        className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        {CloseIcon}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* One rounded box, not an input + a separate "Send" button
                  beside it -- the send icon sits inside the box's own right
                  edge, same shape as the empty-state composer. A lighter
                  surface (not the near-black composer color) so the box
                  itself is visibly distinct from the black chat behind it. */}
              <div className="flex items-end gap-2 rounded-2xl border border-composer-border bg-background px-4 py-2 shadow-sm">
                <textarea
                  ref={messageInputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter sends, Shift+Enter inserts a real newline -- a
                    // textarea doesn't auto-submit its form on Enter the
                    // way the plain <input> this replaced did, so this has
                    // to call the same onSubmit the Send button triggers,
                    // directly (not form.requestSubmit(), which doesn't
                    // reliably reach this form's onSubmit in every context).
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      onSubmit(e as unknown as React.FormEvent);
                    }
                  }}
                  placeholder="Ask for a change…"
                  rows={1}
                  style={{ maxHeight: MAX_COMPOSER_HEIGHT }}
                  className="sidebar-scroll flex-1 resize-none overflow-y-auto bg-transparent py-1 text-sm outline-none"
                />
                <button
                  type={sending ? "button" : "submit"}
                  onClick={sending ? stop : undefined}
                  disabled={!sending && !input.trim() && attachedImages.length === 0}
                  aria-label={sending ? "Stop" : "Send"}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-2 disabled:opacity-40 ${
                    sending ? "hover:bg-border" : ""
                  }`}
                >
                  {sending ? StopIcon : SendIcon}
                </button>
              </div>
              {/* Below the box, not inside it -- Auto/attach/mic on the
                  left, model+effort (with the info popover) on the right,
                  matching the coding-agent composer this was modeled on.
                  flex-wrap (not a fixed single row) -- neither group has
                  anywhere left to shrink (every label/icon here is already
                  as compact as it can be), so without wrapping, this row's
                  combined content set a hard floor under chat's real width
                  well above what MIN_CHAT_WIDTH claimed, letting a
                  side panel get dragged wide enough to overflow anyway. */}
              <div className="flex flex-wrap items-center justify-between gap-1 px-1 pt-1.5">
                <div className="flex items-center gap-1">
                  {/* Was a plain static "Auto" label that didn't do
                      anything -- now a real Mode selector wired to the
                      same always-allow mechanism the per-prompt "Always
                      allow" button already uses (see setPermissionMode in
                      useBuildAgent.ts). Only Manual/Accept edits/Auto are
                      offered -- no Plan or Bypass permissions, since
                      neither maps to anything this agent actually does
                      differently today; adding them as decoration that
                      doesn't change behavior would be worse than not
                      having them. */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setModeMenuOpen((v) => !v);
                      }}
                      className="rounded-full px-1.5 py-1 text-xs font-bold text-foreground transition-colors hover:bg-surface-2"
                    >
                      {permissionMode === "auto" ? "Auto" : permissionMode === "acceptEdits" ? "Accept edits" : "Manual"}
                    </button>
                    {modeMenuOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-full left-0 z-20 mb-2 w-72 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-lg"
                      >
                        {(
                          [
                            { id: "manual" as const, label: "Manual", desc: "Always ask before making changes" },
                            { id: "acceptEdits" as const, label: "Accept edits", desc: "Automatically accept all file edits" },
                            { id: "auto" as const, label: "Auto", desc: "ChatGiZa handles permission decisions" },
                          ]
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setPermissionMode(opt.id);
                              setModeMenuOpen(false);
                            }}
                            className="flex w-full items-start justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-2"
                          >
                            <span>
                              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                                {opt.label}
                                {permissionMode === opt.id && <span className="text-blue-500">✓</span>}
                              </span>
                              <span className="text-xs text-muted">{opt.desc}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Was two separate buttons (attach image, upload file)
                      -- now one "+" opening a menu with those two plus
                      Add folder (a real capability, via webkitdirectory)
                      and Connectors (also real -- the same GitHub/Vercel
                      connect flow push_to_github/deploy_to_vercel already
                      trigger reactively, just reachable proactively here
                      too now). No Slash commands / Add plugins entries --
                      neither exists in this agent, and a menu item that
                      does nothing when clicked is worse than not offering
                      it. */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAttachMenuOpen((v) => !v);
                      }}
                      aria-label="Add"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                    >
                      {PlusTabIcon}
                    </button>
                    {attachMenuOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-full left-0 z-20 mb-2 w-56 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-lg"
                      >
                        <button
                          type="button"
                          disabled={attachedImages.length >= MAX_ATTACHED_IMAGES}
                          onClick={() => {
                            imageInputRef.current?.click();
                            setAttachMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-2 disabled:opacity-40"
                        >
                          <span className="text-muted">{AttachImageIcon}</span>
                          Add photos
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            uploadInputRef.current?.click();
                            setAttachMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
                        >
                          <span className="text-muted">{AttachFileIcon}</span>
                          Add files
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            folderInputRef.current?.click();
                            setAttachMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
                        >
                          <span className="text-muted">{AttachFolderIcon}</span>
                          Add folder
                        </button>
                        <div className="my-1 border-t border-border" />
                        <button
                          type="button"
                          onClick={() => {
                            setConnectorsOpen(true);
                            setAttachMenuOpen(false);
                          }}
                          className="flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
                        >
                          <span className="flex items-center gap-2.5">
                            <span className="text-muted">{ConnectorsIcon}</span>
                            Connectors
                          </span>
                          <span className="text-xs text-muted">{githubConnected ? "GitHub ✓" : "GitHub"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={toggleListening}
                    aria-label={isListening ? "Stop voice input" : "Voice input"}
                    title={voiceError ?? undefined}
                    className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-surface-2 hover:text-foreground ${
                      isListening ? "bg-blue-600 text-white hover:bg-blue-600 hover:text-white" : "text-muted"
                    }`}
                  >
                    {MicIcon}
                  </button>
                </div>
                <div className="relative">
                  {/* "GiZa 5.6" and "High" are plain, inert labels now --
                      confirmed the popup opening from either of them read
                      as "clicking does the same one thing everywhere", so
                      only the ring itself (below) is actually clickable/
                      opens the Context window popup; these two do nothing
                      on click, as requested. No "·" separator between
                      them, and a wider gap before the ring specifically
                      (gap-3 on the row, versus gap-1.5 within each label)
                      so the ring reads as its own separate thing. */}
                  <div className="flex items-center gap-3 rounded-full px-2 py-1 text-xs font-medium text-muted">
                    <span>GiZa 5.6</span>
                    <span>High</span>
                    {/* A real ring (SVG circle stroke, hollow center --
                        not a filled Tailwind dot, which a previous version
                        of this used and which the user correctly pointed
                        out reads as "just a dot" even in its "used" state
                        since a filled disc isn't a ring shape at all) --
                        matching the host app's own small usage-ring icon
                        that opens this same kind of Context window/
                        plan-limits popup on click. Muted/gray stroke until
                        this session has actually used any build tokens,
                        then the same ring turns blue. Governed purely by
                        `sessionTokens`, so it reflects real usage on its
                        own. Sized clearly bigger than the plain dot this
                        replaced (14px, not 6px) so the hole in the middle
                        actually reads at a glance. */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setModelInfoOpen((v) => !v);
                      }}
                      aria-label="Usage"
                      className="flex shrink-0 items-center justify-center rounded-full transition-colors hover:text-foreground"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle
                          cx="7"
                          cy="7"
                          r="5.5"
                          strokeWidth="2"
                          className={sessionTokens > 0 ? "stroke-blue-500" : "stroke-muted"}
                        />
                      </svg>
                    </button>
                  </div>
                  {modelInfoOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-full right-0 z-20 mb-2 w-80 rounded-xl border border-border bg-surface p-3 text-xs shadow-lg"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Context window</span>
                        <span className="font-medium text-foreground">{sessionTokens.toLocaleString()} tokens</span>
                      </div>

                      <div className="my-3 border-t border-border" />

                      <p className="text-[11px] font-medium text-muted">Plan usage limits</p>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="font-semibold text-foreground">Messages</span>
                        <span className="text-muted">Unlimited</span>
                      </div>

                      {/* Reads the same fixed-window KV counter
                          /api/build/turn's own rate limiter checks (via a
                          non-consuming peek) -- a real, live number, styled
                          to match the reference app's own limit rows
                          (bold label left, "resets in / percentage" right,
                          progress bar underneath). */}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="font-semibold text-foreground">Build requests</span>
                        <span className="text-muted">
                          {buildUsage
                            ? `Resets in ${buildUsage.resetsInSeconds}s · ${Math.min(100, Math.round((buildUsage.used / buildUsage.limit) * 100))}%`
                            : "…"}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{
                            width: buildUsage
                              ? `${Math.min(100, (buildUsage.used / buildUsage.limit) * 100)}%`
                              : "0%",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
        )}

        {/* Rebuilt from scratch, deliberately minimal this time -- the
            earlier design here (multi-tab strip, address bar, external-site
            browsing, decorative back/forward/minimize/maximize chrome) was
            leftover complexity from Sandpack-era iterations nobody had
            actually redesigned. This is just: a header with the project
            name + reload + close, and the live preview itself. Toggled by
            the globe icon in the chat header above. */}
        {!liveSectionRemoved && panelOpen && (
          // Shares the row with chat (not layered on top of it) -- the
          // border/rounded corners/shadow give it its own frame, growing it
          // via the resize strip along its left edge (startResizingPreview)
          // actually narrows chat to make room, instead of just covering
          // whatever chat is showing underneath. previewWidth is a FLOOR,
          // not a fixed size (flex-shrink-1 below lets it give room back) --
          // but flex-1 lets it keep growing to soak up whatever room is
          // left once chat has already hit its own max-width cap, instead
          // of leaving a dead strip of empty space on a wide screen the
          // way a plain fixed pixel width would.
          // The min() here is the actual fix for it swallowing the
          // composer on a narrower window: previewWidth only ever gets
          // re-clamped against MIN_CHAT_WIDTH at the MOMENT of a drag (see
          // onMouseMove above) -- it was never re-checked afterward, so a
          // wide previewWidth set on a big window stayed exactly that wide
          // even once the window (or the whole app's split-pane layout)
          // shrank well past what chat needs, squeezing the composer down
          // with it. `min(Npx, calc(100% - MIN_CHAT_WIDTHpx))` is a plain
          // CSS constraint that's re-evaluated on every layout pass, so it
          // tracks the row's real current width continuously instead of
          // only at drag time -- flex-shrink can now actually be nonzero
          // too, since this already guarantees the floor CSS itself.
          <div
            data-live-panel
            style={{ flex: `1 1 min(${previewWidth}px, calc(100% - ${MIN_CHAT_WIDTH}px))` }}
            className="flex min-h-0 flex-col p-3 pl-0"
          >
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
              <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                <span className="flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold text-foreground">
                  <span className="text-muted">{GlobeIcon}</span>
                  <span className="truncate">{projectName}</span>
                </span>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    onClick={() => setPreviewReloadKey((k) => k + 1)}
                    aria-label="Reload"
                    className="flex h-6 w-6 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                  >
                    {ReloadIcon}
                  </button>
                  <button
                    onClick={() => setPanelOpen(false)}
                    aria-label="Close live preview"
                    className="flex h-6 w-6 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground [&>svg]:h-4 [&>svg]:w-4"
                  >
                    {CloseIcon}
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <BuildPreviewFrame key={previewReloadKey} files={files} />
              </div>
              {/* Full-height resize strip along the LEFT edge -- grab it
                  anywhere along its height, not just one corner. Dragging
                  it further left grows the window out over the chat
                  behind it; the window's right/top stay fixed throughout.
                  The clickable zone (-left-4, w-8 = 32px, centered on the
                  border) is much wider than the visible line (w-1 = 4px,
                  centered inside it) -- confirmed by direct testing that
                  the previous 16px zone (weighted mostly onto the chat
                  side, only 6px into the panel) was easy to miss by a
                  couple of pixels and get nothing at all in response, which
                  reads as the drag being "stuck" rather than a near-miss.
                  A hover highlight on the inner bar confirms you're
                  actually over it before you click. */}
              <div
                onMouseDown={startResizingPreview}
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize Live window"
                className="group absolute inset-y-0 -left-4 z-10 flex w-8 cursor-col-resize items-stretch justify-center"
              >
                <div className="w-1 rounded-full bg-transparent transition-colors group-hover:bg-blue-500/60" />
              </div>
              {/* Transparent, covers the whole window (including the
                  preview iframe below) only while actively resizing -- an
                  iframe has its own separate event context, so a
                  mouseup/mousemove that lands directly on it never reaches
                  this page's own listeners above, which is what let a
                  resize "stick" past release and keep growing/shrinking
                  the window with no button held. This intercepts every
                  mouse event first so none of them can fall through into
                  the iframe until the resize actually ends. */}
              {deadPreviewDragActive && (
                <div
                  className="absolute inset-0 z-20"
                  style={{ cursor: "col-resize" }}
                />
              )}
            </div>
          </div>
        )}
        {/* The "Progress" panel -- real steps straight from this chat's
            own history (each non-step assistant reply so far), not a
            fabricated lesson tracker. Meant for the Learn-to-code side of
            Build, but not gated to it -- any chat's own real progress
            shows here the same way. */}
        {progressPanelOpen && (
          <div
            className="relative flex shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface m-3 ml-0 shadow-sm"
            style={{ width: progressWidth }}
          >
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                progressResizing.current = true;
                setIsDragActive(true);
              }}
              // Widened from the original w-2 (8px), same reasoning as
              // Live's own handle -- a thin 8px strip was easy to miss by a
              // couple of pixels and get nothing in response.
              className="absolute -left-2 top-0 z-10 h-full w-4 cursor-col-resize"
            />
            <div className="flex shrink-0 items-center justify-between border-b border-border p-2">
              <span className="px-1 text-sm font-semibold text-foreground">Progress</span>
              <button
                onClick={() => setProgressPanelOpen(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                {CloseIcon}
              </button>
            </div>
            <div className="sidebar-scroll flex-1 overflow-y-auto p-3">
              {(() => {
                const steps = messages.filter((m) => m.role === "assistant" && !m.step && !m.reverted);
                if (steps.length === 0) {
                  return <p className="text-sm text-muted">No steps yet -- they'll show up here as the chat goes.</p>;
                }
                return (
                  <ol className="space-y-1">
                    {steps.map((m, i) => {
                      const firstLine = m.content.split("\n").find((line) => line.trim().length > 0) ?? m.content;
                      const isExpanded = expandedProgressSteps.has(i);
                      return (
                        <li key={i}>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedProgressSteps((prev) => {
                                const next = new Set(prev);
                                if (next.has(i)) next.delete(i);
                                else next.add(i);
                                return next;
                              })
                            }
                            // Text leads, step number and chevron trail at
                            // the end -- matches the reference row order
                            // ("Used 16 tools ›"), not a leading number
                            // badge in front of the text.
                            className="flex w-full items-start gap-1.5 rounded-lg px-1 py-1.5 text-left text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                          >
                            <p className={`min-w-0 flex-1 ${isExpanded ? "whitespace-pre-wrap" : "truncate"}`}>
                              {isExpanded ? m.content : firstLine}
                            </p>
                            <span className="shrink-0 text-xs">{i + 1}</span>
                            <span className={`shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}>{ChevronRightIcon}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                );
              })()}
            </div>
          </div>
        )}
        {/* Same side-panel treatment as Terminal/Browse -- BuildFileTree
            already existed (a real file list + editable content view) but
            had never been wired to anything until now. Fully independent
            of every other panel, Live included: its own fixed width, own
            handle, own header, own close, no cascading or shared state
            with anything else. Two earlier approaches tried to
            AUTOMATICALLY link Files and Live to guarantee zero gap between
            them (flex-grow on Live, then making Files fill whatever Live
            didn't use, then hiding chat/History while Live was open so
            they'd share the row alone) -- all rejected: per feedback, that
            whole idea of squeezing two panels into one special shared
            "slot" was itself the recurring bug, not any one specific
            implementation of it. Every panel, including Live now, sits in
            the same ordinary row as chat -- chat's own flex-1 is what has
            reliably kept Progress/Terminal/Browse gap-free this whole
            time, and Live gets that same protection for free by no longer
            being a special case. */}
        {filesPanelOpen && (
          <div
            className="relative flex min-w-0 shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface m-3 ml-0 shadow-sm"
            style={{ width: filesWidth }}
          >
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                filesResizing.current = true;
                setIsDragActive(true);
              }}
              // Widened from the original w-2 (8px), same reasoning as
              // Live's own handle -- a thin 8px strip was easy to miss by a
              // couple of pixels and get nothing in response.
              className="absolute -left-2 top-0 z-10 h-full w-4 cursor-col-resize"
            />
            {/* No outer "Files" title bar -- per feedback, it was pure
                redundant chrome: BuildFileTree's own root row already
                names the actual project right underneath where that label
                used to sit. Still closable via the Files icon in the
                toolbar (it toggles open/closed either way), so nothing is
                lost by dropping the duplicate label + its own close
                button. */}
            <BuildFileTree
              files={files}
              onChange={handleFileEdit}
              onDelete={deleteFile}
              onCreate={handleFileCreate}
              projectName={projectName}
            />
          </div>
        )}
        {/* Same side-panel treatment as Browse below (flex sibling of the
            chat column, not an overlay) -- per feedback, Terminal should
            open "normally, like the globe icon" rather than as a small
            bottom drawer. Independent of browsePanelOpen -- both can be
            open together, each taking its own share of the row. */}
        {terminalPanelOpen && (
          <div
            className="relative flex shrink-0 flex-col overflow-hidden rounded-2xl border border-border shadow-sm m-3 ml-0"
            style={{ width: terminalWidth }}
          >
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                terminalResizing.current = true;
                setIsDragActive(true);
              }}
              // Widened from the original w-2 (8px), same reasoning as
              // Live's own handle -- a thin 8px strip was easy to miss by a
              // couple of pixels and get nothing in response.
              className="absolute -left-2 top-0 z-10 h-full w-4 cursor-col-resize"
            />
            {/* Permanently dark, same reasoning as the command-confirmation
                dialog's code block -- a real terminal (VS Code's included)
                is never theme-dependent, and switching this one to light
                mode read as fake/decorative rather than a real shell. */}
            <div className="flex shrink-0 items-center justify-between border-b border-[#2b2b2b] bg-[#1e1e1e] p-2">
              <span className="px-1 text-sm font-semibold text-[#cccccc]">Terminal</span>
              <button
                onClick={() => setTerminalPanelOpen(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#cccccc] transition-colors hover:bg-white/10"
              >
                {CloseIcon}
              </button>
            </div>
            <div
              className="sidebar-scroll flex-1 overflow-y-auto bg-[#1e1e1e] p-3 text-[13px] leading-[1.5]"
              style={{ fontFamily: "'Cascadia Code', Consolas, 'Courier New', monospace" }}
            >
              {terminalHistory.length === 0 ? (
                <p className="text-[#6a6a6a]">No commands run yet this session.</p>
              ) : (
                terminalHistory.map((entry, i) => (
                  <div key={i} className="mb-3">
                    <p>
                      <span className="text-[#4ec9b0]">$</span> <span className="text-[#d4d4d4]">{entry.command}</span>
                    </p>
                    <pre className="mt-0.5 whitespace-pre-wrap break-words text-[#a0a0a0]">
                      {entry.output.split("\n").map((line, li) => (
                        <span
                          key={li}
                          className={
                            /exit code:\s*0\b/i.test(line)
                              ? "text-[#89d185]"
                              : /(exit code:\s*[1-9]|command failed|error)/i.test(line)
                                ? "text-[#f48771]"
                                : undefined
                          }
                        >
                          {line}
                          {li < entry.output.split("\n").length - 1 ? "\n" : ""}
                        </span>
                      ))}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        {/* A flex sibling of the chat column above (which is flex-1, not
            w-full, precisely so it yields room here) instead of a fixed
            overlay -- per feedback, opening Browse should push the chat
            column aside, not cover it. */}
        {(() => {
          const showLiveInBrowse =
            Object.keys(files).length > 0 && !browseUrl && !browseSearchResults && !browseSearchLoading;
          return browsePanelOpen && (
          <div
            className="relative flex shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface m-3 ml-0 shadow-sm"
            style={{ width: browseWidth }}
          >
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                browseResizing.current = true;
                setIsDragActive(true);
              }}
              // Widened from the original w-2 (8px), same reasoning as
              // Live's own handle -- a thin 8px strip was easy to miss by a
              // couple of pixels and get nothing in response.
              className="absolute -left-2 top-0 z-10 h-full w-4 cursor-col-resize"
            />
            {/* No header at all while showing Live -- same chromeless,
                full-bleed treatment as the dedicated Live panel next to
                Files (per feedback: just the site, no "Live" label or its
                own close button eating into it). Still closable by hand
                via the globe icon itself in the toolbar, which toggles
                browsePanelOpen regardless of what's currently showing
                inside it -- unlike the dedicated Live panel, Browse always
                keeps that one toolbar entry point. */}
            {!showLiveInBrowse && (
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
            )}
            <div className={showLiveInBrowse ? "h-full" : "sidebar-scroll flex-1 overflow-y-auto"}>
              {showLiveInBrowse ? (
                <BuildPreviewFrame files={files} />
              ) : browseUrl ? (
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
                  <p className="max-w-xs text-sm text-muted">Search the web, or type a URL to see a live snapshot of that page.</p>
                </div>
              )}
            </div>
          </div>
          );
        })()}
      </div>
    </div>
    {/* Catches every mouse event for the rest of an active panel drag, so
        none of them can land inside Live's iframe (a separate browsing
        context that would otherwise silently swallow mousemove/mouseup --
        see isDragActive's own comment above for the full failure mode this
        fixes: jitter, a drag that gets "stuck" partway, and a native
        text-selection/not-allowed cursor showing up instead of the resize
        cursor). Covers the whole viewport, not just the row, since the
        cursor can end up anywhere during a fast drag. */}
    {isDragActive && (
      <div className="fixed inset-0 z-[100]" style={{ cursor: "col-resize" }} />
    )}
    {languageOpen && (
      <LanguagePanel language={language} onSelect={setLanguage} onClose={() => setLanguageOpen(false)} />
    )}
    {connectorsOpen && (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-6" role="dialog" aria-modal="true">
        <div className="w-full max-w-sm rounded-t-2xl border border-border bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-lg sm:rounded-2xl">
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-border sm:hidden" />
          <p className="text-sm font-medium text-foreground">Connectors</p>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">GitHub</p>
              <p className="text-xs text-muted">{githubConnected ? "Connected" : "Not connected"}</p>
            </div>
            {githubConnected ? (
              <span className="rounded-full bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-600">Connected</span>
            ) : (
              <button
                type="button"
                onClick={() => connectGithubNow()}
                className="btn-primary rounded-full px-3 py-1.5 text-xs font-medium"
              >
                Connect
              </button>
            )}
          </div>
          {/* No proactive "Connect" button for Vercel here -- unlike
              GitHub, there's no connectVercelNow exposed from the hook
              yet, only the reactive ensureConnected("vercel") that
              deploy_to_vercel itself already triggers. Stated plainly
              rather than adding a button that would need new hook
              surface to actually do anything. */}
          <div className="mt-2 rounded-xl border border-border p-3">
            <p className="text-sm font-medium text-foreground">Vercel</p>
            <p className="text-xs text-muted">Connects automatically the first time you ask ChatGiZa to deploy.</p>
          </div>
          <button
            type="button"
            onClick={() => setConnectorsOpen(false)}
            className="mt-4 w-full rounded-full px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            Close
          </button>
        </div>
      </div>
    )}
    </>
  );
}
