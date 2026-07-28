"use client";

import { useState } from "react";

export type ScheduledTask = {
  id: string;
  prompt: string;
  runAt: string;
  fired: boolean;
};

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

export default function ScheduledPanel({
  tasks,
  onClose,
  onCreate,
  onDelete,
}: {
  tasks: ScheduledTask[];
  onClose: () => void;
  onCreate: (prompt: string, runAt: string) => void;
  onDelete: (id: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [when, setWhen] = useState(() => toLocalInputValue(new Date(Date.now() + 10 * 60 * 1000)));

  const sorted = [...tasks].sort((a, b) => a.runAt.localeCompare(b.runAt));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-6 sm:p-10" onClick={onClose}>
      <div
        className="card max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Scheduled</h2>
          <button
            onClick={onClose}
            aria-label="Close scheduled"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground transition-colors"
          >
            ×
          </button>
        </div>
        <p className="mb-4 text-xs text-muted">
          Sends the message automatically at the chosen time, as long as ChatGiZa stays open in a browser tab —
          there's no server-side scheduler yet, so it won't fire if the tab is closed.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!prompt.trim() || !when) return;
            onCreate(prompt.trim(), new Date(when).toISOString());
            setPrompt("");
          }}
          className="mb-5 space-y-2 rounded-xl border border-border p-3"
        >
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What should ChatGiZa send?"
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
          />
          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
            />
            <button
              type="submit"
              disabled={!prompt.trim()}
              className="btn-primary ml-auto rounded-full px-4 py-2 text-xs font-medium disabled:opacity-40"
            >
              Schedule
            </button>
          </div>
        </form>

        {sorted.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No scheduled messages yet.</p>
        ) : (
          <ul className="space-y-2">
            {sorted.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm">{t.prompt}</p>
                  <p className="text-xs text-muted">
                    {new Date(t.runAt).toLocaleString()} · {t.fired ? "Sent" : "Upcoming"}
                  </p>
                </div>
                <button
                  onClick={() => onDelete(t.id)}
                  className="shrink-0 text-xs text-muted hover:text-foreground"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
