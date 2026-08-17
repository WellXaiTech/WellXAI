import * as vscode from "vscode";
import { exec } from "child_process";

const MAX_OUTPUT_CHARS = 8000;
const COMMAND_TIMEOUT_MS = 60_000;

function truncate(text: string, max = MAX_OUTPUT_CHARS): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n… (truncated, ${text.length - max} more characters)`;
}

function workspaceRoot(): vscode.WorkspaceFolder {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    throw new Error("No folder is open in this VS Code window -- open a project folder first.");
  }
  return folders[0];
}

// Resolves a model-provided relative path against the workspace root,
// refusing anything that would escape it (e.g. "../../etc/passwd") --
// the model only ever sees paths relative to the open workspace, and
// this is the one place that boundary is actually enforced.
function resolveWorkspacePath(relativePath: string): vscode.Uri {
  const root = workspaceRoot();
  const uri = vscode.Uri.joinPath(root.uri, relativePath);
  if (!uri.fsPath.startsWith(root.uri.fsPath)) {
    throw new Error(`Path "${relativePath}" resolves outside the open workspace.`);
  }
  return uri;
}

export async function readFile(relativePath: string): Promise<string> {
  const uri = resolveWorkspacePath(relativePath);
  const bytes = await vscode.workspace.fs.readFile(uri);
  return truncate(Buffer.from(bytes).toString("utf-8"));
}

export async function listDirectory(relativePath: string): Promise<string> {
  const uri = resolveWorkspacePath(relativePath || ".");
  const entries = await vscode.workspace.fs.readDirectory(uri);
  if (entries.length === 0) return "(empty directory)";
  return entries
    .map(([name, type]) => `${type === vscode.FileType.Directory ? "[dir] " : "      "}${name}`)
    .join("\n");
}

const SEARCH_MAX_FILES = 500;
const SEARCH_MAX_MATCHES = 200;
const SEARCH_MAX_FILE_BYTES = 1_000_000;
const NUL_CHAR = String.fromCharCode(0);

// Built on workspace.findFiles + manual matching rather than the proposed
// (non-stable) workspace.findTextInFiles API -- that one isn't part of
// the stable extension API surface most users' VS Code installs expose,
// so relying on it would silently break for anyone not running with
// proposed APIs enabled. Slower, but works everywhere.
export async function searchWorkspace(query: string, isRegex: boolean): Promise<string> {
  const root = workspaceRoot();
  let pattern: RegExp;
  try {
    pattern = isRegex ? new RegExp(query, "g") : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  } catch (err) {
    return `Invalid search pattern: ${err instanceof Error ? err.message : String(err)}`;
  }

  const files = await vscode.workspace.findFiles(
    new vscode.RelativePattern(root, "**/*"),
    "**/{node_modules,.git,dist,build,out,.next}/**",
    SEARCH_MAX_FILES
  );

  const results: string[] = [];
  for (const uri of files) {
    if (results.length >= SEARCH_MAX_MATCHES) break;
    let stat: vscode.FileStat;
    try {
      stat = await vscode.workspace.fs.stat(uri);
    } catch {
      continue;
    }
    if (stat.type !== vscode.FileType.File || stat.size > SEARCH_MAX_FILE_BYTES) continue;

    let text: string;
    try {
      text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf-8");
    } catch {
      continue;
    }
    if (text.includes(NUL_CHAR)) continue;

    const relPath = vscode.workspace.asRelativePath(uri, false);
    const lines = text.split("\n");
    for (let i = 0; i < lines.length && results.length < SEARCH_MAX_MATCHES; i++) {
      pattern.lastIndex = 0;
      if (pattern.test(lines[i])) {
        results.push(`${relPath}:${i + 1}: ${lines[i].trim()}`);
      }
    }
  }

  if (results.length === 0) return "No matches found.";
  return truncate(results.join("\n"));
}

// write_file and run_terminal_command are the two tools that actually
// change something on the user's machine -- both always show a real
// confirmation prompt naming the exact change/command before doing
// anything, and return a clear "cancelled by user" result (not an
// error) if declined, so the model can react sensibly instead of
// retrying blindly.
export async function writeFile(relativePath: string, content: string): Promise<string> {
  const uri = resolveWorkspacePath(relativePath);
  let existed = true;
  try {
    await vscode.workspace.fs.stat(uri);
  } catch {
    existed = false;
  }

  const choice = await vscode.window.showWarningMessage(
    `ChatGiZa wants to ${existed ? "overwrite" : "create"} "${relativePath}". Allow?`,
    { modal: true },
    "Allow"
  );
  if (choice !== "Allow") {
    return `The user declined to ${existed ? "overwrite" : "create"} "${relativePath}". Do not write this file; ask the user what they'd like instead if relevant.`;
  }

  await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf-8"));
  try {
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, { preview: false });
  } catch {
    // Opening the file for the user to see is a nice-to-have, not
    // essential -- the write itself already succeeded above.
  }
  return `${existed ? "Overwrote" : "Created"} "${relativePath}" (${content.length} characters).`;
}

export async function runTerminalCommand(command: string): Promise<string> {
  const root = workspaceRoot();
  const choice = await vscode.window.showWarningMessage(
    `ChatGiZa wants to run this command in "${root.name}":\n${command}`,
    { modal: true },
    "Run"
  );
  if (choice !== "Run") {
    return `The user declined to run: ${command}`;
  }

  return new Promise((resolve) => {
    exec(
      command,
      { cwd: root.uri.fsPath, timeout: COMMAND_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const parts: string[] = [];
        if (stdout.trim()) parts.push(`stdout:\n${truncate(stdout.trim())}`);
        if (stderr.trim()) parts.push(`stderr:\n${truncate(stderr.trim())}`);
        if (error) parts.push(`exit code: ${error.code ?? "unknown"}${error.killed ? " (timed out)" : ""}`);
        resolve(parts.length > 0 ? parts.join("\n\n") : "(command produced no output)");
      }
    );
  });
}
