"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import type { Theme } from "@/lib/theme";
import type { ChatFontSize } from "@/lib/fontSize";
import type { AssistantColor } from "@/lib/assistantColor";

export type Profile = { nickname: string; about: string };

const TABS_GROUP_1 = ["General", "Account", "Privacy", "Billing", "Usage Limits", "Voice", "Personal KYC"] as const;
const TABS_GROUP_2 = ["Skills", "Connectors", "Security", "Plugins", "Memory"] as const;
const EMPTY_TABS = [
  "Billing",
  "Usage Limits",
  "Voice",
  "Personal KYC",
  "Skills",
  "Connectors",
  "Security",
  "Plugins",
] as const;
export type Tab = (typeof TABS_GROUP_1)[number] | (typeof TABS_GROUP_2)[number];

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

const SystemIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="13" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);

const TrashIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      aria-pressed={checked}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-foreground" : "border border-border bg-surface-2"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function SettingsPanel({
  onClose,
  theme,
  onThemeChange,
  fontSize,
  onFontSizeChange,
  assistantColor,
  onAssistantColorChange,
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
  initialTab,
}: {
  onClose: () => void;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
  fontSize: ChatFontSize;
  onFontSizeChange: (s: ChatFontSize) => void;
  assistantColor: AssistantColor;
  onAssistantColorChange: (c: AssistantColor) => void;
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
  initialTab?: Tab;
}) {
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<Tab>(initialTab ?? "General");
  const [nickname, setNickname] = useState(profile.nickname);
  const [about, setAbout] = useState(profile.about);
  const [newFact, setNewFact] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  function saveProfile() {
    onProfileChange({ nickname, about });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-6 sm:p-10" onClick={onClose}>
      <div
        className="card flex max-h-full w-full max-w-3xl overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-48 shrink-0 overflow-y-auto border-r border-border p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold">Settings</h2>
          </div>
          <ul className="space-y-0.5">
            {TABS_GROUP_1.map((t) => (
              <li key={t}>
                <button
                  onClick={() => setTab(t)}
                  className={`w-full rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                    tab === t ? "bg-surface-2 font-medium" : "text-muted hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              </li>
            ))}
          </ul>

          <div className="my-2 border-t border-border" />

          <ul className="space-y-0.5">
            {TABS_GROUP_2.map((t) => (
              <li key={t}>
                <button
                  onClick={() => setTab(t)}
                  className={`w-full rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                    tab === t ? "bg-surface-2 font-medium" : "text-muted hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="max-h-[80vh] flex-1 overflow-y-auto p-5">
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground transition-colors"
          >
            ×
          </button>

          {tab === "General" && (
            <div>
              <h3 className="mb-1 text-sm font-semibold">Appearance</h3>
              <p className="mb-3 text-xs text-muted">Choose how ChatGiZa looks on this device.</p>
              <div className="flex gap-2">
                {(
                  [
                    { value: "light" as Theme, label: "Light", icon: SunIcon },
                    { value: "dark" as Theme, label: "Dark", icon: MoonIcon },
                    { value: "system" as Theme, label: "System", icon: SystemIcon },
                  ]
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onThemeChange(opt.value)}
                    className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs transition-colors ${
                      theme === opt.value
                        ? "border-foreground bg-surface-2"
                        : "border-border hover:bg-surface-2"
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>

              <h3 className="mb-1 mt-6 text-sm font-semibold">Text size</h3>
              <p className="mb-3 text-xs text-muted">Adjust how big chat messages appear.</p>
              <div className="flex gap-2">
                {(
                  [
                    { value: "small" as ChatFontSize, label: "Small" },
                    { value: "medium" as ChatFontSize, label: "Default" },
                    { value: "large" as ChatFontSize, label: "Large" },
                    { value: "xlarge" as ChatFontSize, label: "Extra large" },
                  ]
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onFontSizeChange(opt.value)}
                    className={`flex flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-3 transition-colors ${
                      fontSize === opt.value ? "border-foreground bg-surface-2" : "border-border hover:bg-surface-2"
                    }`}
                  >
                    <span className="font-semibold" style={{ fontSize: opt.value === "small" ? 13 : opt.value === "medium" ? 15 : opt.value === "large" ? 17 : 19 }}>
                      Aa
                    </span>
                    <span className="text-xs">{opt.label}</span>
                  </button>
                ))}
              </div>

              <h3 className="mb-1 mt-6 text-sm font-semibold">Reply text color</h3>
              <p className="mb-3 text-xs text-muted">
                Choose how ChatGiZa's own replies look. "Warm" only changes anything in Dark mode.
              </p>
              <div className="flex gap-2">
                {(
                  [
                    { value: "default" as AssistantColor, label: "Default", swatch: "var(--foreground)" },
                    { value: "warm" as AssistantColor, label: "Warm", swatch: "#dcc7a1" },
                  ]
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onAssistantColorChange(opt.value)}
                    className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-colors ${
                      assistantColor === opt.value
                        ? "border-foreground bg-surface-2"
                        : "border-border hover:bg-surface-2"
                    }`}
                  >
                    <span
                      className="h-5 w-5 rounded-full border border-border"
                      style={{ background: opt.swatch }}
                    />
                    <span className="text-xs">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "Account" && (
            <div>
              <h3 className="mb-1 text-sm font-semibold">Account</h3>
              {status === "loading" ? (
                <p className="text-xs text-muted">Loading…</p>
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

              <h3 className="mb-1 text-sm font-semibold">Custom instructions</h3>
              <p className="mb-3 text-xs text-muted">
                ChatGiZa will take this into account in every conversation.
              </p>
              <label className="mb-1 block text-xs text-muted">What should ChatGiZa call you?</label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onBlur={saveProfile}
                placeholder="Nickname"
                className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
              />
              <label className="mb-1 block text-xs text-muted">
                What do you do, and anything else ChatGiZa should know?
              </label>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                onBlur={saveProfile}
                rows={4}
                placeholder="e.g. I run a bakery called Sunrise Bread and prefer short, direct answers."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
              />
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

          {tab === "Privacy" && (
            <div>
              <div className="mb-4 flex items-center justify-between rounded-xl border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Save chat history</p>
                  <p className="text-xs text-muted">
                    When off, new conversations won&apos;t be kept after you close the tab.
                  </p>
                </div>
                <Toggle checked={historyEnabled} onChange={onToggleHistoryEnabled} />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Clear all conversations</p>
                  <p className="text-xs text-muted">This can&apos;t be undone.</p>
                </div>
                {confirmClear ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmClear(false)}
                      className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-2 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onClearHistory();
                        setConfirmClear(false);
                      }}
                      className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                    >
                      Confirm
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClear(true)}
                    className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-2 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          )}

          {EMPTY_TABS.includes(tab as (typeof EMPTY_TABS)[number]) && (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
              <h3 className="mb-1 text-sm font-semibold">{tab}</h3>
              <p className="text-xs text-muted">This section isn&apos;t built yet — coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
