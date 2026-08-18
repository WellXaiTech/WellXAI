const WRAPPER_STYLE =
  "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; " +
  "max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #111111;";

const HEADING_STYLE = "font-size: 20px; font-weight: 700; margin: 0 0 16px;";

const BODY_STYLE = "font-size: 15px; line-height: 1.6; color: #333333; margin: 0 0 16px;";

const FOOTER_STYLE = "font-size: 12px; color: #888888; margin-top: 32px; border-top: 1px solid #eeeeee; padding-top: 16px;";

function wrap(content: string): string {
  return `
    <div style="${WRAPPER_STYLE}">
      <div style="font-size: 18px; font-weight: 800; margin-bottom: 24px;">ChatGiZa</div>
      ${content}
      <div style="${FOOTER_STYLE}">ChatGiZa<br />You're receiving this because it relates to your ChatGiZa account.</div>
    </div>
  `;
}

export function welcomeEmail(name: string): { subject: string; html: string } {
  const greeting = name?.trim() ? name.trim() : "there";
  return {
    subject: "Welcome to ChatGiZa",
    html: wrap(`
      <p style="${HEADING_STYLE}">Welcome, ${greeting} 👋</p>
      <p style="${BODY_STYLE}">Your ChatGiZa account is ready. You can now chat, generate images and videos, search the web, and a lot more.</p>
      <p style="${BODY_STYLE}">If you ever have questions, just ask ChatGiZa directly — it can tell you what it can do.</p>
    `),
  };
}

export function passwordChangeCodeEmail(code: string): { subject: string; html: string } {
  return {
    subject: `${code} is your ChatGiZa verification code`,
    html: wrap(`
      <p style="${HEADING_STYLE}">Confirm your password change</p>
      <p style="${BODY_STYLE}">Enter this code in ChatGiZa to finish changing your password:</p>
      <p style="font-size: 32px; font-weight: 800; letter-spacing: 6px; margin: 0 0 16px; text-align: center;">${code}</p>
      <p style="${BODY_STYLE}">This code expires in 10 minutes. If you didn't request this, you can ignore this email — your password won't be changed.</p>
    `),
  };
}

export function paymentConfirmationEmail(planName: string, amount: string): { subject: string; html: string } {
  return {
    subject: `You're on the ${planName} plan`,
    html: wrap(`
      <p style="${HEADING_STYLE}">Payment received 🎉</p>
      <p style="${BODY_STYLE}">Thanks for upgrading to the <strong>${planName}</strong> plan (${amount}/month). Your new features are active now.</p>
      <p style="${BODY_STYLE}">You can manage your plan any time from ChatGiZa's Upgrade menu.</p>
    `),
  };
}
