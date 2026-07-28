import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  callbacks: {
    jwt({ token, profile }) {
      // `profile.sub` is Google's stable per-account id — same value on every
      // device/browser signed into the same Google account, which is what lets
      // account-synced history (see /api/history) key data by a durable id
      // instead of a per-session/per-browser one.
      if (profile?.sub) token.sub = profile.sub;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
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
  ],
});
