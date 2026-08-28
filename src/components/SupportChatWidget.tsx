"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const ChatBubbleIcon = (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2 12a1 1 0 1 0-2 0a12 12 0 0 0 2.72 7.55a1 1 0 0 0 .78.36a1 1 0 0 0 .63-.23a1 1 0 0 0 .14-1.4A10 10 0 0 1 2 12M9.18 1.21A1 1 0 0 0 7.9.61a12.06 12.06 0 0 0-6.19 5.11a1 1 0 0 0 .34 1.37a1 1 0 0 0 .51.15a1 1 0 0 0 .86-.49a10.1 10.1 0 0 1 5.16-4.26a1 1 0 0 0 .6-1.28m14.69 8.93a1 1 0 0 0-1.13-.84a1 1 0 0 0-.85 1.13A10 10 0 0 1 22 11.9a10 10 0 0 1-2.24 6.3a1 1 0 0 0 .15 1.41a1 1 0 0 0 .63.22a1 1 0 0 0 .78-.37A12 12 0 0 0 24 11.9a11.5 11.5 0 0 0-.13-1.76m-3.4-4.26a1 1 0 0 0 .64-.23a1 1 0 0 0 .13-1.41a12.1 12.1 0 0 0-6.9-4.12a1 1 0 0 0-.38 2a10.06 10.06 0 0 1 5.74 3.39a1 1 0 0 0 .77.37m-5.1 15.43a10 10 0 0 1-6.69 0A1 1 0 0 0 8 23.22a12 12 0 0 0 8 0a1 1 0 1 0-.67-1.89ZM12.5 5.4C8.92 5.4 6 7.8 6 10.75a4.78 4.78 0 0 0 1.54 3.47a.25.25 0 0 1 0 .29L6.5 16.67a.5.5 0 0 0 .09.57a.52.52 0 0 0 .41.16a.5.5 0 0 0 .21 0l3.2-1.48a.22.22 0 0 1 .16 0a7.7 7.7 0 0 0 2 .25c3.58 0 6.5-2.4 6.5-5.36S16.08 5.4 12.5 5.4" />
  </svg>
);
const CloseIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SendIcon = (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
    <path d="M19.3 0a.7.7 0 0 1 .7.7v8.278a6.7 6.7 0 0 1-6.699 6.698l-10.996-.001l3.131 3.13a.7.7 0 0 1-.99.99l-4.24-4.241a.7.7 0 0 1 0-.99l4.241-4.241a.7.7 0 1 1 .99.99l-2.965 2.963h10.83A5.3 5.3 0 0 0 18.6 8.978V.7a.7.7 0 0 1 .7-.7" />
  </svg>
);
// Shown on the send button instead while a reply is streaming in -- clicking
// it aborts the in-flight request (lucide's "square" glyph).
const StopIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect width="18" height="18" x="3" y="3" rx="2" />
  </svg>
);
// New conversation -- clears back to the greeting. Same glyph as ChatSidebar's
// "New chat" (PencilIcon) on chatgiza.com, for visual consistency.
const EditIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.943 1.25H13.5a.75.75 0 0 1 0 1.5H12c-2.378 0-4.086.002-5.386.176c-1.279.172-2.05.5-2.62 1.069c-.569.57-.896 1.34-1.068 2.619c-.174 1.3-.176 3.008-.176 5.386s.002 4.086.176 5.386c.172 1.279.5 2.05 1.069 2.62c.57.569 1.34.896 2.619 1.068c1.3.174 3.008.176 5.386.176s4.086-.002 5.386-.176c1.279-.172 2.05-.5 2.62-1.069c.569-.57.896-1.34 1.068-2.619c.174-1.3.176-3.008.176-5.386v-1.5a.75.75 0 0 1 1.5 0v1.557c0 2.309 0 4.118-.19 5.53c-.194 1.444-.6 2.584-1.494 3.479c-.895.895-2.035 1.3-3.48 1.494c-1.411.19-3.22.19-5.529.19h-.114c-2.309 0-4.118 0-5.53-.19c-1.444-.194-2.584-.6-3.479-1.494c-.895-.895-1.3-2.035-1.494-3.48c-.19-1.411-.19-3.22-.19-5.529v-.114c0-2.309 0-4.118.19-5.53c.194-1.444.6-2.584 1.494-3.479c.895-.895 2.035-1.3 3.48-1.494c1.411-.19 3.22-.19 5.529-.19m4.827 1.026a3.503 3.503 0 0 1 4.954 4.953l-6.648 6.649c-.371.37-.604.604-.863.806a5.3 5.3 0 0 1-.987.61c-.297.141-.61.245-1.107.411l-2.905.968a1.492 1.492 0 0 1-1.887-1.887l.968-2.905c.166-.498.27-.81.411-1.107q.252-.526.61-.987c.202-.26.435-.492.806-.863zm3.893 1.06a2.003 2.003 0 0 0-2.832 0l-.376.377q.032.145.098.338c.143.413.415.957.927 1.469a3.9 3.9 0 0 0 1.807 1.025l.376-.376a2.003 2.003 0 0 0 0-2.832m-1.558 4.391a5.4 5.4 0 0 1-1.686-1.146a5.4 5.4 0 0 1-1.146-1.686L11.218 9.95c-.417.417-.58.582-.72.76a4 4 0 0 0-.437.71c-.098.203-.172.423-.359.982l-.431 1.295l1.032 1.033l1.295-.432c.56-.187.779-.261.983-.358q.378-.18.71-.439c.177-.139.342-.302.759-.718z"
    />
  </svg>
);
// Placeholder for now -- there's no conversation history backend yet. Same
// glyph as ChatSidebar's "Automations" (AutomationIcon) on chatgiza.com.
const HistoryIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12a9 9 0 1 1 2.64 6.36" />
    <path d="M3 18v-4h4" />
    <path d="M12 8v4l3 2" />
  </svg>
);
const CopyIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ fill: "currentColor", stroke: "none" }}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="m10.8624 1.99989c.0452.00003.0911.00005.1376.00005h5.2413c.805-.00001 1.4693-.00002 2.0105.0442.5621.04592 1.0788.14449 1.5642.39178.7526.38349 1.3645.99541 1.748 1.74806.2473.48534.3459 1.00204.3918 1.56414.0442.54119.0442 1.20554.0442 2.0105v5.24128c0 .0466 0 .0924.0001.1376.0004.7954.0007 1.3861-.1364 1.8977-.3699 1.3804-1.4481 2.4586-2.8284 2.8284-.3096.083-.648.1156-1.0433.1284-.0127.3952-.0454.7337-.1283 1.0432-.3699 1.3804-1.4481 2.4586-2.8284 2.8284-.5117.1371-1.1023.1368-1.8977.1364-.0452 0-.0911-.0001-.1376-.0001h-5.24132c-.80496.0001-1.46932.0001-2.01051-.0441-.56209-.046-1.0788-.1445-1.56413-.3918-.75265-.3835-1.36457-.9954-1.74807-1.7481-.24729-.4853-.34585-1.002-.39178-1.5641-.04421-.5412-.0442-1.2056-.04419-2.0106v-5.2413c0-.0465-.00002-.0923-.00005-.1375-.00043-.7954-.00075-1.38608.13635-1.89773.36987-1.38037 1.44806-2.45856 2.82842-2.82843.30955-.08294.64801-.11559 1.04323-.12834.01276-.39522.0454-.73369.12835-1.04323.36987-1.38037 1.44806-2.45856 2.82842-2.82843.51165-.1371 1.10228-.13678 1.89768-.13635zm-2.85254 4.00005h4.23144c.805-.00001 1.4693-.00002 2.0105.0442.5621.04592 1.0788.14449 1.5642.39178.7526.38349 1.3645.99541 1.748 1.74806.2473.48534.3459 1.00204.3918 1.56414.0442.54118.0442 1.20558.0442 2.01058v4.2314c.2576-.0092.3988-.0265.5176-.0583.6902-.1849 1.2293-.724 1.4143-1.4142.0595-.2223.0681-.5233.0681-1.5177v-5.19996c0-.85658-.0008-1.43887-.0376-1.88896-.0358-.43841-.1007-.66262-.1804-.81902-.1917-.37632-.4977-.68228-.874-.87403-.1564-.07969-.3806-.14461-.819-.18043-.4501-.03678-1.0324-.03756-1.889-.03756h-5.2c-.9944 0-1.29536.00859-1.51764.06815-.69018.18494-1.22928.72403-1.41421 1.41422-.03183.11879-.0491.26006-.05829.51763zm-1.00986 2c-.99435 0-1.29536.00859-1.51764.06815-.69018.18494-1.22928.72403-1.41421 1.41422-.05956.22227-.06815.52329-.06815 1.51759v5.2c0 .8566.00078 1.4389.03755 1.889.03582.4384.10075.6626.18044.819.19174.3763.4977.6823.87403.8741.1564.0796.3806.1446.81902.1804.45009.0368 1.03238.0375 1.88896.0375h5.2c.9944 0 1.2954-.0085 1.5176-.0681.6902-.1849 1.2293-.724 1.4143-1.4142.0595-.2223.0681-.5233.0681-1.5177v-5.2c0-.8565-.0008-1.4388-.0376-1.88892-.0358-.43841-.1007-.66262-.1804-.81902-.1917-.37632-.4977-.68228-.874-.87403-.1564-.07969-.3806-.14461-.819-.18043-.4501-.03678-1.0324-.03756-1.889-.03756z"
    />
  </svg>
);

