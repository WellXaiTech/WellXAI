import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { kv } from "@vercel/kv";
import { headers } from "next/headers";
import { sendMailBestEffort } from "@/lib/mailer";
import { welcomeEmail } from "@/lib/emailTemplates";
import { recordSession, isRevoked } from "@/lib/sessions";

function welcomedKey(sub: string) {
  return `chatgiza:welcomed:${sub}`;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  // Without this, any hiccup during sign-in (expired code, network blip,
  // cancelled consent) falls through to Auth.js's own bare default error
  // page instead of our styled /login screen — that unstyled page is what
  // reads as a generic "server error" to users.
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, profile, user, account }) {
      // `profile.sub` (OAuth) / `user.id` (One Tap) is Google's stable
      // per-account id — same value on every device/browser signed into the
      // same Google account, which is what lets account-synced history (see
      // /api/history) key data by a durable id instead of a per-session one.
      const sub = profile?.sub ?? user?.id;
      if (sub) token.sub = sub as string;

      // `account` is only present on the token created right after an actual
      // sign-in (not on later refreshes of an existing session), so this only
      // runs once per real sign-in — exactly when we want to check/record
      // whether this Google account has ever signed in before, and to mint a
      // fresh device-session id for the Security > Sessions list.
      if (account && sub) {
        const email = profile?.email ?? user?.email;
        const name = typeof profile?.name === "string" ? profile.name : user?.name ?? "";
        token.sessionId = crypto.randomUUID();
        try {
          const key = welcomedKey(sub as string);
          const alreadyWelcomed = await kv.get(key);
          token.isNewAccount = !alreadyWelcomed;
          if (!alreadyWelcomed && email) {
            await kv.set(key, true);
            const { subject, html } = welcomeEmail(name);
            await sendMailBestEffort(email as string, subject, html);
          }
        } catch (err) {
          console.error("New-account/welcome-email check failed:", err);
          token.isNewAccount = false;
        }
        try {
          const ua = (await headers()).get("user-agent");
          await recordSession(sub as string, token.sessionId as string, ua);
        } catch (err) {
          console.error("recordSession failed:", err);
        }
      }

      // Checked on every request that decodes this JWT (not just sign-in), so
      // clicking "Log out" on a device in Security > Sessions takes effect the
      // next time that device's tab talks to the server — no server-side JWT
      // store exists to invalidate directly, so this revocation list is the
      // mechanism instead. Uses `token.sub`/`token.sessionId` (persisted
      // across calls), not the `sub` local above, which is only populated on
      // the initial sign-in invocation.
      if (token.sub && token.sessionId) {
        const revoked = await isRevoked(token.sub as string, token.sessionId as string);
        if (revoked) return null;
      }

      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (typeof token.isNewAccount === "boolean") session.user.isNewAccount = token.isNewAccount;
      if (typeof token.sessionId === "string") session.user.sessionId = token.sessionId;
      return session;
    },
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Google's OIDC discovery doc advertises
      // `authorization_response_iss_parameter_supported: true`, but its actual
      // redirect back to us doesn't include `iss`, which makes Auth.js's
      // strict RFC 9207 check fail with "response parameter iss missing".
      // Using plain OAuth2 with Google's stable, publicly documented
      // endpoints skips discovery entirely and avoids that check.
      type: "oauth",
      authorization: {
        url: "https://accounts.google.com/o/oauth2/v2/auth",
        params: { scope: "openid email profile" },
      },
      token: "https://oauth2.googleapis.com/token",
      userinfo: "https://openidconnect.googleapis.com/v1/userinfo",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any),
    Credentials({
      id: "google-one-tap",
      name: "Google One Tap",
      credentials: {
        credential: { label: "credential", type: "text" },
      },
      async authorize(credentials) {
        const idToken = credentials?.credential;
        if (!idToken || typeof idToken !== "string") return null;

        // Google's tokeninfo endpoint validates the JWT's signature and
        // expiry for us and hands back the decoded payload — no extra JWT
        // library needed. We still must check `aud` ourselves: it's the only
        // thing tokeninfo won't reject on its own, and skipping it would let
        // a One Tap credential minted for a *different* Google app be
        // accepted here.
        const res = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
        );
        if (!res.ok) return null;
        const payload = await res.json();
        if (payload.aud !== process.env.AUTH_GOOGLE_ID) return null;
        if (!payload.sub || !payload.email) return null;

        return {
          id: payload.sub as string,
          name: (payload.name as string) ?? null,
          email: payload.email as string,
          image: (payload.picture as string) ?? null,
        };
      },
    }),
  ],
});
