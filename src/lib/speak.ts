import { franc } from "franc-min";
import {
  getStoredVoiceURI,
  getStoredVoiceSpeed,
  speedToRate,
  getPremiumVoiceEnabled,
  getStoredPremiumVoiceName,
} from "@/lib/voice";

// Chrome silently stops a single long SpeechSynthesisUtterance after ~15s
// (a long-standing browser bug), so long text gets split into short
// sentence-sized utterances and queued one after another instead.
function splitIntoSpeechChunks(text: string, maxLen = 200): string[] {
  const sentences = text.match(/[^.!?\n]+[.!?]*\n*/g) ?? [text];
  const chunks: string[] = [];
  for (const sentence of sentences) {
    let remaining = sentence.trim();
    if (!remaining) continue;
    while (remaining.length > maxLen) {
      let cut = remaining.lastIndexOf(" ", maxLen);
      if (cut <= 0) cut = maxLen;
      chunks.push(remaining.slice(0, cut).trim());
      remaining = remaining.slice(cut).trim();
    }
    if (remaining) chunks.push(remaining);
  }
  return chunks.length ? chunks : [text];
}

// franc returns the specific ISO 639-3 code it detected (e.g. "swh" for
// everyday spoken Swahili, "cmn" for Mandarin, "arb" for Standard Arabic)
// -- but SpeechSynthesisVoice.lang is keyed on the two-letter ISO 639-1
// macrolanguage code ("sw", "zh", "ar"), and generic 639-3<->639-1 lookup
// tables (e.g. the `langs` package) are built around the macrolanguage
// codes themselves, not each individual-language code that maps to them --
// so a naive lookup misses exactly the codes franc actually returns (it
// returned "swh" with 100% confidence for real Swahili text in testing,
// but a generic table has no "swh" entry at all, only "swa"). This table
// is hand-verified against every one of franc-min's ~60 supported
// languages (plus "cmn", detected via script rather than its trigram
// data) instead. Entries with no real ISO 639-1 code (mostly regional
// languages unlikely to have an installed browser voice anyway) are
// simply omitted -- detectVoiceLangPrefix falls through to null for
// those, the same safe no-op as an unrecognized language.
const ISO_639_3_TO_1: Record<string, string> = {
  arb: "ar", // Standard Arabic
  azj: "az", // Azerbaijani
  bel: "be", // Belarusian
  bos: "bs", // Bosnian
  bul: "bg", // Bulgarian
  ces: "cs", // Czech
  ckb: "ku", // Central Kurdish (Sorani)
  cmn: "zh", // Mandarin Chinese
  deu: "de", // German
  eng: "en", // English
  fra: "fr", // French
  hau: "ha", // Hausa
  hin: "hi", // Hindi
  hrv: "hr", // Croatian
  hun: "hu", // Hungarian
  ibo: "ig", // Igbo
  ind: "id", // Indonesian
  ita: "it", // Italian
  jav: "jv", // Javanese
  kaz: "kk", // Kazakh
  kin: "rw", // Kinyarwanda
  koi: "kv", // Komi
  lin: "ln", // Lingala
  mar: "mr", // Marathi
  nld: "nl", // Dutch
  npi: "ne", // Nepali
  nya: "ny", // Chichewa/Nyanja
  pbu: "ps", // Northern Pashto
  pes: "fa", // Iranian Persian
  plt: "mg", // Plateau Malagasy
  pol: "pl", // Polish
  por: "pt", // Portuguese
  qug: "qu", // Chimborazo Highland Quichua
  ron: "ro", // Romanian
  run: "rn", // Rundi
  rus: "ru", // Russian
  som: "so", // Somali
  spa: "es", // Spanish
  srp: "sr", // Serbian
  sun: "su", // Sundanese
  swe: "sv", // Swedish
  swh: "sw", // Swahili (the everyday spoken variant -- ChatGiZa's flagship language)
  tgl: "tl", // Tagalog
  tur: "tr", // Turkish
  ukr: "uk", // Ukrainian
  urd: "ur", // Urdu
  uzn: "uz", // Northern Uzbek
  vie: "vi", // Vietnamese
  yor: "yo", // Yoruba
  zlm: "ms", // Malay
  zul: "zu", // Zulu
};