const GREETING: Message = {
  role: "assistant",
  content: "Hi — I'm AI-assisted support for WellXAI. What can I help you with today (ChatGiZa, billing, login, or the API)?",
};

export default function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  function copyMessage(index: number, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((v) => (v === index ? null : v)), 1500);
    });
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setError(null);
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setSending(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: next.slice(-10) }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // User hit stop -- not a real error, nothing to show.
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open support chat"
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center text-foreground transition-opacity hover:opacity-80"
      >
        {ChatBubbleIcon}
      </button>
    );
  }

  return (
    <div className="fixed bottom-2 right-4 z-50">
      <div className="flex h-[600px] w-[420px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-end gap-3 px-4 py-3 text-muted">
          <button
            onClick={() => setMessages([GREETING])}
            aria-label="New conversation"
            className="hover:text-foreground"
          >
            {EditIcon}
          </button>
          <button aria-label="History" className="hover:text-foreground">
            {HistoryIcon}
          </button>
          <button onClick={() => setOpen(false)} aria-label="Close" className="hover:text-foreground">
            {CloseIcon}
          </button>
        </div>

        <div ref={listRef} className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                <p
                  className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm ${
                    m.role === "user" ? "btn-primary" : "bg-surface-2 text-foreground"
                  }`}
                >
                  {m.content}
                </p>
                {m.role === "assistant" && (
                  <button
                    onClick={() => copyMessage(i, m.content)}
                    aria-label="Copy"
                    className="mt-1 flex items-center gap-1 px-1 text-xs text-muted hover:text-foreground"
                  >
                    {CopyIcon}
                    {copiedIndex === i ? "Copied" : ""}
                  </button>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <p className="rounded-lg bg-surface-2 px-3.5 py-2.5 text-sm text-muted">Thinking…</p>
              </div>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
                placeholder="Ask a support question..."
                disabled={sending}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
              />
              <button
                onClick={sending ? stop : send}
                disabled={!sending && !input.trim()}
                aria-label={sending ? "Stop" : "Send"}
                className="btn-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full disabled:opacity-40"
              >
                {sending ? StopIcon : SendIcon}
              </button>
            </div>
            <p className="mt-4 text-center text-[11px] leading-4 text-muted">
              AI support can make mistakes. For anything urgent, email hello@chatgiza.com.
            </p>
          </div>
        </div>
      </div>
  );
}


