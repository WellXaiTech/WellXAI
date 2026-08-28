import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { randomInt } from "crypto";
import { webTotpPendingKey, type PendingWebLogin } from "@/auth";
import { sendMail } from "@/lib/mailer";
import { signInCodeEmail } from "@/lib/emailTemplates";

// Capped so a lost/slow email can be retried a few times without turning
// this into an open code-spamming endpoint.
const MAX_RESENDS = 4;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const pendingId = typeof body?.pendingId === "string" ? body.pendingId : "";
  if (!pendingId) {
    return NextResponse.json({ error: "Missing pendingId" }, { status: 400 });
  }

  const pending = await kv.get<PendingWebLogin>(webTotpPendingKey(pendingId));
  if (!pending || pending.method !== "email") {
    // Either the challenge expired (already past its 5-minute TTL) or this
    // is the TOTP-authenticator branch, which has nothing to resend.
    return NextResponse.json({ error: "This code has expired. Please sign in again." }, { status: 410 });
  }

  const resendCount = pending.resendCount ?? 0;
  if (resendCount >= MAX_RESENDS) {
    return NextResponse.json(
      { error: "You've reached the resend limit. Please sign in again." },
      { status: 429 }
    );
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const newResendCount = resendCount + 1;
  const next: PendingWebLogin = { ...pending, code, resendCount: newResendCount };
  // Fresh 5-minute window on every resend, same TTL as the original code.
  await kv.set(webTotpPendingKey(pendingId), next, { ex: 300 });

  const { subject, html, from } = signInCodeEmail(code);
  await sendMail(pending.email, subject, html, from);

  return NextResponse.json({ ok: true, resendsLeft: MAX_RESENDS - newResendCount });
}
