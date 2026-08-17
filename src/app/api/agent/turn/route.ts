import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { AGENT_SYSTEM_PROMPT, AGENT_TOOLS } from "@/lib/agentTools";

// One turn of the coding-agent loop, driven by the VS Code extension (not
// this server) -- the extension owns tool execution, since it's the one
// with access to the user's actual workspace/terminal. This route is
// deliberately stateless and non-streaming: given the running message
// list (including any prior tool results the extension already
// appended), it makes exactly one model call and returns either the
// model's proposed tool call(s) for the extension to execute, or its
// final text answer. The extension calls this endpoint again after
// running any tools, appending the results, until it gets a "final".
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "ChatGiZa's coding agent isn't configured yet." }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const clientMessages = Array.isArray(body?.messages) ? body.messages : null;
  if (!clientMessages) {
    return NextResponse.json({ error: "messages array is required" }, { status: 400 });
  }

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const messages = [{ role: "system", content: AGENT_SYSTEM_PROMPT }, ...clientMessages];

    const completion = await client.chat.completions.create({
      model: "gpt-5.5",
      messages: messages as Parameters<typeof client.chat.completions.create>[0]["messages"],
      tools: AGENT_TOOLS,
      tool_choice: "auto",
    });

    const message = completion.choices[0]?.message;
    if (!message) {
      return NextResponse.json({ error: "No response from the model." }, { status: 502 });
    }

    if (message.tool_calls?.length) {
      return NextResponse.json({
        type: "tool_calls",
        message: { role: "assistant", content: message.content, tool_calls: message.tool_calls },
      });
    }

    return NextResponse.json({
      type: "final",
      message: { role: "assistant", content: message.content ?? "" },
    });
  } catch (err) {
    console.error("Agent turn error:", err);
    const errMessage = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
