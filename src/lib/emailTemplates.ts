const WRAPPER_STYLE =
  "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; " +
  "max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #111111;";

const HEADING_STYLE = "font-size: 20px; font-weight: 700; margin: 0 0 16px;";

const BODY_STYLE = "font-size: 15px; line-height: 1.6; color: #333333; margin: 0 0 16px;";

const BOX_STYLE = "background: #f7f7f8; border-radius: 8px; padding: 20px; margin: 0 0 16px;";

const CODE_STYLE = "font-size: 32px; font-weight: 500; letter-spacing: 6px; margin: 0; text-align: center;";

const FOOTER_STYLE = "font-size: 12px; color: #888888; margin-top: 32px; border-top: 1px solid #eeeeee; padding-top: 16px;";

// Verification-code emails (sign-in, password change, email change) are
// framed as coming from WellXAI, the company -- not ChatGiZa, the product --
// the same way OpenAI's own account-security emails say "OpenAI", not
// "ChatGPT". Everything else (welcome, payment) stays ChatGiZa-branded since
// those are genuinely about the product.
function wrap(content: string, brand: "ChatGiZa" | "WellXAI" = "ChatGiZa"): string {
  return `
    <div style="${WRAPPER_STYLE}">
      <div style="font-size: 22px; font-weight: 600; margin-bottom: 24px;">${brand}</div>
      ${content}
      <p style="${BODY_STYLE}">Best,<br />${brand}</p>
      <div style="${FOOTER_STYLE}">If you have any questions please contact us through our <a href="https://support.wellxai.world" style="color: #888888;">help center</a>.</div>
    </div>
  `;
}

export function welcomeEmail(name: string): { subject: string; html: string; from?: string } {
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

export function passwordChangeCodeEmail(code: string): { subject: string; html: string; from?: string } {
  return {
    subject: "Your authentication code",
    from: "WellXAI <noreply@tm.wellxai.world>",
    html: wrap(
      `
      <p style="${HEADING_STYLE}">Your authentication code</p>
      <p style="${BODY_STYLE}">Please use the following code to confirm your password change:</p>
      <div style="${BOX_STYLE}"><p style="${CODE_STYLE}">${code}</p></div>
      <div style="${BOX_STYLE}"><p style="${BODY_STYLE} margin: 0;">This code expires in 5 minutes. If you didn't request this, you can ignore this email — your password won't be changed.</p></div>
    `,
      "WellXAI"
    ),
  };
}

export function emailChangeCodeEmail(code: string): { subject: string; html: string; from?: string } {
  return {
    subject: "Your authentication code",
    from: "WellXAI <noreply@tm.wellxai.world>",
    html: wrap(
      `
      <p style="${HEADING_STYLE}">Your authentication code</p>
      <p style="${BODY_STYLE}">Please use the following code to confirm this as your account's new contact email:</p>
      <div style="${BOX_STYLE}"><p style="${CODE_STYLE}">${code}</p></div>
      <div style="${BOX_STYLE}"><p style="${BODY_STYLE} margin: 0;">This code expires in 5 minutes. If you didn't request this, you can ignore this email — your account's email won't change.</p></div>
    `,
      "WellXAI"
    ),
  };
}

export function signInCodeEmail(code: string): { subject: string; html: string; from?: string } {
  return {
    subject: "Your authentication code",
    from: "WellXAI <noreply@tm.wellxai.world>",
    html: wrap(
      `
      <p style="${HEADING_STYLE}">Your authentication code</p>
      <p style="${BODY_STYLE}">Please use the following code to confirm it's you signing in on this device:</p>
      <div style="${BOX_STYLE}"><p style="${CODE_STYLE}">${code}</p></div>
      <div style="${BOX_STYLE}"><p style="${BODY_STYLE} margin: 0;">This code expires in 5 minutes. If you didn't try to sign in, you can ignore this email.</p></div>
    `,
      "WellXAI"
    ),
  };
}

export function paymentConfirmationEmail(planName: string, amount: string): { subject: string; html: string; from?: string } {
  return {
    subject: `You're on the ${planName} plan`,
    html: wrap(`
      <p style="${HEADING_STYLE}">Payment received 🎉</p>
      <p style="${BODY_STYLE}">Thanks for upgrading to the <strong>${planName}</strong> plan (${amount}/month). Your new features are active now.</p>
      <p style="${BODY_STYLE}">You can manage your plan any time from ChatGiZa's Upgrade menu.</p>
    `),
  };
}

// Admin-only, not user-facing -- sent immediately when someone crosses the
// 2FA rate limit (repeated wrong codes in a short window), the clearest
// signal available today that an account is actively being brute-forced
// rather than a real owner mistyping a code once or twice.
export function suspiciousLoginAlertEmail(detail: string): { subject: string; html: string; from?: string } {
  return {
    subject: "ChatGiZa security alert: repeated failed sign-in attempts",
    from: "WellXAI <noreply@tm.wellxai.world>",
    html: wrap(
      `
      <p style="${HEADING_STYLE}">Possible brute-force attempt</p>
      <p style="${BODY_STYLE}">An account just crossed the 2FA rate limit -- more wrong codes than a real owner mistyping once or twice would produce.</p>
      <div style="${BOX_STYLE}"><p style="${BODY_STYLE} margin: 0; font-family: monospace;">${detail}</p></div>
      <p style="${BODY_STYLE}">The attempt was already blocked by rate limiting; this is a heads-up, not an active breach.</p>
    `,
      "WellXAI"
    ),
  };
}
