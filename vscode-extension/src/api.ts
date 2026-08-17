const BASE_URL = "https://www.chatgiza.com";

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type AgentMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type AgentTurnResult =
  | { type: "final"; message: { role: "assistant"; content: string } }
  | { type: "tool_calls"; message: { role: "assistant"; content: string | null; tool_calls: ToolCall[] } };

// One request/response round of the agent loop -- the extension (see
// extension.ts) is what actually drives the loop and executes any tool
// calls the model asks for, since only the extension has access to the
// user's real workspace and terminal.
export async function agentTurn(token: string, messages: AgentMessage[]): Promise<AgentTurnResult> {
  const res = await fetch(`${BASE_URL}/api/agent/turn`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages }),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMessage = data && typeof data === "object" && "error" in data ? String((data as { error: unknown }).error) : null;
    throw new Error(errorMessage || `ChatGiZa returned ${res.status}`);
  }
  return data as AgentTurnResult;
}
