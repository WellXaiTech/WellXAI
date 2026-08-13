import { kv } from "@vercel/kv";

export type AdStatus = "pending_review" | "approved" | "rejected";

export type Ad = {
  id: string;
  advertiserUserId: string;
  advertiserEmail: string;
  headline: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  // ISO 3166-1 alpha-2 codes, e.g. "KE", "TZ" -- see src/lib/countries.ts.
  countries: string[];
  durationSeconds: number;
  status: AdStatus;
  createdAt: number;
  // Set when an admin approves the ad -- the live window starts at approval
  // time, not payment time, so a slow review never eats into paid airtime.
  startsAt: number | null;
  expiresAt: number | null;
  rejectionReason: string | null;
  // Payment isn't wired up yet (built once pricing/currency are decided) --
  // these fields exist now so approval/serving logic never needs to change
  // shape later, just start getting populated.
  priceCents: number | null;
  currency: string | null;
  paymentStatus: "not_required" | "pending" | "paid";
};

const ADS_KEY = "chatgiza:ads:all";
const MAX_DURATION_SECONDS = 30 * 24 * 60 * 60; // 30 days, sanity cap

export function isValidDurationSeconds(seconds: number): boolean {
  return Number.isFinite(seconds) && seconds > 0 && seconds <= MAX_DURATION_SECONDS;
}

export async function getAllAds(): Promise<Ad[]> {
  try {
    return (await kv.get<Ad[]>(ADS_KEY)) ?? [];
  } catch (err) {
    console.error("Ads KV get error", err);
    return [];
  }
}

export async function saveAllAds(ads: Ad[]): Promise<void> {
  await kv.set(ADS_KEY, ads);
}

export function isAdActive(ad: Ad, nowMs: number): boolean {
  return ad.status === "approved" && ad.expiresAt !== null && ad.expiresAt > nowMs;
}

// A stored ad's own `status` only ever moves pending_review -> approved/
// rejected -- "expired" is derived at read time from expiresAt instead of
// a background sweep mutating the record, so display status is always
// correct without needing a cron job to keep it in sync.
export function displayStatus(ad: Ad, nowMs: number): AdStatus | "expired" {
  if (ad.status === "approved" && ad.expiresAt !== null && ad.expiresAt <= nowMs) return "expired";
  return ad.status;
}
