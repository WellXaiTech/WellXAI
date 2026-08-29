import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";
import { sendMailBestEffort } from "@/lib/mailer";
import { getWorkspaceForUser } from "@/lib/workspace";

const SUPPORT_NOTIFY_EMAIL = process.env.SUPPORT_NOTIFY_EMAIL || "support@wellxai.world";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!message || !email) {
    return NextResponse.json({ error: "Email na ujumbe vinahitajika." }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const workspace = userId ? await getWorkspaceForUser(userId).catch(() => null) : null;
  const priority = workspace !== null;

  const record = {
    id: crypto.randomUUID(),
    message,
    email,
    userId,
    userName: session?.user?.name ?? null,
    priority,
    createdAt: Date.now(),
  };

  try {
    await kv.set(`chatgiza:support:${record.id}`, record);
  } catch (err) {
    console.error("Failed to store support message:", err);
  }

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <p style="font-size: 18px; font-weight: 800; margin-bottom: 16px;">ChatGiZa — New customer message${priority ? " 🔺 PRIORITY (Workspace account)" : ""}</p>
      <p style="font-size: 14px; color: #333;"><strong>From:</strong> ${escapeHtml(email)}${
        record.userName ? ` (${escapeHtml(record.userName)})` : ""
      }</p>
      <p style="font-size: 14px; color: #333; white-space: pre-wrap;">${escapeHtml(message)}</p>
    </div>
  `;

  await sendMailBestEffort(
    SUPPORT_NOTIFY_EMAIL,
    `${priority ? "[PRIORITY] " : ""}New customer message: ${email}`,
    html
  );

  return NextResponse.json({ ok: true });
}
