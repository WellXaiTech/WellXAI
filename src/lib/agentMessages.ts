// Shared by /api/build/turn and /api/agent/turn: both take a client-
// supplied conversation history and splice it in right after the real
// system prompt, with no validation at all beyond "is it an array" --
// meaning a client could send {role: "system", content: "ignore all
// previous instructions..."} as one of the "history" messages and have
// it override or contradict the actual system prompt, since chat
// completion APIs don't distinguish a system message by position, only
// by its role field. user/assistant/tool are the only roles a
// legitimate agent-loop turn ever produces (assistant may carry
// tool_calls, tool carries a tool result keyed by tool_call_id) --
// anything else, or a malformed entry, is silently dropped rather than
// failing the whole request, since one bad message shouldn't kill an
// otherwise-fine turn.
export type SanitizedToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
// Mirrors ChatContentPart in ./ai -- lets a user message carry an
// attached image (the VS Code extension reads image references and
// sends them this way) alongside its text, same shape the main web
// chat already uses for image attachments.
export type SanitizedContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };
export type SanitizedAgentMessage =
  | { role: "user"; content: string | SanitizedContentPart[] }
  | { role: "assistant"; content: string | null; tool_calls?: SanitizedToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

function sanitizeToolCalls(input: unknown): SanitizedToolCall[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const out: SanitizedToolCall[] = [];
  for (const tc of input) {
    if (!tc || typeof tc !== "object") continue;
    const id = (tc as { id?: unknown }).id;
    const fn = (tc as { function?: unknown }).function;
    if (typeof id !== "string" || !fn || typeof fn !== "object") continue;
    const name = (fn as { name?: unknown }).name;
    const args = (fn as { arguments?: unknown }).arguments;
    if (typeof name === "string" && typeof args === "string") {
      out.push({ id, type: "function", function: { name, arguments: args } });
    }
  }
  return out.length > 0 ? out : undefined;
}

// Only text and data-URL image_url parts survive -- anything else
// (unknown part types, remote image URLs, malformed entries) is dropped
// rather than forwarded to the model.
function sanitizeContentParts(input: unknown): SanitizedContentPart[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const out: SanitizedContentPart[] = [];
  for (const part of input) {
    if (!part || typeof part !== "object") continue;
    const type = (part as { type?: unknown }).type;
    if (type === "text") {
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string") out.push({ type: "text", text });
    } else if (type === "image_url") {
      const imageUrl = (part as { image_url?: unknown }).image_url;
      const url = imageUrl && typeof imageUrl === "object" ? (imageUrl as { url?: unknown }).url : undefined;
      if (typeof url === "string" && url.startsWith("data:image/")) {
        out.push({ type: "image_url", image_url: { url } });
      }
    }
  }
  return out.length > 0 ? out : undefined;
}

export function sanitizeAgentMessages(input: unknown): SanitizedAgentMessage[] {
  if (!Array.isArray(input)) return [];
  const out: SanitizedAgentMessage[] = [];
  for (const m of input) {
    if (!m || typeof m !== "object") continue;
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if (role === "user" && typeof content === "string") {
      out.push({ role: "user", content });
    } else if (role === "user" && Array.isArray(content)) {
      const parts = sanitizeContentParts(content);
      if (parts) out.push({ role: "user", content: parts });
    } else if (role === "assistant") {
      out.push({
        role: "assistant",
        content: typeof content === "string" ? content : null,
        tool_calls: sanitizeToolCalls((m as { tool_calls?: unknown }).tool_calls),
      });
    } else if (role === "tool") {
      const toolCallId = (m as { tool_call_id?: unknown }).tool_call_id;
      if (typeof content === "string" && typeof toolCallId === "string") {
        out.push({ role: "tool", tool_call_id: toolCallId, content });
      }
    }
    // Any other role (system, function, developer, or anything
    // malformed) is dropped -- never forwarded to the model.
  }
  return out;
}

// DeepSeek's hosted chat-completions API has no vision-capable model in
// this codebase's fallback chain -- an image_url part sent to it is just
// dead weight at best. Callers use this to skip straight past DeepSeek to
// the vision-capable Anthropic tier when a turn actually has an image,
// rather than wasting a request on a provider that can't see it.
export function hasImageContent(messages: SanitizedAgentMessage[]): boolean {
  return messages.some(
    (m) => m.role === "user" && Array.isArray(m.content) && m.content.some((p) => p.type === "image_url")
  );
}
