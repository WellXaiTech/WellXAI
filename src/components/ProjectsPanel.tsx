"use client";

import { useState } from "react";

export type Project = { id: string; name: string; createdAt?: number };
type ConversationSummary = { id: string; title: string; projectId?: string };

const FolderIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </svg>
);

const BackIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const SearchIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);

const ChevronDownIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const TrashIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);

const EmptyProjectsIcon = (
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
    <rect x="4" y="4" width="20" height="20" rx="2" />
    <rect x="28" y="4" width="20" height="20" rx="2" />
    <rect x="4" y="28" width="20" height="20" rx="2" />
    <rect x="30" y="30" width="14" height="14" rx="2" fill="currentColor" stroke="none" />
    <path
      d="M38 27L38 45L42 41L45 48L48.5 46.5L45.5 39.5L50 38Z"
      fill="currentColor"
      stroke="currentColor"
      strokeLinejoin="round"
    />
  </svg>
);

type SortMode = "updated" | "name";

export default function ProjectsPanel({
  projects,
  conversations,
  onClose,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onAssign,
  onSelectConversation,
}: {
  projects: Project[];
  conversations: ConversationSummary[];
  onClose: () => void;
  onCreateProject: (id: string, name: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
  onAssign: (conversationId: string, projectId: string | null) => void;
  onSelectConversation: (id: string) => void;
}) {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("updated");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");

  const activeConversations = conversations.filter((c) => c.projectId === activeProjectId);
  const unassigned = conversations.filter((c) => !c.projectId);
  const activeProject = projects.find((p) => p.id === activeProjectId);

  const filteredProjects = projects
    .filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) =>
      sortMode === "name" ? a.name.localeCompare(b.name) : (b.createdAt ?? 0) - (a.createdAt ?? 0)
    );

  function handleNewProject() {
    const id = crypto.randomUUID();
    onCreateProject(id, "New project");
    setActiveProjectId(id);
    setTitleValue("New project");
    setEditingTitle(true);
  }

  function commitTitle() {
    setEditingTitle(false);
    if (activeProjectId && titleValue.trim()) {
      onRenameProject(activeProjectId, titleValue.trim());
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-6 py-4 sm:px-10">
        <div className="flex items-center gap-3">
          <button
            onClick={activeProjectId ? () => setActiveProjectId(null) : onClose}
            aria-label={activeProjectId ? "Back to projects" : "Close projects"}
            className="rounded-full p-2 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            {BackIcon}
          </button>
          {activeProject && editingTitle ? (
            <input
              autoFocus
              onFocus={(e) => e.target.select()}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle();
                if (e.key === "Escape") setEditingTitle(false);
              }}
              className="rounded-lg border border-border bg-surface px-2 py-0.5 font-serif text-2xl outline-none focus:border-foreground/40"
            />
          ) : (
            <h1
              onClick={
                activeProject
                  ? () => {
                      setTitleValue(activeProject.name);
                      setEditingTitle(true);
                    }
                  : undefined
              }
              className={`font-serif text-2xl ${activeProject ? "cursor-text rounded-lg px-1 hover:bg-surface-2" : ""}`}
            >
              {activeProject ? activeProject.name : "Projects"}
            </h1>
          )}
        </div>

        {!activeProjectId && (
          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              {searchOpen && (
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onBlur={() => !query && setSearchOpen(false)}
                  placeholder="Search projects"
                  className="mr-1 w-40 rounded-full border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-foreground/40"
                />
              )}
              <button
                onClick={() => setSearchOpen((v) => !v)}
                aria-label="Search projects"
                className="rounded-full bg-surface-2 p-2 text-foreground transition-colors hover:bg-surface"
              >
                {SearchIcon}
              </button>
            </div>

            <div className="relative">
              <button
                onClick={() => setSortMenuOpen((v) => !v)}
                className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface"
              >
                Sort by <span className="font-semibold text-foreground">{sortMode === "name" ? "Name" : "Last updated"}</span>
                {ChevronDownIcon}
              </button>
              {sortMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-xl border border-border bg-surface p-1 shadow-lg">
                  {(["updated", "name"] as SortMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setSortMode(mode);
                        setSortMenuOpen(false);
                      }}
                      className={`flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-surface-2 ${
                        sortMode === mode ? "font-semibold text-foreground" : "text-muted"
                      }`}
                    >
                      {mode === "name" ? "Name" : "Last updated"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleNewProject}
              className="btn-primary rounded-full px-4 py-1.5 text-sm font-semibold hover:opacity-85 transition-opacity"
            >
              New project
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-10">
        {activeProjectId ? (
          <div className="mx-auto max-w-2xl">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-muted">{activeConversations.length} chat{activeConversations.length === 1 ? "" : "s"} in this project</p>
              <button
                onClick={() => {
                  onDeleteProject(activeProjectId);
                  setActiveProjectId(null);
                }}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                {TrashIcon}
                Delete project
              </button>
            </div>

            {activeConversations.length === 0 && (
              <p className="mb-4 text-sm text-muted">No chats in this project yet — add one below.</p>
            )}
            <ul className="mb-6 space-y-1">
              {activeConversations.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-surface-2">
                  <button onClick={() => onSelectConversation(c.id)} className="flex-1 truncate text-left text-sm">
                    {c.title}
                  </button>
                  <button onClick={() => onAssign(c.id, null)} className="text-xs text-muted hover:text-foreground">
                    Remove
                  </button>
                </li>
              ))}
            </ul>

            {unassigned.length > 0 && (
              <>
                <p className="mb-2 text-xs text-muted">Add an existing chat:</p>
                <ul className="space-y-1">
                  {unassigned.map((c) => (
                    <li key={c.id} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-surface-2">
                      <span className="flex-1 truncate text-sm">{c.title}</span>
                      <button
                        onClick={() => onAssign(c.id, activeProjectId)}
                        className="text-xs text-muted hover:text-foreground"
                      >
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : (
          <>
            {filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <span className="text-foreground">{EmptyProjectsIcon}</span>
                <h2 className="text-base font-semibold">
                  {query ? "No projects match your search" : "Looking to start a project?"}
                </h2>
                {!query && (
                  <p className="max-w-xs text-sm text-muted">
                    Upload materials, set custom instructions, and organize conversations in one space.
                  </p>
                )}
                {!query && (
                  <button
                    onClick={handleNewProject}
                    className="rounded-full bg-surface-2 px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface"
                  >
                    New project
                  </button>
                )}
              </div>
            ) : (
              <div className="mx-auto grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActiveProjectId(p.id)}
                    className="group flex flex-col items-start gap-3 rounded-2xl border border-border p-4 text-left transition-colors hover:bg-surface-2"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-foreground group-hover:bg-surface">
                      {FolderIcon}
                    </span>
                    <span className="w-full truncate text-sm font-semibold">{p.name}</span>
                    <span className="text-xs text-muted">
                      {conversations.filter((c) => c.projectId === p.id).length} chats
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
