"use client";

import { useEffect, useRef, useState } from "react";

type LogLine = { level: "log" | "warn" | "error" | "info"; text: string };

const DEFAULT_CODE = `// Write JavaScript and press Run — it executes in a sandboxed iframe.
for (let i = 1; i <= 5; i++) {
  console.log("count:", i);
}
console.log("done!");`;

export default function CodePanel({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/code/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.code) throw new Error(data.error ?? "Failed to generate code");
      setCode(data.code);
      setLogs([]);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Failed to generate code");
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (!e.data || e.data.source !== "chatgiza-code") return;
      if (e.data.type === "done") {
        setRunning(false);
        return;
      }
      setLogs((prev) => [...prev, { level: e.data.type, text: e.data.args.join(" ") }]);
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  function run() {
    setLogs([]);
    setRunning(true);
    const html = `<!DOCTYPE html><html><body><script>
      const send = (type, args) => parent.postMessage({ source: "chatgiza-code", type, args }, "*");
      ["log","warn","error","info"].forEach((level) => {
        console[level] = (...args) => send(level, args.map((a) => {
          try { return typeof a === "string" ? a : JSON.stringify(a); } catch { return String(a); }
        }));
      });
      window.onerror = (msg) => { send("error", [String(msg)]); };
      try {
        ${code}
      } catch (e) {
        send("error", [e && e.message ? e.message : String(e)]);
      }
      send("done", []);
    <\/script></body></html>`;
    if (iframeRef.current) iframeRef.current.srcdoc = html;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-6 sm:p-10" onClick={onClose}>
      <div
        className="card flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Code</h2>
            <p className="text-xs text-muted">
              Runs real JavaScript in a sandboxed frame — nothing leaves your browser.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close code panel"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={generate} className="mb-3 flex gap-2">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the code you want, e.g. 'sort an array of numbers'"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
          />
          <button
            type="submit"
            disabled={!prompt.trim() || generating}
            className="btn-primary shrink-0 rounded-lg px-4 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            {generating ? "Generating…" : "Generate with ChatGiZa"}
          </button>
        </form>

        {genError && <p className="mb-3 text-xs text-red-500">{genError}</p>}

        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          rows={10}
          className="w-full rounded-xl border border-border bg-background p-3 font-mono text-xs outline-none focus:border-foreground/40"
        />

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={run}
            disabled={running}
            className="btn-primary rounded-full px-4 py-2 text-xs font-medium disabled:opacity-40"
          >
            {running ? "Running…" : "Run"}
          </button>
          <button
            onClick={() => setLogs([])}
            className="rounded-full border border-border px-4 py-2 text-xs hover:bg-surface-2 transition-colors"
          >
            Clear output
          </button>
        </div>

        <div className="mt-3 flex-1 overflow-y-auto rounded-xl border border-border bg-background p-3 font-mono text-xs">
          {logs.length === 0 ? (
            <p className="text-muted">Output will appear here.</p>
          ) : (
            logs.map((line, i) => (
              <div key={i} className={line.level === "error" ? "text-red-500" : "text-foreground"}>
                {line.text}
              </div>
            ))
          )}
        </div>

        <iframe ref={iframeRef} sandbox="allow-scripts" className="hidden" title="code-sandbox" />
      </div>
    </div>
  );
}
