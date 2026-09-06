"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import AdminShell from "@/components/AdminShell";

const ImageIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);
const VideoIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="5" width="15" height="14" rx="2" />
    <path d="M17 9.5l5-3v11l-5-3" />
  </svg>
);
const GlobeIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" />
  </svg>
);
const ResearchIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 11a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" transform="translate(0 3)" />
    <path d="M14 14l6 6" />
  </svg>
);
const BrainIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 18V5" />
    <path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4" />
    <path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5" />
    <path d="M17.997 5.125a4 4 0 0 1 2.526 5.77" />
    <path d="M18 18a4 4 0 0 0 2-7.464" />
    <path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517" />
    <path d="M6 18a4 4 0 0 1-2-7.464" />
    <path d="M6.003 5.125a4 4 0 0 0-2.526 5.77" />
  </svg>
);
const DocumentIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h8" />
    <path d="M8 17h8" />
  </svg>
);
const DatabaseIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
    <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
  </svg>
);
const CodeBracketIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18l-6-6 6-6" />
    <path d="M15 6l6 6-6 6" />
  </svg>
);
const BriefcaseIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const AgentIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="8" width="16" height="12" rx="2" />
    <path d="M12 8V4" />
    <circle cx="12" cy="3" r="1" />
    <circle cx="9" cy="13" r="1" fill="currentColor" />
    <circle cx="15" cy="13" r="1" fill="currentColor" />
    <path d="M9 17h6" />
  </svg>
);
const TwinIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <circle cx="16" cy="7" r="2.6" strokeDasharray="3 2" />
    <path d="M13.2 19a5.3 5.3 0 0 1 7.3-4.9" strokeDasharray="3 2" />
  </svg>
);

// Mirrors the composer's own "+" menu (ChatComposer.tsx) -- these ARE
// ChatGiZa's agents/tools, not a separate thing to invent for admin. No
// per-agent usage counts exist yet (nothing instruments which tool gets
// picked), so this is a real, accurate catalog view, not a metrics one.
const AGENTS = [
  { title: "Web search", description: "Find real-time news and info", icon: GlobeIcon, accent: "bg-blue-500/10 text-blue-500" },
  { title: "Deep research", description: "Get a detailed, cited report", icon: ResearchIcon, accent: "bg-purple-500/10 text-purple-500" },
  { title: "Deep Think", description: "Rigorous analysis and reasoning for high-stakes decisions", icon: BrainIcon, accent: "bg-indigo-500/10 text-indigo-500" },
  { title: "Create image", description: "Generate a picture or logo", icon: ImageIcon, accent: "bg-pink-500/10 text-pink-500" },
  { title: "Create video", description: "Generate a short video clip", icon: VideoIcon, accent: "bg-rose-500/10 text-rose-500" },
  { title: "Document Writer", description: "Draft a finished report, letter, or proposal", icon: DocumentIcon, accent: "bg-amber-500/10 text-amber-500" },
  { title: "SQL Helper", description: "Write, fix, and explain SQL queries", icon: DatabaseIcon, accent: "bg-cyan-500/10 text-cyan-500" },
  { title: "Python Helper", description: "Write and debug Python code", icon: CodeBracketIcon, accent: "bg-emerald-500/10 text-emerald-500" },
  { title: "Business Assistant", description: "Emails, proposals, and everyday business tasks", icon: BriefcaseIcon, accent: "bg-teal-500/10 text-teal-500" },
  { title: "AI Agent", description: "Researches autonomously, searching multiple times before answering", icon: AgentIcon, accent: "bg-orange-500/10 text-orange-500" },
  { title: "Digital Twin", description: "Answers as you, in your own voice, from your synthesized profile", icon: TwinIcon, accent: "bg-violet-500/10 text-violet-500" },
];

export default function AdminAgentsPage() {
  const { status } = useSession();
  const [state, setState] = useState<"loading" | "forbidden" | "ready">("loading");

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setState("forbidden");
      return;
    }
    fetch("/api/wx-6f44c8d2a535/stats")
      .then((r) => setState(r.ok ? "ready" : "forbidden"))
      .catch(() => setState("forbidden"));
  }, [status]);

  if (state === "loading") {
    return <div className="min-h-screen bg-background" />;
  }

  if (state === "forbidden") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-semibold text-foreground">Admin Dashboard</h1>
          <p className="mt-3 text-muted">
            {status === "authenticated"
              ? "Your account doesn't have access to this page."
              : "Sign in with an admin account to continue."}
          </p>
          {status !== "authenticated" && (
            <button
              onClick={() => signIn("google")}
              className="mt-4 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <AdminShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
          <p className="mt-1 text-sm text-muted">AI tools available in the ChatGiZa composer.</p>
        </div>
        <span className="rounded-full bg-surface-2 px-3 py-1 text-sm font-medium">{AGENTS.length} Agents</span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {AGENTS.map((a) => (
          <div key={a.title} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${a.accent}`}>{a.icon}</span>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold">{a.title}</p>
            <p className="mt-1 text-xs text-muted">{a.description}</p>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
