export type VoiceSpeed = "slow" | "normal" | "fast";

const VOICE_URI_KEY = "chatgiza:voice-uri";
const VOICE_SPEED_KEY = "chatgiza:voice-speed";
const VOICE_LANG_KEY = "chatgiza:voice-lang";

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
