import { Sandbox } from "e2b";

// Real terminal execution for the Build page's virtual, browser-only file
// map -- E2B provisions an actual sandboxed Linux/Node environment per
// session (not a fake/simulated shell), so `npm install`/`npm test`/
// `npm run build` are genuinely run and their real output/exit code comes
// back, the same way the VS Code agent's run_terminal_command does against
// the user's real machine. Dormant (runInSandbox throws) until
// E2B_API_KEY is set -- see e2bConfigured().

const SANDBOX_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
// A running dev server gets no SDK-level traffic at all once it's live --
// the iframe's requests go straight to E2B's own host, bypassing our
// backend entirely -- so there's no "activity" for the sandbox to see and
// stay alive on its own. Timeout is set once, generously, at start time
// instead (see startDevServer) rather than the short idle window a one-shot
// command sandbox uses.
const DEV_SERVER_TIMEOUT_MS = 30 * 60 * 1000;
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

async function connectOrCreate(apiKey: string, existingSandboxId: string | undefined, timeoutMs: number): Promise<Sandbox> {
  if (existingSandboxId) {
    try {
      const sandbox = await Sandbox.connect(existingSandboxId, { apiKey });
      await sandbox.setTimeout(timeoutMs);
      return sandbox;
    } catch {
      // Expired/killed since the last call -- start a fresh one rather
      // than failing the whole request over a stale id.
    }
  }
  return Sandbox.create({ apiKey, timeoutMs });
}

// Shared by runInSandbox and startDevServer -- both need the project's
// current files pushed into the sandbox before running anything against
// them. Nothing is synced back out; write_file/replace_in_file/delete_file
// on the client side remain the only way to actually change project files.
async function syncFiles(sandbox: Sandbox, files: Record<string, string>): Promise<void> {
  const entries = Object.entries(files).map(([path, data]) => ({ path: `${PROJECT_DIR}/${path}`, data }));
  if (entries.length > 0) {
    await sandbox.files.write(entries);
  }
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

  const sandbox = await connectOrCreate(apiKey, existingSandboxId, SANDBOX_IDLE_TIMEOUT_MS);
  await syncFiles(sandbox, files);

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

// A genuinely live preview for a real multi-file/framework project -- runs
// the given command (normally "npm run dev") as a detached background
// process and returns its real public URL, instead of trying to fake a
// bundler in the browser the way the static/CDN-React preview does.
//
// Deliberately uses its OWN sandbox, never runInSandbox's/run_terminal_
// command's sandboxId: sandbox.setTimeout() sets an absolute future kill
// time, not an idle timer, so reusing the same sandbox would mean a later
// one-shot run_terminal_command call resets that timeout back down to
// SANDBOX_IDLE_TIMEOUT_MS (5 minutes) and silently kills the dev server out
// from under the user while they're still looking at the live iframe.
export async function startDevServer(
  files: Record<string, string>,
  command: string,
  port: number,
  existingSandboxId?: string
): Promise<{ url: string; sandboxId: string; port: number }> {
  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) throw new Error("Real dev server hosting isn't configured yet.");

  const sandbox = await connectOrCreate(apiKey, existingSandboxId, DEV_SERVER_TIMEOUT_MS);
  await syncFiles(sandbox, files);

  const handle = await sandbox.commands.run(command, { cwd: PROJECT_DIR, background: true });

  // background: true returns as soon as the process is spawned, not once
  // it's actually serving -- a real dev server takes a moment to boot (and
  // a bad command/missing dependency fails almost immediately), so give it
  // a beat, then confirm something is actually listening before handing
  // back a URL that would otherwise just show a blank/broken iframe with no
  // explanation. Not using the SDK's waitForPort/waitForURL helpers -- those
  // are Template.setStartCmd() build-time readiness checks, not usable
  // against a command already running on a live Sandbox instance.
  await new Promise((resolve) => setTimeout(resolve, 3000));
  if (handle.exitCode !== undefined) {
    const output = [handle.stdout, handle.stderr].filter(Boolean).join("\n").trim();
    throw new Error(
      `The dev server process exited immediately (exit code ${handle.exitCode}) instead of staying up.${
        output ? `\n\n${truncate(output)}` : ""
      }`
    );
  }
  const check = await sandbox.commands.run(`curl -sf -o /dev/null -w "%{http_code}" http://localhost:${port}`, {
    timeoutMs: 5000,
  });
  if (check.exitCode !== 0) {
    throw new Error(
      `Started the command, but nothing is responding on port ${port} yet -- it may still be starting, listening on a ` +
        `different port, or have failed silently. Check that the dev server is configured to listen on port ${port}.`
    );
  }

  return { url: `https://${sandbox.getHost(port)}`, sandboxId: sandbox.sandboxId, port };
}

// Keeps a live dev server's preview in sync with the project's real files
// after the initial start -- write_file/replace_in_file/delete_file only
// ever touch the in-memory file map (and GitHub/Vercel) on their own, so
// without this the dev-server iframe would silently go stale after the
// very first edit made once it's already running. A dev server's own file
// watcher (Vite, etc.) picks up the resynced files and hot-reloads the
// iframe on its own -- no extra plumbing needed on the client side.
export async function syncFilesToSandbox(sandboxId: string, files: Record<string, string>): Promise<void> {
  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) return;
  try {
    const sandbox = await Sandbox.connect(sandboxId, { apiKey });
    await syncFiles(sandbox, files);
  } catch {
    // Sandbox already expired/killed -- nothing to sync into, and nothing
    // useful to surface here either (this runs fire-and-forget from the
    // client's write_file/replace_in_file/delete_file path, same as
    // syncFilesToGithub/syncFilesToVercel already do).
  }
}
