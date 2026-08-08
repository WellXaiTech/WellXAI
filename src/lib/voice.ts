export type VoiceSpeed = "slow" | "normal" | "fast";

export const PREMIUM_VOICE_NAMES = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar",
] as const;
export type PremiumVoiceName = (typeof PREMIUM_VOICE_NAMES)[number];

const VOICE_URI_KEY = "chatgiza:voice-uri";
const VOICE_SPEED_KEY = "chatgiza:voice-speed";
const VOICE_LANG_KEY = "chatgiza:voice-lang";
const PREMIUM_VOICE_ENABLED_KEY = "chatgiza:premium-voice-enabled";
const PREMIUM_VOICE_NAME_KEY = "chatgiza:premium-voice-name";

export function getPremiumVoiceEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PREMIUM_VOICE_ENABLED_KEY) === "true";
}

export function setPremiumVoiceEnabled(enabled: boolean) {
  localStorage.setItem(PREMIUM_VOICE_ENABLED_KEY, enabled ? "true" : "false");
}

export function getStoredPremiumVoiceName(): PremiumVoiceName {
  if (typeof window === "undefined") return "marin";
  const raw = localStorage.getItem(PREMIUM_VOICE_NAME_KEY);
  return (PREMIUM_VOICE_NAMES as readonly string[]).includes(raw ?? "") ? (raw as PremiumVoiceName) : "marin";
}

export function setStoredPremiumVoiceName(name: PremiumVoiceName) {
  localStorage.setItem(PREMIUM_VOICE_NAME_KEY, name);
}

export function getStoredVoiceLang(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(VOICE_LANG_KEY) ?? "";
}

export function setStoredVoiceLang(lang: string) {
  localStorage.setItem(VOICE_LANG_KEY, lang);
}

export function getStoredVoiceURI(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(VOICE_URI_KEY) ?? "";
}

export function setStoredVoiceURI(uri: string) {
  localStorage.setItem(VOICE_URI_KEY, uri);
}

export function getStoredVoiceSpeed(): VoiceSpeed {
  if (typeof window === "undefined") return "normal";
  const raw = localStorage.getItem(VOICE_SPEED_KEY);
  return raw === "slow" || raw === "fast" ? raw : "normal";
}

export function setStoredVoiceSpeed(speed: VoiceSpeed) {
  localStorage.setItem(VOICE_SPEED_KEY, speed);
}

export function speedToRate(speed: VoiceSpeed): number {
  if (speed === "slow") return 0.8;
  if (speed === "fast") return 1.25;
  return 1;
}
