"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const ChatBubbleIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CloseIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SendIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
// New conversation -- clears back to the greeting.
const EditIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
// Placeholder for now -- there's no conversation history backend yet.
const HistoryIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12a9 9 0 1 0 3-6.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 5v5h5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 8v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
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
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setError(null);
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setSending(true);
    try {
      const res = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: next.slice(-10) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open support chat"
        className="btn-primary fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-opacity hover:opacity-90"
      >
        {ChatBubbleIcon}
      </button>
    );
  }

  return (
    <div className="fixed bottom-2 right-4 z-50">
      <div className="flex h-[600px] w-[420px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-end gap-3 border-b border-border px-4 py-3 text-muted">
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
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <p
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.role === "user" ? "btn-primary" : "bg-surface-2 text-foreground"
                  }`}
                >
                  {m.content}
                </p>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <p className="rounded-2xl bg-surface-2 px-3.5 py-2.5 text-sm text-muted">Thinking…</p>
              </div>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2 rounded-full border border-border px-3 py-2">
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
                onClick={send}
                disabled={sending || !input.trim()}
                aria-label="Send"
                className="btn-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full disabled:opacity-40"
              >
                {SendIcon}
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


