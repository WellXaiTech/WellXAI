import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { mintMobileToken } from "@/lib/mobileAuth";
import { recordSession, clientIpFromHeaders } from "@/lib/sessions";
import { headers } from "next/headers";

// Session-only (web login) -- this page is where a signed-in user gets a
// bearer token to paste into the VS Code extension's "Sign In" prompt.
// Reuses the exact same token mechanism as the native Android app
// (mintMobileToken/getMobileUserId already treat "any non-browser client
// with a bearer token" generically) -- VS Code is just another one of
// those clients, not a new auth system.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const sessionId = crypto.randomUUID();
  try {
    const h = await headers();
    const ip = clientIpFromHeaders(h);
    await recordSession(session.user.id, sessionId, "ChatGiZa for VS Code", ip, "mobile", "VS Code");
  } catch (err) {
    console.error("recordSession (vscode) failed:", err);
  }

  const token = await mintMobileToken({
    sub: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
    picture: session.user.image ?? null,
    sessionId,
  });

  return NextResponse.json({ token });
}
