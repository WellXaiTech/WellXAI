import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";

// Premium Voices: real OpenAI TTS audio for regular chat replies, instead of
// (or alongside) the browser's own free SpeechSynthesis voices. Same voice
// names the Realtime/Live Vision session already uses -- this is a much
// simpler request/response call, not a WebSocket session, since it's just
// "speak this one reply" rather than a live conversation.
const ALLOWED_VOICES = new Set(["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse", "marin", "cedar"]);
const MAX_TEXT_LENGTH = 4000;

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Premium voices aren't configured on this server" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, MAX_TEXT_LENGTH) : "";
  const requestedVoice = typeof body?.voice === "string" ? body.voice.trim().toLowerCase() : "";
  const voice = ALLOWED_VOICES.has(requestedVoice) ? requestedVoice : "marin";

  if (!text) {
    return NextResponse.json({ error: "No text to speak" }, { status: 400 });
  }

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });
    const response = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: voice as
        | "alloy"
        | "ash"
        | "ballad"
        | "coral"
        | "echo"
        | "sage"
        | "shimmer"
        | "verse"
        | "marin"
        | "cedar",
      input: text,
      // gpt-4o-mini-tts is instruction-steerable (unlike the older tts-1
      // models) -- without this, non-English text got sounded out with
      // English phonetics instead of spoken like a native speaker actually
      // would. This doesn't change what's said, only how it's pronounced --
      // and applies to any language the reply happens to be in, not just
      // Kiswahili, since ChatGiZa replies in whatever language the user
      // wrote in.
      instructions:
        "Speak fluently and naturally, like a genuine native speaker of whatever language or mix of languages the " +
        "text is actually written in -- correct native pronunciation, rhythm, and intonation for THAT language, " +
        "never sounding out the words with English (or any other foreign) phonetics or accent. This applies equally " +
        "to every language, not just the more common ones. Kiswahili or Sheng text specifically needs authentic " +
        "Kiswahili/Sheng pronunciation and rhythm, since that's frequently misread with English phonetics otherwise.",
      response_format: "mp3",
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("TTS error:", err);
    return NextResponse.json({ error: "Couldn't generate speech" }, { status: 500 });
  }
}
