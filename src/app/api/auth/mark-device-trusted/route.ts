import { NextResponse } from "next/server";
import { auth, DEVICE_TRUST_COOKIE } from "@/auth";
import { mintDeviceTrustToken } from "@/lib/deviceTrust";

// Called by /login/verify right after a second-factor challenge (or a
// trust-cookie fast path) actually completes a real session -- mints the
// device-trust token and sets it as an httpOnly cookie so this exact
// browser skips the challenge on its next sign-in, until the user signs out
// (see chatgizaSignOut, which clears this same cookie).
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const token = await mintDeviceTrustToken(session.user.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(DEVICE_TRUST_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 90 * 24 * 60 * 60,
  });
  return res;
}
