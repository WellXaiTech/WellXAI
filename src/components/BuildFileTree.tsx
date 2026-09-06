"use client";

import { useState } from "react";

export default function BuildFileTree({
  files,
  onChange,
  onDelete,
}: {
  files: Record<string, string>;
  onChange: (path: string, content: string) => void;
  onDelete: (path: string) => void;
}) {
  const paths = Object.keys(files).sort();
  const [selected, setSelected] = useState<string | null>(paths[0] ?? null);
  const activePath = selected && files[selected] !== undefined ? selected : paths[0] ?? null;

  return (
    <div className="flex h-full flex-col">
      <div className="max-h-32 shrink-0 overflow-y-auto border-b border-border">
        {paths.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted">No files yet.</p>
        ) : (
          paths.map((path) => (
            <div
              key={path}
              className={`group flex items-center gap-1 px-3 py-1.5 text-xs ${
                path === activePath ? "bg-surface-2 font-medium" : "hover:bg-surface-2"
              }`}
            >
              <button onClick={() => setSelected(path)} className="min-w-0 flex-1 truncate text-left">
                {path}
              </button>
              <button
                onClick={() => onDelete(path)}
                aria-label={`Delete ${path}`}
                className="shrink-0 rounded px-1 text-muted opacity-0 hover:text-red-500 group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
      <div className="min-h-0 flex-1">
        {activePath ? (
          <textarea
            key={activePath}
            value={files[activePath]}
            onChange={(e) => onChange(activePath, e.target.value)}
            spellCheck={false}
            className="h-full w-full resize-none bg-background p-3 font-mono text-xs outline-none"
          />
        ) : (
          <p className="p-3 text-xs text-muted">Select a file to view or edit it.</p>
        )}
      </div>
    </div>
  );
}
