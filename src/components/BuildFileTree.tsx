"use client";

import { useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import { showMinimap } from "@replit/codemirror-minimap";

// A little breathing room above the first line -- per feedback, the code
// shouldn't start flush against the panel's very top edge. Padded on both
// the content and the line-number gutter equally so they stay aligned;
// padding the outer wrapper instead would leave a gap in the wrong
// background color rather than the editor's own.
const editorChrome = EditorView.theme({
  "&": { fontSize: "15px" },
  ".cm-content": { paddingTop: "10px" },
  ".cm-gutters": { paddingTop: "10px" },
});

// The colored overview strip along the editor's right edge, same as real
// VS Code's own minimap -- per feedback, wanted specifically (circled in
// the reference screenshot). `.compute(["doc"], ...)` re-derives only when
// the document itself changes, not on every cursor move.
const minimap = showMinimap.compute(["doc"], () => ({
  create: () => ({ dom: document.createElement("div") }),
  displayText: "characters",
  showOverlay: "always",
}));

type TreeNode =
  | { type: "file"; name: string; path: string }
  | { type: "folder"; name: string; path: string; children: TreeNode[] };

// Turns the flat `files` map ("src/App.js", "src/styles.css", "index.html")
// into a real nested tree grouped by directory -- per feedback, folders
// should read like a normal code editor's explorer (nested, collapsible,
// with a named root), not a flat list of full paths standing in for
// structure. An empty folder created via the toolbar has no real content of
// its own, so it's represented the same way a real dev project would --
// a hidden ".gitkeep" file inside it (see submitNew below) -- rather than
// faked as UI-only state that vanishes on reload.
function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const path of paths) {
    const parts = path.split("/").filter(Boolean);
    let level = root;
    let currentPath = "";
    parts.forEach((part, i) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (i === parts.length - 1) {
        level.push({ type: "file", name: part, path: currentPath });
        return;
      }
      let folder = level.find((n) => n.type === "folder" && n.name === part) as
        | Extract<TreeNode, { type: "folder" }>
        | undefined;
      if (!folder) {
        folder = { type: "folder", name: part, path: currentPath, children: [] };
        level.push(folder);
      }
      level = folder.children;
    });
  }
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => (a.type !== b.type ? (a.type === "folder" ? -1 : 1) : a.name.localeCompare(b.name)));
    nodes.forEach((n) => n.type === "folder" && sortNodes(n.children));
  };
  sortNodes(root);
  return root;
}

function extOf(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot + 1).toLowerCase();
}

// Picks the real CodeMirror language for a file by its extension -- per
// feedback, the editor should actually syntax-highlight like a real code
// editor, not show plain monochrome text in a bare textarea. Falls back to
// no language extension (plain text, still editable) for anything unknown
// rather than guessing wrong.
function languageFor(path: string): Extension[] {
  switch (extOf(path)) {
    case "html":
    case "htm":
      return [html()];
    case "css":
      return [css()];
    case "js":
    case "jsx":
    case "mjs":
      return [javascript({ jsx: true })];
    case "ts":
    case "tsx":
      return [javascript({ jsx: true, typescript: true })];
    case "json":
      return [json()];
    default:
      return [];
  }
}

// One color per file type, the way VS Code's own file icons read at a
// glance -- per feedback, the explorer should look "nice" like VS Code's,
// not every file sharing one plain gray icon regardless of what it is.
function iconColorFor(path: string): string {
  switch (extOf(path)) {
    case "html":
    case "htm":
      return "text-orange-500";
    case "css":
      return "text-sky-500";
    case "js":
    case "jsx":
    case "mjs":
      return "text-yellow-400";
    case "ts":
    case "tsx":
      return "text-blue-500";
    case "json":
      return "text-amber-600";
    case "md":
      return "text-slate-400";
    default:
      return "text-muted";
  }
}

// Reuses the same folder/file glyphs as ChatComposer/ProjectsPanel's attach
// menu elsewhere in the app -- one icon per concept, not a fresh one drawn
// here for the same thing.
const FolderIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </svg>
);
const FileIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6" />
  </svg>
);
const ChevronIcon = (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 6 6 6-6 6" />
  </svg>
);
const NewFileIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6" />
    <path d="M12 12v6M9 15h6" />
  </svg>
);
const NewFolderIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    <path d="M12 11v4M10 13h4" />
  </svg>
);

