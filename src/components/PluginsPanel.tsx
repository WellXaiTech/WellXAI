"use client";

export type PluginKey =
  | "web_search"
  | "deep_research"
  | "deep_think"
  | "image"
  | "video"
  | "document_writer"
  | "sql_helper"
  | "python_helper"
  | "business_assistant"
  | "ai_agent"
  | "digital_twin";

const PLUGINS: { key: PluginKey; title: string; description: string }[] = [
  { key: "web_search", title: "Web search", description: "Let ChatGiZa look up real-time info to answer you." },
  { key: "deep_research", title: "Deep research", description: "Produce structured, cited research reports." },
  { key: "deep_think", title: "Deep Think", description: "Reason more carefully through hard questions before answering." },
  { key: "image", title: "Create image", description: "Generate images and logos from a text prompt." },
  { key: "video", title: "Create video", description: "Generate short video clips from a text prompt." },
  { key: "document_writer", title: "Document Writer", description: "Draft finished reports, letters, and proposals." },
  { key: "sql_helper", title: "SQL Helper", description: "Write, fix, and explain SQL queries." },
  { key: "python_helper", title: "Python Helper", description: "Write and debug Python code." },
  { key: "business_assistant", title: "Business Assistant", description: "Emails, proposals, and everyday business tasks." },
  { key: "ai_agent", title: "AI Agent", description: "Searches the web autonomously, multiple times, before answering." },
  { key: "digital_twin", title: "Digital Twin", description: "Answers as you, in your own voice, from your synthesized profile." },
];

export default function PluginsPanel({
  enabled,
  onClose,
  onToggle,
}: {
  enabled: Record<PluginKey, boolean>;
  onClose: () => void;
  onToggle: (key: PluginKey) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-6 sm:p-10" onClick={onClose}>
      <div
        className="card max-h-full w-full max-w-xl overflow-y-auto rounded-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Plugins</h2>
          <button
            onClick={onClose}
            aria-label="Close plugins"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground transition-colors"
          >
            ×
          </button>
        </div>
        <p className="mb-4 text-xs text-muted">
          Turn ChatGiZa's built-in tools on or off. Disabling one removes it from the "+" menu and stops it from
          auto-triggering.
        </p>

        <ul className="space-y-2">
          {PLUGINS.map((p) => (
            <li key={p.key} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-medium">{p.title}</p>
                <p className="text-xs text-muted">{p.description}</p>
              </div>
              <button
                onClick={() => onToggle(p.key)}
                aria-label={`Toggle ${p.title}`}
                aria-pressed={enabled[p.key]}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  enabled[p.key] ? "bg-foreground" : "bg-surface-2 border border-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform ${
                    enabled[p.key] ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
