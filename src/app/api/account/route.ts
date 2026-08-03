import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";

// Best-effort cleanup of everything ChatGiZa itself stores server-side for this
// account (KV only — there is no separate application database). Conversation
// content otherwise lives in the browser's localStorage, which the client
// clears itself right after this call succeeds.
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const userId = session.user.id;

  const keys = [
    `chatgiza:history:${userId}`,
    `chatgiza:history-deleted:${userId}`,
    `chatgiza:plan:${userId}`,
    `chatgiza:sessions:${userId}`,
    `chatgiza:revoked-sessions:${userId}`,
    `chatgiza:welcomed:${userId}`,
    `chatgiza:stripe-customer:${userId}`,
  ];

  try {
    await Promise.all(keys.map((k) => kv.del(k)));
  } catch (err) {
    console.error("Account delete KV cleanup failed:", err);
  }

  // The caller (SettingsPanel > Account > Delete account) signs the browser
  // out client-side right after this resolves — no server-side signOut here,
  // since Auth.js v5's exported `signOut` is a Server Action meant for a form
  // submission's redirect flow, not a plain function to await from a Route
  // Handler returning JSON.
  return NextResponse.json({ ok: true });
}
