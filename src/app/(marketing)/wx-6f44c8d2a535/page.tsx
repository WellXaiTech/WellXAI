"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";

type UserRecord = { id: string; email: string; name: string; image: string; createdAt: number; lastSeenAt: number };

function formatDate(ms: number) {
  return new Date(ms).toLocaleString();
}

export default function AdminPage() {
  const { status } = useSession();
  const [state, setState] = useState<"loading" | "forbidden" | "ready">("loading");
  const [userCount, setUserCount] = useState(0);
  const [users, setUsers] = useState<UserRecord[]>([]);

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

  if (state === "loading") {
    return <div className="mx-auto max-w-5xl px-4 py-16 w-full" />;
  }

  if (state === "forbidden") {
    return (
      <div className="mx-auto max-w-md px-4 py-24 w-full text-center">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
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
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 w-full">
      <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
      <p className="mt-3 text-muted">Registered ChatGiZa users and recent activity.</p>

      <div className="mt-8 card rounded-2xl p-6">
        <p className="text-sm text-muted">Total users</p>
        <p className="mt-1 text-3xl font-semibold">{userCount}</p>
      </div>

      <div className="mt-6 card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{u.name || "—"}</td>
                  <td className="px-4 py-3">{u.email || "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(u.lastSeenAt)}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted">
                    No users recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
