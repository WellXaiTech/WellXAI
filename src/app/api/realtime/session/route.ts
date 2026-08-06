import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";

// Mints a short-lived OpenAI Realtime API client secret so the native app
// can open a WebSocket straight to OpenAI (audio/video is far too latency-
// sensitive to relay through our own server). The real OPENAI_API_KEY never
// leaves the backend — only this ~minutes-long ephemeral token does.
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Live Vision isn't configured on this server" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);

  // Only pass through voices OpenAI's Realtime API actually accepts — an
  // unrecognized value makes the whole client_secrets call fail outright.
  const ALLOWED_VOICES = new Set(["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse", "marin", "cedar"]);
  const requestedVoice = typeof body?.voice === "string" ? body.voice.trim().toLowerCase() : "";
  const voice = ALLOWED_VOICES.has(requestedVoice) ? requestedVoice : "marin";
  const pushToTalk = body?.pushToTalk === true;

  const rawLanguage = typeof body?.language === "string" ? body.language.trim() : "";
  // "Auto-detect" is the app's own placeholder for "no language chosen" (see
  // LANGUAGE_KEY's default in page.tsx) — it isn't a real language name, so
  // passing it straight through told the model to "speak in Auto-detect",
  // which is nonsense and was making it pick languages at random.
  const hasExplicitLanguage = rawLanguage && rawLanguage.toLowerCase() !== "auto-detect";
  // Asking the model to "detect the language from audio" proved unreliable in
  // practice (it would confidently reply in the wrong language) — most users
  // of this app speak Swahili, so default to that outright instead of
  // guessing when no language is explicitly chosen in Settings.
  const language = hasExplicitLanguage ? rawLanguage : "Swahili";

  const languageInstruction =
    `Always speak and reply in ${language}. Every single reply must be in ${language}, with no exceptions — even if ` +
    `you mishear the user's audio or aren't fully sure what they said, respond in ${language} anyway rather than ` +
    `switching languages.`;

  // ISO-639-1 hint for the speech-to-text model — significantly improves
  // transcription accuracy for non-English languages (Swahili especially),
  // which in turn is what was likely causing the wrong-language replies:
  // the model was mishearing the words, not just mistranslating them.
  const LANGUAGE_CODES: Record<string, string> = {
    swahili: "sw",
    english: "en",
    french: "fr",
    arabic: "ar",
    spanish: "es",
    portuguese: "pt",
    german: "de",
    "chinese (simplified)": "zh",
    "chinese (traditional)": "zh",
    hindi: "hi",
    amharic: "am",
    somali: "so",
    hausa: "ha",
    igbo: "ig",
  };
  const transcriptionLanguage = LANGUAGE_CODES[language.toLowerCase()];

  try {
    const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: "gpt-realtime",
          instructions:
            "You are ChatGiZa's live vision assistant. The user is showing you their camera feed in real time and " +
            "talking to you — you receive a fresh photo from their camera every second or two alongside their live " +
            "audio, so always base what you say on the MOST RECENT image you were sent, not older ones. Describe " +
            "what you see, identify objects/people/animals/vehicles/scenes, read any visible text aloud when asked, " +
            "and answer questions about the live view conversationally and concisely, as if looking over their " +
            "shoulder. If you haven't received any image yet, say so instead of guessing. " +
            languageInstruction,
          audio: {
            input: {
              transcription: {
                model: "gpt-4o-mini-transcribe",
                ...(transcriptionLanguage ? { language: transcriptionLanguage } : {}),
              },
              noise_reduction: { type: "near_field" },
              // Push-to-talk mode drives turn-taking explicitly from the
              // client (commit + response.create on button release), so
              // the server's own voice-activity detection must be off —
              // otherwise it would also try to auto-detect turn endings.
              ...(pushToTalk ? { turn_detection: null } : {}),
            },
            output: { voice },
          },
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Realtime client_secrets error:", res.status, text);
      return NextResponse.json({ error: "Couldn't start a live session" }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ value: data.value, expiresAt: data.expires_at });
  } catch (err) {
    console.error("Realtime session error:", err);
    const message = err instanceof Error ? err.message : "Couldn't start a live session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
