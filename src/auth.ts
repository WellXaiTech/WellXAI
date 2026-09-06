import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { kv } from "@vercel/kv";
import { headers, cookies } from "next/headers";
import { randomInt } from "crypto";
import { sendMail, sendMailBestEffort } from "@/lib/mailer";
import { welcomeEmail, signInCodeEmail } from "@/lib/emailTemplates";
import { recordSession, isRevoked, clientIpFromHeaders } from "@/lib/sessions";
import { recordUserSeen } from "@/lib/userIndex";
import { verifySsoLoginToken } from "@/lib/sso";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyTotp } from "@/lib/totp";
import { checkRateLimit } from "@/lib/rateLimit";
import { mintDeviceTrustToken, verifyDeviceTrustToken } from "@/lib/deviceTrust";

export const DEVICE_TRUST_COOKIE = "chatgiza-device-trust";

function welcomedKey(sub: string) {
  return `chatgiza:welcomed:${sub}`;
}

export function webTotpPendingKey(pendingId: string) {
  return `chatgiza:totp-web-pending:${pendingId}`;
}

export type PendingWebLogin = {
  sub: string;
  email: string;
  name: string;
  image: string;
  method: "totp" | "email";
  // Only set when method is "email" -- the code just emailed, checked by
  // the email-verify provider below.
  code?: string;
  // How many times this code has been re-sent -- see
  // src/app/api/auth/resend-code/route.ts, capped at MAX_RESENDS there.
  resendCount?: number;
};

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
    // Runs before a session is ever created, on every provider. Google
    // sign-in (OAuth and One Tap) used to go straight to a session for every
    // account -- a second factor was only ever enforced for accounts that
    // had explicitly turned on the Authenticator App. Now every account
    // needs a second factor on every sign-in: TOTP if the account has it
    // enabled, otherwise a mandatory emailed code (passkey-as-second-factor
    // was scoped to Android only -- web has no passkey-login capability
    // today). A device that already cleared this once stays trusted (see
    // DEVICE_TRUST_COOKIE) until the user actually signs out, so this isn't
    // a fresh challenge on every single sign-in. totp-verify/email-verify
    // below are the completion steps for the two ladder branches and must
    // NOT be re-gated here -- that would loop forever. sso is a separate
    // trust boundary this ladder doesn't cover.
    async signIn({ user, account, profile }) {
      if (
        account?.provider !== "google" &&
        account?.provider !== "google-one-tap"
      ) {
        return true;
      }

      const sub = (profile?.sub as string | undefined) ?? user?.id;
      if (!sub) return true;

      const trustCookie = (await cookies()).get(DEVICE_TRUST_COOKIE)?.value;
      const trustedSub = await verifyDeviceTrustToken(trustCookie);
      if (trustedSub === sub) return true;

      const email = (profile?.email as string | undefined) ?? user?.email ?? "";
      const name = (typeof profile?.name === "string" ? profile.name : user?.name) ?? "";
      const image = (typeof profile?.picture === "string" ? profile.picture : user?.image) ?? "";

      const { data: userRow } = await supabaseAdmin
        .from("users")
        .select("totp_enabled")
        .eq("id", sub)
        .maybeSingle();

      const pendingId = crypto.randomUUID();

      if (userRow?.totp_enabled) {
        const pending: PendingWebLogin = { sub, email, name, image, method: "totp" };
        await kv.set(webTotpPendingKey(pendingId), pending, { ex: 300 });
        return `/login/verify?pendingId=${pendingId}&method=totp`;
      }

      // Both Google providers already require an email on the identity
      // (see the one-tap provider's own `!payload.email` check below) --
      // sendMail throwing here for the unreachable empty-email case fails
      // sign-in outright instead of stranding the user on a challenge page
      // for a code that was never sent.
      const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
      const pending: PendingWebLogin = { sub, email, name, image, method: "email", code };
      await kv.set(webTotpPendingKey(pendingId), pending, { ex: 300 });
      const { subject, html, from } = signInCodeEmail(code);
      await sendMail(email, subject, html, from);
      return `/login/verify?pendingId=${pendingId}&method=email`;
    },
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
        const image = typeof profile?.picture === "string" ? profile.picture : user?.image ?? "";
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
          const h = await headers();
          const ua = h.get("user-agent");
          const ip = clientIpFromHeaders(h);
          await recordSession(sub as string, token.sessionId as string, ua, ip, "web");
        } catch (err) {
          console.error("recordSession failed:", err);
        }
        try {
          const ua = (await headers()).get("user-agent");
          const platform = ua?.includes("ChatGiZaDesktop/") ? "desktop" : "web";
          await recordUserSeen(sub as string, (email as string) ?? "", name, image, !!token.isNewAccount, platform);
        } catch (err) {
          console.error("recordUserSeen failed:", err);
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
    Credentials({
      id: "sso",
      name: "Enterprise SSO",
      credentials: {
        ssoToken: { label: "ssoToken", type: "text" },
      },
      async authorize(credentials) {
        const ssoToken = credentials?.ssoToken;
        if (!ssoToken || typeof ssoToken !== "string") return null;

        // The token is only ever minted by our own /api/auth/sso/callback
        // right after it independently verified the identity provider's
        // signed id_token -- decoding it successfully here (with our own
        // AUTH_SECRET) IS the trust check, same shape as the One Tap flow
        // above but for a per-workspace OIDC connection instead of Google.
        const identity = await verifySsoLoginToken(ssoToken);
        if (!identity) return null;

        return {
          id: identity.sub,
          name: identity.name,
          email: identity.email,
          image: null,
        };
      },
    }),
    Credentials({
      id: "totp-verify",
      name: "Authenticator Code",
      credentials: {
        pendingId: { label: "pendingId", type: "text" },
        code: { label: "code", type: "text" },
      },
      // Completion step for the signIn callback's TOTP gate above: trusts
      // the identity staged there under pendingId only after the code is
      // checked against that same account's totp_secret, same shape as the
      // sso provider trusting a token pre-verified elsewhere.
      async authorize(credentials) {
        const pendingId = credentials?.pendingId;
        const code = credentials?.code;
        if (!pendingId || typeof pendingId !== "string" || !code || typeof code !== "string") return null;

        const rate = await checkRateLimit(`totp-web:${pendingId}`, 8, 300);
        if (!rate.allowed) return null;

        const pending = await kv.get<PendingWebLogin>(webTotpPendingKey(pendingId));
        if (!pending) return null;

        const { data: userRow } = await supabaseAdmin
          .from("users")
          .select("totp_secret")
          .eq("id", pending.sub)
          .maybeSingle();
        const secret = userRow?.totp_secret as string | null;
        if (!secret || !verifyTotp(secret, code)) return null;

        await kv.del(webTotpPendingKey(pendingId));

        return {
          id: pending.sub,
          name: pending.name || null,
          email: pending.email,
          image: pending.image || null,
        };
      },
    }),
    Credentials({
      id: "email-verify",
      name: "Email Code",
      credentials: {
        pendingId: { label: "pendingId", type: "text" },
        code: { label: "code", type: "text" },
      },
      // Completion step for the signIn callback's mandatory-2FA ladder when
      // the account has no TOTP enabled -- same shape as totp-verify, but
      // checks the code emailed at stage time (stored on the pending entry
      // itself) instead of a TOTP secret.
      async authorize(credentials) {
        const pendingId = credentials?.pendingId;
        const code = credentials?.code;
        if (!pendingId || typeof pendingId !== "string" || !code || typeof code !== "string") return null;

        const rate = await checkRateLimit(`email-verify-web:${pendingId}`, 8, 300);
        if (!rate.allowed) return null;

        const pending = await kv.get<PendingWebLogin>(webTotpPendingKey(pendingId));
        if (!pending || pending.method !== "email" || !pending.code) return null;
        if (pending.code !== code) return null;

        await kv.del(webTotpPendingKey(pendingId));

        return {
          id: pending.sub,
          name: pending.name || null,
          email: pending.email,
          image: pending.image || null,
        };
      },
    }),
  ],
});
