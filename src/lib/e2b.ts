import { Sandbox } from "e2b";

// Real terminal execution for the Build page's virtual, browser-only file
// map -- E2B provisions an actual sandboxed Linux/Node environment per
// session (not a fake/simulated shell), so `npm install`/`npm test`/
// `npm run build` are genuinely run and their real output/exit code comes
// back, the same way the VS Code agent's run_terminal_command does against
// the user's real machine. Dormant (runInSandbox throws) until
// E2B_API_KEY is set -- see e2bConfigured().

const SANDBOX_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const COMMAND_TIMEOUT_MS = 60_000;
const MAX_OUTPUT_CHARS = 8000;
const PROJECT_DIR = "/home/user/project";

function truncate(text: string): string {
  if (text.length <= MAX_OUTPUT_CHARS) return text;
  return `${text.slice(0, MAX_OUTPUT_CHARS)}\n… (truncated, ${text.length - MAX_OUTPUT_CHARS} more characters)`;
}

export function e2bConfigured(): boolean {
  return !!process.env.E2B_API_KEY;
}

// Reuses an existing sandbox by id when given one (so a later `npm test`
// call sees the node_modules a prior `npm install` call already
// installed, instead of starting from nothing every time) -- falls back
// to creating a fresh one if the given id has already expired. The
// project's current files are re-synced into it on every call (cheap for
// the small sites Build makes, and guarantees the sandbox never runs
// stale content), but nothing is synced back out -- write_file/
// replace_in_file remain the only way to actually change project files;
// this is for running/verifying, not editing.
export async function runInSandbox(
  files: Record<string, string>,
  command: string,
  existingSandboxId?: string
): Promise<{ output: string; exitCode: number; sandboxId: string }> {
  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) throw new Error("Real terminal execution isn't configured yet.");

  let sandbox: Sandbox;
  if (existingSandboxId) {
    try {
      sandbox = await Sandbox.connect(existingSandboxId, { apiKey });
      await sandbox.setTimeout(SANDBOX_IDLE_TIMEOUT_MS);
    } catch {
      // Expired/killed since the last call -- start a fresh one rather
      // than failing the whole request over a stale id.
      sandbox = await Sandbox.create({ apiKey, timeoutMs: SANDBOX_IDLE_TIMEOUT_MS });
    }
  } else {
    sandbox = await Sandbox.create({ apiKey, timeoutMs: SANDBOX_IDLE_TIMEOUT_MS });
  }

  const entries = Object.entries(files).map(([path, data]) => ({ path: `${PROJECT_DIR}/${path}`, data }));
  if (entries.length > 0) {
    await sandbox.files.write(entries);
  }

  const result = await sandbox.commands.run(command, {
    cwd: PROJECT_DIR,
    timeoutMs: COMMAND_TIMEOUT_MS,
  });

  const parts: string[] = [];
  if (result.stdout.trim()) parts.push(`stdout:\n${truncate(result.stdout.trim())}`);
  if (result.stderr.trim()) parts.push(`stderr:\n${truncate(result.stderr.trim())}`);
  parts.push(`exit code: ${result.exitCode}`);

  return { output: parts.join("\n\n"), exitCode: result.exitCode, sandboxId: sandbox.sandboxId };
}
