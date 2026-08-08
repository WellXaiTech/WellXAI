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

function speakChunks(chunks: string[], index: number, onDone?: () => void, onError?: () => void) {
  if (index >= chunks.length) {
    onDone?.();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(chunks[index]);
  const storedVoiceURI = getStoredVoiceURI();
  if (storedVoiceURI) {
    const voice = window.speechSynthesis.getVoices().find((v) => v.voiceURI === storedVoiceURI);
    if (voice) utterance.voice = voice;
  }
  utterance.rate = speedToRate(getStoredVoiceSpeed());
  utterance.onend = () => speakChunks(chunks, index + 1, onDone, onError);
  utterance.onerror = () => onError?.();
  window.speechSynthesis.speak(utterance);
}

function speakBrowser(text: string, onDone?: () => void, onError?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onError?.();
    return;
  }
  window.speechSynthesis.cancel();
  speakChunks(splitIntoSpeechChunks(text), 0, onDone, onError);
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
