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
  const language = typeof body?.language === "string" && body.language.trim() ? body.language.trim() : null;

  const languageInstruction = language
    ? `Always speak and reply in ${language}, no matter what language the user's audio sounds like — never switch to ` +
      `another language mid-conversation.`
    : "Detect the language the user is actually speaking from their audio (most users of this app speak Swahili, " +
      "but follow whatever language you actually hear) and always reply in that same language — never switch to a " +
      "different language than what the user just spoke, and never guess a language you didn't actually hear.";

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
