import { NextRequest, NextResponse } from "next/server";
import { completeSso, mintSsoLoginToken } from "@/lib/sso";
import { joinWorkspaceViaSso } from "@/lib/workspace";
import { logSecurityEvent } from "@/lib/securityLog";

function baseUrl(): string {
  return process.env.NEXTAUTH_URL || "https://www.chatgiza.com";
}

// The identity provider redirects the browser here after the user
// authenticates on their end. We verify everything server-side, then hand
// the browser a short-lived token to complete the actual sign-in at
// /login/sso (which calls NextAuth's signIn("sso", ...)) -- this route
// itself never touches session state directly.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl()}/login?ssoError=${encodeURIComponent("Missing SSO response")}`);
  }

  try {
    const identity = await completeSso(code, state);

    await joinWorkspaceViaSso(identity.workspaceId, { userId: identity.sub, email: identity.email, name: identity.name }).catch(
      (err) => console.error("joinWorkspaceViaSso failed:", err)
    );
    await logSecurityEvent(identity.sub, "sso_login", { workspaceId: identity.workspaceId, detail: identity.email });

    const token = await mintSsoLoginToken(identity);
    return NextResponse.redirect(`${baseUrl()}/login/sso?token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error("SSO callback error:", err);
    const message = err instanceof Error ? err.message : "SSO sign-in failed";
    return NextResponse.redirect(`${baseUrl()}/login?ssoError=${encodeURIComponent(message)}`);
  }
}
