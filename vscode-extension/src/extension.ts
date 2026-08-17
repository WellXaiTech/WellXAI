import * as vscode from "vscode";
import { agentTurn, type AgentMessage, type ToolCall } from "./api";
import { listDirectory, readFile, runTerminalCommand, searchWorkspace, writeFile } from "./tools";

const TOKEN_KEY = "chatgiza.token";
const MAX_AGENT_STEPS = 8;

async function getStoredToken(context: vscode.ExtensionContext): Promise<string | undefined> {
  return context.secrets.get(TOKEN_KEY);
}

async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "read_file":
      return readFile(String(args.path ?? ""));
    case "list_directory":
      return listDirectory(String(args.path ?? "."));
    case "search_workspace":
      return searchWorkspace(String(args.query ?? ""), !!args.isRegex);
    case "write_file":
      return writeFile(String(args.path ?? ""), String(args.content ?? ""));
    case "run_terminal_command":
      return runTerminalCommand(String(args.command ?? ""));
    default:
      return `Unknown tool "${name}".`;
  }
}

function safeParseArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

// Rebuilds the running conversation from VS Code's own chat history for
// this participant, rather than the extension keeping a separate copy --
// stays in sync with whatever the user sees in the chat panel (including
// after they delete/edit turns there) for free.
function historyToMessages(history: ReadonlyArray<vscode.ChatRequestTurn | vscode.ChatResponseTurn>): AgentMessage[] {
  const messages: AgentMessage[] = [];
  for (const turn of history) {
    if (turn instanceof vscode.ChatRequestTurn) {
      messages.push({ role: "user", content: turn.prompt });
    } else if (turn instanceof vscode.ChatResponseTurn) {
      const text = turn.response
        .map((part) => (part instanceof vscode.ChatResponseMarkdownPart ? part.value.value : ""))
        .join("");
      if (text.trim()) messages.push({ role: "assistant", content: text });
    }
  }
  return messages;
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("chatgiza.signIn", async () => {
      const openChoice = await vscode.window.showInformationMessage(
        "Sign in to ChatGiZa in your browser, generate a token, then come back and paste it here.",
        "Open chatgiza.com/vscode-auth"
      );
      if (openChoice) {
        await vscode.env.openExternal(vscode.Uri.parse("https://www.chatgiza.com/vscode-auth"));
      }
      const token = await vscode.window.showInputBox({
        prompt: "Paste your ChatGiZa token",
        password: true,
        ignoreFocusOut: true,
      });
      if (token?.trim()) {
        await context.secrets.store(TOKEN_KEY, token.trim());
        vscode.window.showInformationMessage("Signed in to ChatGiZa. Open chat and mention @chatgiza to start.");
      }
    }),
    vscode.commands.registerCommand("chatgiza.signOut", async () => {
      await context.secrets.delete(TOKEN_KEY);
      vscode.window.showInformationMessage("Signed out of ChatGiZa.");
    })
  );

  const handler: vscode.ChatRequestHandler = async (request, chatContext, stream, cancellationToken) => {
    const token = await getStoredToken(context);
    if (!token) {
      stream.markdown(
        "You're not signed in yet. Run **ChatGiZa: Sign In** from the Command Palette (Ctrl/Cmd+Shift+P) first."
      );
      return;
    }
    if (!vscode.workspace.workspaceFolders?.length) {
      stream.markdown("Open a project folder first (**File > Open Folder**) so I have somewhere to work.");
      return;
    }

    const messages = historyToMessages(chatContext.history);
    messages.push({ role: "user", content: request.prompt });

    for (let step = 0; step < MAX_AGENT_STEPS; step++) {
      if (cancellationToken.isCancellationRequested) return;

      let result;
      try {
        result = await agentTurn(token, messages);
      } catch (err) {
        stream.markdown(`⚠️ ${err instanceof Error ? err.message : "Something went wrong talking to ChatGiZa."}`);
        return;
      }

      if (result.type === "final") {
        stream.markdown(result.message.content || "(no response)");
        return;
      }

      const toolCalls: ToolCall[] = result.message.tool_calls;
      messages.push(result.message);

      for (const call of toolCalls) {
        if (cancellationToken.isCancellationRequested) return;
        const args = safeParseArgs(call.function.arguments);
        stream.progress(describeToolCall(call.function.name, args));
        let output: string;
        try {
          output = await executeTool(call.function.name, args);
        } catch (err) {
          output = `Error: ${err instanceof Error ? err.message : String(err)}`;
        }
        messages.push({ role: "tool", tool_call_id: call.id, content: output });
      }
    }

    stream.markdown(
      "\n\nStopped after several steps without a final answer -- try again, or break the task into smaller pieces."
    );
  };

  const participant = vscode.chat.createChatParticipant("chatgiza.agent", handler);
  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, "icon.png");
  context.subscriptions.push(participant);
}

function describeToolCall(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case "read_file":
      return `Reading ${args.path}…`;
    case "list_directory":
      return `Listing ${args.path || "."}…`;
    case "search_workspace":
      return `Searching for "${args.query}"…`;
    case "write_file":
      return `Writing ${args.path}…`;
    case "run_terminal_command":
      return `Running: ${args.command}`;
    default:
      return `Running ${name}…`;
  }
}

export function deactivate() {}
