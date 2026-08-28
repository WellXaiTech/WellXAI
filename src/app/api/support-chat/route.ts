import { NextRequest, NextResponse } from "next/server";
import { COMPANY_IDENTITY_PROMPT, MODELS } from "@/lib/promptShared";

export const maxDuration = 30;

// Kept in sync by hand with the categories in
// src/components/SupportPageClient.tsx -- duplicated as plain text here
// rather than shared, since that file's Category type carries JSX icons
// that don't belong in a server-side prompt string.
const FAQ_CONTEXT = `
Getting Started
- What is WellXAI? WellXAI is the company behind ChatGiZa. It builds AI that's closer to people -- in the language they understand, at a price they can afford, and built with transparency.
- What is ChatGiZa? ChatGiZa is WellXAI's conversational AI assistant -- a chat app and an API, available at chatgiza.com.
- Is ChatGiZa free to use? Yes, you can start using ChatGiZa for free at chatgiza.com. For team or business use, see the Business page.

ChatGiZa App
- What languages does ChatGiZa support? Swahili, English, and code-switched conversation naturally, with more languages planned.
- Can I use ChatGiZa on my phone? Yes, in any mobile browser, and a native Android app is available from chatgiza.com.
- How do I sign in to ChatGiZa? Continue with Google, Apple, Microsoft, or company SSO at chatgiza.com to save chat history across devices.

Business & API
- How do I bring ChatGiZa to my company? Visit the Business page on wellxai.world, or email hello@wellxai.world.
- Where can I get API access? The Developers page on wellxai.world has details on the ChatGiZa API.

Privacy & Legal
- How is data handled? See the Privacy Policy for how ChatGiZa collects, uses, and protects data.
- Where are the Terms of Service? On the Terms page.

Contact
- How do I contact support? Email support@wellxai.world for account, billing, or ChatGiZa help.
- How do I reach the WellXAI team generally? Email hello@wellxai.world for general inquiries, partnerships, or business questions.
- Where can I get help getting started? Email help@wellxai.world for onboarding help and general questions.
`.trim();

const SUPPORT_CHAT_PROMPT =
  `You are AI-assisted support for WellXAI, embedded as a chat widget on the Help Center (support.wellxai.world). ` +
  `Answer only using the Help Center content below -- don't invent policies, prices, or features it doesn't cover. ` +
  `If the answer isn't in this content, say so plainly and point them to support@wellxai.world rather than guessing. ` +
  `Keep replies short and direct (2-5 sentences), plain text, no markdown headers.\n\n` +
  `Help Center content:\n${FAQ_CONTEXT}\n\n${COMPANY_IDENTITY_PROMPT}`;

type ChatTurn = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY && !process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json({ error: "Support chat is temporarily unavailable." }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const history = Array.isArray(body?.history) ? (body.history as ChatTurn[]) : [];

  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const chatMessages = [
    { role: "system" as const, content: SUPPORT_CHAT_PROMPT },
    ...history.slice(-10).map((t) => ({ role: t.role, content: t.content })),
    { role: "user" as const, content: message },
  ];

  const { default: OpenAI } = await import("openai");

  // Same primary-OpenAI/fallback-DeepSeek resilience as the main chat (see
  // src/lib/ai.ts) -- without it, an exhausted OpenAI quota takes this
  // widget down even while the fallback key is perfectly usable.
  if (process.env.OPENAI_API_KEY) {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await client.chat.completions.create({ model: MODELS.primary, messages: chatMessages });
      const reply = completion.choices[0]?.message?.content?.trim();
      if (reply) return NextResponse.json({ reply });
    } catch (err) {
      console.error("Support chat (OpenAI) failed, trying fallback:", err);
    }
  }

  if (process.env.DEEPSEEK_API_KEY) {
    try {
      const client = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: MODELS.fallbackBaseUrl });
      const completion = await client.chat.completions.create({ model: MODELS.fallback, messages: chatMessages });
      const reply = completion.choices[0]?.message?.content?.trim();
      if (reply) return NextResponse.json({ reply });
    } catch (err) {
      console.error("Support chat (DeepSeek fallback) failed:", err);
    }
  }

  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
