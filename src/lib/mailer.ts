import { Resend } from "resend";

let client: Resend | null = null;

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  const resend = getClient();
  if (!resend) {
    throw new Error("Email isn't configured — set RESEND_API_KEY in .env");
  }
  const from = process.env.MAIL_FROM || "ChatGiZa <noreply@tm.chatgiza.com>";
  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) throw new Error(error.message);
}

export async function sendMailBestEffort(to: string, subject: string, html: string): Promise<void> {
  try {
    await sendMail(to, subject, html);
  } catch (err) {
    console.error(`Failed to send "${subject}" email to ${to}:`, err);
  }
}
