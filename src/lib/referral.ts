const REFERRAL_APPLIED_KEY = "chatgiza:referral-applied";
const REFERRAL_BONUS_MESSAGES = 2;

function hashCode(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

export function getReferralCode(userId: string): string {
  return hashCode(userId).slice(0, 8);
}

export function getReferralLink(code: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://chatgiza.com";
  return `${origin}/chatgiza?ref=${code}`;
}

/** Applies a referral bonus at most once per browser. Best-effort — never blocks the app if it fails. */
export function captureReferralFromUrl(code: string | null) {
  if (!code || typeof window === "undefined") return;
  if (localStorage.getItem(REFERRAL_APPLIED_KEY)) return;
  localStorage.setItem(REFERRAL_APPLIED_KEY, code);
  fetch("/api/referral/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  }).catch(() => {});
}

/** Guests who arrived via a referral link get a few extra free messages before the sign-in wall. */
export function getGuestFreeMessageLimit(base: number): number {
  if (typeof window === "undefined") return base;
  return localStorage.getItem(REFERRAL_APPLIED_KEY) ? base + REFERRAL_BONUS_MESSAGES : base;
}
