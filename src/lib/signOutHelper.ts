"use client";

import { signOut } from "next-auth/react";

// Every sign-out must also clear the device-trust cookie (see
// /api/auth/clear-device-trust) -- otherwise "trusted until sign-out" is a
// lie: the cookie would survive and silently skip the 2FA challenge for
// whoever signs in next on this same browser. Use this everywhere the app
// used to call next-auth/react's signOut directly.
export async function chatgizaSignOut(callbackUrl = "/login"): Promise<void> {
  await fetch("/api/auth/clear-device-trust", { method: "POST" }).catch(() => {});
  await signOut({ callbackUrl });
}
