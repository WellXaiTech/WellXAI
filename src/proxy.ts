import { NextResponse } from "next/server";
import { auth } from "@/auth";

// The whole app now lives behind sign-in — no guest trial. Anyone hitting
// /chatgiza without a session is bounced to /login first; "/" already
// redirects into /chatgiza, so this is the single gate for the entire app.
export default auth((req) => {
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: ["/chatgiza/:path*"],
};
