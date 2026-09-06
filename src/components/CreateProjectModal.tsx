"use client";

import { useState } from "react";

const CloseIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const FolderIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  </svg>
);

// Opened by the "+" next to "Projects" in the sidebar -- asks for a real
// name (and, visually matching the reference, a goal description) up
// front instead of ProjectsPanel's own "New project" button, which
// creates the project immediately under that literal placeholder name
// and only lets you rename it after the fact.
export default function CreateProjectModal({
  onClose,
  onCreate,
  onOpenComingSoon,
}: {
  onClose: () => void;
  onCreate: (name: string, description: string) => void;
  onOpenComingSoon: (title: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, description.trim());
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-6" onClick={onClose}>
      <div className="card w-full max-w-2xl rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create a project</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            {CloseIcon}
          </button>
        </div>

        <label className="mb-1.5 mt-5 block text-sm font-medium">What are you working on?</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
          placeholder="Name your project"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground/40"
        />

        <label className="mb-1.5 mt-5 block text-sm font-medium">What are you trying to achieve?</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Describe your project, goals, subject, etc..."
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground/40"
        />

        <button
          onClick={() => onOpenComingSoon("Folders")}
          className="mt-4 flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
        >
          {FolderIcon}
          Use a folder
        </button>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full bg-surface-2 px-4 py-2 text-sm font-medium text-foreground transition-opacity hover:opacity-85"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="btn-primary rounded-full px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            Create project
          </button>
        </div>
      </div>
    </div>
  );
}
