import type Anthropic from "@anthropic-ai/sdk";

// Translates between the OpenAI function-calling wire shape this codebase's
// coding-agent routes (/api/build/turn, /api/agent/turn) are built around --
// and the VS Code extension / BuildWorkspace client loops both expect back
// -- and Anthropic's own Messages API tool-use shape, so Claude (Opus 5)
// can slot in as a third fallback tier behind OpenAI/DeepSeek without
// either client needing to know or care which provider actually answered.

type OpenAiTool = {
  type: "function";
  function: { name: string; description?: string; parameters: Record<string, unknown> };
};

export function toAnthropicTools(tools: OpenAiTool[]): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters as Anthropic.Tool.InputSchema,
  }));
}

type OpenAiContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
type OpenAiToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
type OpenAiMessage =
  | { role: "user"; content: string | OpenAiContentPart[] }
  | { role: "assistant"; content: string | null; tool_calls?: OpenAiToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

function imageBlockFromDataUrl(url: string): Anthropic.ImageBlockParam | null {
  const match = /^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/.exec(url);
  if (!match) return null;
  return { type: "image", source: { type: "base64", media_type: match[1] as Anthropic.Base64ImageSource["media_type"], data: match[2] } };
}

// Anthropic requires tool results as content blocks inside a single
// user-role message (one block per tool_use in the preceding assistant
// turn), while OpenAI sends one separate {role:"tool"} message per call --
// so consecutive tool messages here get merged into one user turn.
export function toAnthropicMessages(messages: OpenAiMessage[]): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      if (typeof m.content === "string") {
        out.push({ role: "user", content: m.content });
      } else {
        const blocks: Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam> = [];
        for (const part of m.content) {
          if (part.type === "text") blocks.push({ type: "text", text: part.text });
          else {
            const img = imageBlockFromDataUrl(part.image_url.url);
            if (img) blocks.push(img);
          }
        }
        out.push({ role: "user", content: blocks });
      }
    } else if (m.role === "assistant") {
      const blocks: Array<Anthropic.TextBlockParam | Anthropic.ToolUseBlockParam> = [];
      if (m.content) blocks.push({ type: "text", text: m.content });
      for (const tc of m.tool_calls ?? []) {
        let input: unknown = {};
        try {
          input = JSON.parse(tc.function.arguments);
        } catch {
          // Malformed arguments -- Claude gets an empty input rather than
          // this whole turn failing to translate.
        }
        blocks.push({ type: "tool_use", id: tc.id, name: tc.function.name, input });
      }
      out.push({ role: "assistant", content: blocks });
    } else if (m.role === "tool") {
      const block: Anthropic.ToolResultBlockParam = { type: "tool_result", tool_use_id: m.tool_call_id, content: m.content };
      const last = out[out.length - 1];
      if (last?.role === "user" && Array.isArray(last.content) && last.content.every((b) => b.type === "tool_result")) {
        (last.content as Anthropic.ToolResultBlockParam[]).push(block);
      } else {
        out.push({ role: "user", content: [block] });
      }
    }
  }
  return out;
}

export function fromAnthropicResponse(
  content: Anthropic.ContentBlock[]
): { content: string | null; tool_calls?: OpenAiToolCall[] } {
  const textParts: string[] = [];
  const toolCalls: OpenAiToolCall[] = [];
  for (const block of content) {
    if (block.type === "text") textParts.push(block.text);
    else if (block.type === "tool_use") {
      toolCalls.push({
        id: block.id,
        type: "function",
        function: { name: block.name, arguments: JSON.stringify(block.input ?? {}) },
      });
    }
  }
  return {
    content: textParts.length > 0 ? textParts.join("\n\n") : null,
    tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
  };
}
