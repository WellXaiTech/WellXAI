import { getStoredVoiceURI, getStoredVoiceSpeed, speedToRate } from "@/lib/voice";

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

/** Speaks text aloud using the user's stored voice/speed preference. Fails silently if speech synthesis is unavailable or blocked. */
export function speakText(text: string, onDone?: () => void, onError?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onError?.();
    return;
  }
  const plain = text.trim();
  if (!plain) {
    onDone?.();
    return;
  }
  window.speechSynthesis.cancel();
  speakChunks(splitIntoSpeechChunks(plain), 0, onDone, onError);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