// Detection is unreliable below ~12 characters, so short chunks ("Sawa.",
// "Asante!") are left alone rather than risk a wrong guess -- and even a
// wrong guess is bounded: it only matters at all when a voice for that
// (wrong) language happens to be installed, otherwise this still falls
// through to the default voice exactly as if nothing was detected.
function detectVoiceLangPrefix(text: string): string | null {
  if (text.trim().length < 12) return null;
  const iso3 = franc(text, { minLength: 10 });
  return ISO_639_3_TO_1[iso3] ?? null;
}

// The free on-device engine defaults to whatever the browser/OS picked as
// its default voice and stays there regardless of what's actually being
// read -- text in any other language came out sounded-out with that
// voice's phonetics. Detected once per full reply (not per chunk, for more
// reliable detection with more context) and reused for every chunk of it,
// so a single reply doesn't flip voices mid-sentence. Respects an
// explicitly user-chosen voice first; otherwise prefers whichever
// installed voice matches the detected language -- most browsers/OSes
// only ship a handful of languages' worth of free voices, in which case
// this quietly falls through to the default voice, same as before
// (Premium Voice in Settings is the reliable fix for anything not
// installed locally).
function pickVoiceForText(text: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const storedVoiceURI = getStoredVoiceURI();
  if (storedVoiceURI) {
    return voices.find((v) => v.voiceURI === storedVoiceURI) ?? null;
  }
  const prefix = detectVoiceLangPrefix(text);
  if (!prefix) return null;
  return voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ?? null;
}

function speakChunks(
  chunks: string[],
  index: number,
  voice: SpeechSynthesisVoice | null,
  onDone?: () => void,
  onError?: () => void
) {
  if (index >= chunks.length) {
    onDone?.();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(chunks[index]);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }
  utterance.rate = speedToRate(getStoredVoiceSpeed());
  utterance.onend = () => speakChunks(chunks, index + 1, voice, onDone, onError);
  utterance.onerror = () => onError?.();
  window.speechSynthesis.speak(utterance);
}

function speakBrowser(text: string, onDone?: () => void, onError?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onError?.();
    return;
  }
  window.speechSynthesis.cancel();
  const voice = pickVoiceForText(text);
  speakChunks(splitIntoSpeechChunks(text), 0, voice, onDone, onError);
}

let premiumAudio: HTMLAudioElement | null = null;

// Real OpenAI TTS audio via /api/tts, instead of the browser's free (and
// often robotic-sounding) built-in voices. Falls back to the browser voice
// on any failure (network error, not signed in, etc.) rather than going
// silent, since the user still expects *something* to happen when they hit
// the speak button.
async function speakPremium(text: string, onDone?: () => void, onError?: () => void) {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: getStoredPremiumVoiceName() }),
    });
    if (!res.ok) throw new Error("TTS request failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    premiumAudio?.pause();
    const audio = new Audio(url);
    audio.playbackRate = speedToRate(getStoredVoiceSpeed());
    premiumAudio = audio;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      onDone?.();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      onError?.();
    };
    await audio.play();
  } catch {
    speakBrowser(text, onDone, onError);
  }
}

/** Speaks text aloud using the user's stored voice/speed preference --
 * real OpenAI audio if Premium Voices is on, otherwise the browser's
 * built-in speech synthesis. Fails silently if neither is available. */
export function speakText(text: string, onDone?: () => void, onError?: () => void) {
  const plain = text.trim();
  if (!plain) {
    onDone?.();
    return;
  }
  stopSpeaking();
  if (getPremiumVoiceEnabled()) {
    void speakPremium(plain, onDone, onError);
  } else {
    speakBrowser(plain, onDone, onError);
  }
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  premiumAudio?.pause();
  premiumAudio = null;
}
