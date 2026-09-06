"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import AdminShell from "@/components/AdminShell";
import UserDetailModal from "@/components/UserDetailModal";

type UserPlatform = "web" | "desktop" | "android" | "vscode";
type UserRecord = {
  id: string;
  email: string;
  name: string;
  image: string;
  createdAt: number;
  lastSeenAt: number;
  platforms: UserPlatform[];
};

const PLATFORM_LABEL: Record<UserPlatform, string> = {
  web: "Web",
  desktop: "Desktop",
  android: "Android",
  vscode: "VS Code",
};

// Distinct, low-saturation badge per surface -- enough to tell them apart
// at a glance in a dense table without turning the row into a rainbow.
const PLATFORM_CLASS: Record<UserPlatform, string> = {
  web: "bg-blue-500/10 text-blue-500",
  desktop: "bg-purple-500/10 text-purple-500",
  android: "bg-emerald-500/10 text-emerald-500",
  vscode: "bg-orange-500/10 text-orange-500",
};

const SearchIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const min = 60_000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (diff < min) return "Just now";
  if (diff < hr) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / hr)}h ago`;
  if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`;
  return formatDate(ms);
}

function Avatar({ name, image }: { name: string; image: string }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />;
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-medium">
      {(name || "?")[0].toUpperCase()}
    </div>
  );
}

export default function AdminUsersPage() {
  const { status } = useSession();
  const [state, setState] = useState<"loading" | "forbidden" | "ready">("loading");
  const [userCount, setUserCount] = useState(0);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setState("forbidden");
      return;
    }
    fetch("/api/wx-6f44c8d2a535/stats")
      .then(async (r) => {
        if (!r.ok) throw new Error("forbidden");
        return r.json();
      })
      .then((data) => {
        setUserCount(data.userCount);
        setUsers(data.users);
        setState("ready");
      })
      .catch(() => setState("forbidden"));
  }, [status]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, query]);

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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">ChatGiZa</h1>
          <span className="rounded-full bg-surface-2 px-3 py-1 text-sm font-medium text-foreground">
            {userCount.toLocaleString()} Users
          </span>
        </div>
        <div className="relative w-full max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">{SearchIcon}</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email"
            className="w-full rounded-full border border-border bg-surface py-2 pl-9 pr-4 text-sm outline-none focus:border-foreground/40"
          />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Platforms</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSelectedUserId(u.id)}
                  className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-surface-2/60"
                >
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={u.name} image={u.image} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{u.name || "—"}</p>
                        <p className="truncate text-xs text-muted">{u.email || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.platforms.length === 0 ? (
                      <span className="text-xs text-muted">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {u.platforms.map((p) => (
                          <span
                            key={p}
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLATFORM_CLASS[p]}`}
                          >
                            {PLATFORM_LABEL[p]}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(u.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{timeAgo(u.lastSeenAt)}</td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted">
                    {query ? "No users match your search." : "No users recorded yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUserId && <UserDetailModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />}
    </AdminShell>
  );
}