export default function BuildFileTree({
  files,
  onChange,
  onDelete,
  onCreate,
  projectName,
}: {
  files: Record<string, string>;
  onChange: (path: string, content: string) => void;
  onDelete: (path: string) => void;
  onCreate: (path: string) => void;
  projectName: string;
}) {
  const paths = Object.keys(files).sort();
  const tree = buildTree(paths);
  const [selected, setSelected] = useState<string | null>(paths[0] ?? null);
  const activePath = selected && files[selected] !== undefined ? selected : paths[0] ?? null;
  // Real open-file tabs, like VS Code's own -- per feedback, opening a file
  // from the sidebar should add a tab for it up top (with its own colored
  // icon and a close X), not just silently swap the single editor view.
  // Closing a tab (openFile below) only removes it from this list -- it
  // never touches the underlying file, which still exists and can be
  // reopened from the sidebar at any time.
  const [openTabs, setOpenTabs] = useState<string[]>(() => (paths[0] ? [paths[0]] : []));

  function openFile(path: string) {
    setSelected(path);
    setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
  }

  function closeTab(path: string) {
    setOpenTabs((prev) => {
      const next = prev.filter((p) => p !== path);
      if (activePath === path) {
        // Falls back to whichever tab was next to it, matching the usual
        // editor convention of not jumping to a far-away tab on close.
        const closedIndex = prev.indexOf(path);
        setSelected(next[closedIndex] ?? next[closedIndex - 1] ?? null);
      }
      return next;
    });
  }
  // Keeps a tab under whatever's actually showing even when nothing was
  // ever explicitly clicked -- e.g. the very first file the AI writes into
  // an empty project, which activePath already falls back to on its own,
  // but openTabs otherwise has no way to find out about.
  useEffect(() => {
    if (activePath && !openTabs.includes(activePath)) {
      setOpenTabs((prev) => [...prev, activePath]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePath]);
  // Empty set = every folder starts expanded, same as a fresh VS Code
  // explorer on a small project -- collapsing is something the user opts
  // into per folder, not a default state to opt out of.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [rootCollapsed, setRootCollapsed] = useState(false);
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  const [newName, setNewName] = useState("");

  function toggleFolder(path: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function submitNew() {
    const trimmed = newName.trim().replace(/^\/+|\/+$/g, "");
    const kind = creating;
    setCreating(null);
    setNewName("");
    if (!trimmed || !kind) return;
    if (kind === "file") {
      // A name containing "/" (e.g. "components/Header.js") lands inside
      // that folder automatically -- buildTree groups by directory, so
      // nothing extra is needed here to create the folder itself.
      if (!(trimmed in files)) onCreate(trimmed);
      openFile(trimmed);
      return;
    }
    // A folder is only real here if it holds a real file -- an empty
    // ".gitkeep" (hidden from the tree below, see renderNodes) is what
    // keeps it present in the actual project files rather than as
    // throwaway UI state that disappears on reload.
    const alreadyExists = paths.some((p) => p === trimmed || p.startsWith(`${trimmed}/`));
    if (!alreadyExists) onCreate(`${trimmed}/.gitkeep`);
  }

  function renderNodes(nodes: TreeNode[], depth: number) {
    return nodes.map((node) => {
      const indent = 10 + depth * 14;
      if (node.type === "folder") {
        const isCollapsed = collapsed.has(node.path);
        return (
          <div key={node.path}>
            <button
              onClick={() => toggleFolder(node.path)}
              style={{ paddingLeft: indent }}
              className="flex w-full items-center gap-1.5 py-1.5 pr-3 text-left text-xs text-muted hover:bg-surface-2 hover:text-foreground"
            >
              <span className={`shrink-0 transition-transform duration-150 ${isCollapsed ? "" : "rotate-90"}`}>
                {ChevronIcon}
              </span>
              <span className="shrink-0 text-sky-400/80">{FolderIcon}</span>
              <span className="min-w-0 flex-1 truncate">{node.name}</span>
            </button>
            {!isCollapsed && renderNodes(node.children, depth + 1)}
          </div>
        );
      }
      // The placeholder that keeps an otherwise-empty folder real (see
      // submitNew) -- a plumbing detail, not a file the user asked for, so
      // it stays out of the visible tree entirely while the folder itself
      // still renders normally above.
      if (node.name === ".gitkeep") return null;
      return (
        <div
          key={node.path}
          style={{ paddingLeft: indent + 15 }}
          className={`group flex items-center gap-1.5 py-1.5 pr-3 text-xs ${
            node.path === activePath ? "bg-surface-2 font-medium" : "hover:bg-surface-2"
          }`}
        >
          <span className={`shrink-0 ${iconColorFor(node.path)}`}>{FileIcon}</span>
          <button onClick={() => openFile(node.path)} className="min-w-0 flex-1 truncate text-left">
            {node.name}
          </button>
          <button
            onClick={() => {
              onDelete(node.path);
              closeTab(node.path);
            }}
            aria-label={`Delete ${node.path}`}
            className="shrink-0 rounded px-1 text-muted opacity-0 hover:text-red-500 group-hover:opacity-100"
          >
            ×
          </button>
        </div>
      );
    });
  }

  return (
    <div className="flex h-full">
      {/* A real full-height sidebar column, per feedback -- like the app's
          own History rail, not a short box stacked above the code editor.
          The file list used to share vertical space with the textarea
          below it (capped at a squeezed max-h-48), which meant a project
          with more than a handful of files scrolled a tiny window while
          the editor sat mostly empty beneath it. Now it's a fixed-width
          column running the full height of the panel, editor to its right
          -- an ordinary two-pane code-editor layout. */}
      <div className="flex h-full w-56 shrink-0 flex-col border-r border-border">
        {/* Names the actual project, the way VS Code's Explorer names the
            open workspace folder at the top instead of just listing its
            contents anonymously. New File/New Folder live here, not
            buried in a text link, matching where that toolbar sits in a
            real editor. */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-2 py-1.5">
          <button
            onClick={() => setRootCollapsed((v) => !v)}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-xs font-semibold uppercase tracking-wide text-foreground"
          >
            <span className={`shrink-0 transition-transform duration-150 ${rootCollapsed ? "" : "rotate-90"}`}>
              {ChevronIcon}
            </span>
            <span className="shrink-0 text-sky-400/80">{FolderIcon}</span>
            <span className="min-w-0 truncate">{projectName || "Project"}</span>
          </button>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              onClick={() => {
                setCreating("file");
                setNewName("");
              }}
              aria-label="New file"
              className="flex h-6 w-6 items-center justify-center rounded text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              {NewFileIcon}
            </button>
            <button
              onClick={() => {
                setCreating("folder");
                setNewName("");
              }}
              aria-label="New folder"
              className="flex h-6 w-6 items-center justify-center rounded text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              {NewFolderIcon}
            </button>
          </div>
        </div>
        {creating && (
          <div className="flex shrink-0 items-center gap-1.5 border-b border-border py-1.5 pl-6 pr-3">
            <span className="shrink-0 text-muted">{creating === "folder" ? FolderIcon : FileIcon}</span>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitNew();
                if (e.key === "Escape") {
                  setCreating(null);
                  setNewName("");
                }
              }}
              onBlur={submitNew}
              placeholder={creating === "folder" ? "folder-name" : "folder/file-name.ext"}
              className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted"
            />
          </div>
        )}
        {!rootCollapsed && (
          <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto py-1">
            {paths.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted">No files yet.</p>
            ) : (
              renderNodes(tree, 1)
            )}
          </div>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Real open-file tabs, like VS Code's own -- see openTabs/openFile
            above. Each carries the same colored file-type icon as the
            sidebar and its own close X; closing a tab only drops it from
            this strip, it never deletes the file itself (that's the
            sidebar's own delete button, a separate and more destructive
            action). */}
        {openTabs.length > 0 && (
          <div className="sidebar-scroll flex shrink-0 items-stretch overflow-x-auto border-b border-border">
            {openTabs.map((path) => {
              const name = path.split("/").pop() ?? path;
              const isActive = path === activePath;
              return (
                <div
                  key={path}
                  className={`group flex shrink-0 items-center gap-1.5 border-r border-border px-3 py-1.5 text-xs ${
                    isActive ? "bg-surface-2 text-foreground" : "text-muted hover:bg-surface-2/60"
                  }`}
                >
                  <button onClick={() => setSelected(path)} className={`shrink-0 ${iconColorFor(path)}`}>
                    {FileIcon}
                  </button>
                  <button onClick={() => setSelected(path)} className="max-w-[140px] truncate">
                    {name}
                  </button>
                  <button
                    onClick={() => closeTab(path)}
                    aria-label={`Close ${name}`}
                    className="shrink-0 rounded px-0.5 text-muted opacity-0 hover:text-foreground group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-hidden">
          {activePath ? (
            <CodeMirror
              key={activePath}
              value={files[activePath]}
              onChange={(value) => onChange(activePath, value)}
              theme={vscodeDark}
              extensions={[editorChrome, minimap, ...languageFor(activePath)]}
              height="100%"
              style={{ height: "100%" }}
              basicSetup={{ foldGutter: true, highlightActiveLine: true }}
            />
          ) : (
            <p className="p-3 text-xs text-muted">Select a file to view or edit it.</p>
          )}
        </div>
      </div>
    </div>
  );
}
