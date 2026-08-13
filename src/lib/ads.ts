import { kv } from "@vercel/kv";

export type AdStatus = "pending_payment" | "pending_review" | "approved" | "rejected";

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
  // Full language name, e.g. "Swahili" -- see LANGUAGES in
  // src/components/LanguagePanel.tsx, same list the chat language picker
  // already uses.
  language: string;
  durationSeconds: number;
  status: AdStatus;
  createdAt: number;
  // Set when an admin approves the ad -- the live window starts at approval
  // time, not payment time, so a slow review never eats into paid airtime.
  startsAt: number | null;
  expiresAt: number | null;
  rejectionReason: string | null;
  priceCents: number | null;
  currency: string | null;
  paymentStatus: "not_required" | "pending" | "paid";
};

const ADS_KEY = "chatgiza:ads:all";
const MAX_DURATION_SECONDS = 30 * 24 * 60 * 60; // 30 days, sanity cap

export function isValidDurationSeconds(seconds: number): boolean {
  return Number.isFinite(seconds) && seconds > 0 && seconds <= MAX_DURATION_SECONDS;
}

// Starter pricing, USD cents -- flat rate per duration tier rather than a
// per-second formula, so the price is a clean, predictable number instead
// of an odd fraction of a cent. Easy to retune later: just edit this table,
// nothing else needs to change.
const PRICE_TABLE_CENTS: Record<number, number> = {
  [5 * 60]: 200, // $2 / 5 min
  [15 * 60]: 500, // $5 / 15 min
  [30 * 60]: 900, // $9 / 30 min
  [60 * 60]: 1500, // $15 / hour
  [6 * 60 * 60]: 6000, // $60 / 6 hours
  [24 * 60 * 60]: 18000, // $180 / day
  [7 * 24 * 60 * 60]: 90000, // $900 / week
};

export function priceForDurationSeconds(seconds: number): number | null {
  return PRICE_TABLE_CENTS[seconds] ?? null;
}

// The web form stores the advertiser's chosen language as a full name
// (e.g. "Swahili", matching LANGUAGES in LanguagePanel.tsx). The Android
// app only knows its device locale as an ISO 639-1 code (e.g. "sw") --
// this resolves either form to the stored full name so /api/ads/active can
// filter consistently regardless of which client is asking.
const LANGUAGE_CODE_TO_NAME: Record<string, string> = {
  en: "English",
  sw: "Swahili",
  fr: "French",
  ar: "Arabic",
  es: "Spanish",
  pt: "Portuguese",
  de: "German",
  it: "Italian",
  hi: "Hindi",
  zh: "Chinese (Simplified)",
  am: "Amharic",
  so: "Somali",
  ha: "Hausa",
  ig: "Igbo",
  yo: "Yoruba",
  zu: "Zulu",
  ru: "Russian",
  ja: "Japanese",
  ko: "Korean",
  tr: "Turkish",
};

export function resolveLanguageQuery(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  return LANGUAGE_CODE_TO_NAME[trimmed.toLowerCase()] ?? trimmed;
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

// A stored ad's own `status` only ever moves pending_payment -> pending_review
// -> approved/rejected -- "expired" is derived at read time from expiresAt
// instead of a background sweep mutating the record, so display status is
// always correct without needing a cron job to keep it in sync.
export function displayStatus(ad: Ad, nowMs: number): AdStatus | "expired" {
  if (ad.status === "approved" && ad.expiresAt !== null && ad.expiresAt <= nowMs) return "expired";
  return ad.status;
}
