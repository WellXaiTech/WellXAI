"use client";

import { useState } from "react";

// Opened by the "+" next to "Instructions" on a project's detail page.
// There's no instructions field on a project yet (just id/name/createdAt/
// pinned) -- Save just closes this for now, the same not-yet-persisted
// state every other project-detail control (Context, Scheduled) is in,
// rather than claiming it saved somewhere it doesn't.
export default function SetInstructionsModal({
  projectName,
  onClose,
}: {
  projectName: string;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-6" onClick={onClose}>
      <div className="card w-full max-w-2xl rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold">Set project instructions</h2>
        <p className="mt-2 text-sm text-muted">
          Provide ChatGiZa with relevant instructions and information for chats within {projectName}.
        </p>

        <textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={10}
          placeholder="Think step by step and show reasoning for complex problems. Use specific examples."
          className="mt-4 w-full resize-none rounded-xl border border-border bg-background p-4 text-sm outline-none focus:border-foreground/40"
        />

        {/* Both start dimmed/inert until there's something typed --
            nothing to cancel or save out of an empty box yet. */}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={!value.trim()}
            className="rounded-full bg-surface-2 px-4 py-2 text-sm font-medium text-foreground transition-opacity hover:opacity-85 disabled:pointer-events-none disabled:opacity-30"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            disabled={!value.trim()}
            className="btn-primary rounded-full px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-85 disabled:pointer-events-none disabled:opacity-30"
          >
            Save instructions
          </button>
        </div>
      </div>
    </div>
  );
}
