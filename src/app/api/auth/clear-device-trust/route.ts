import { NextResponse } from "next/server";
import { auth, DEVICE_TRUST_COOKIE } from "@/auth";
import { recordUserLogout } from "@/lib/userIndex";

// Called alongside every sign-out (see chatgizaSignOut) so a device that
// signed out actually gets re-challenged on its next sign-in, instead of
// the trust cookie surviving and silently skipping 2FA for whoever signs
// in next on this browser. Also the one server round-trip guaranteed to
// happen on every sign-out, so it doubles as where last_logout_at gets set.
export async function POST() {
  const session = await auth();
  if (session?.user?.id) {
    void recordUserLogout(session.user.id);
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(DEVICE_TRUST_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
