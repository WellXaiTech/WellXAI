import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      // True only for the sign-in where this Google account is used for the
      // very first time ever — lets the onboarding step (birth date/country)
      // target genuinely new accounts instead of "no local profile data",
      // which would otherwise re-trigger for existing users on a new device.
      isNewAccount?: boolean;
      // Per-sign-in device id, minted once at login and used to identify
      // "this browser/device" in Security > Sessions and to check whether
      // that specific session has since been remotely logged out.
      sessionId?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isNewAccount?: boolean;
    sessionId?: string;
  }
}
