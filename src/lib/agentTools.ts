// Tool definitions for the VS Code coding agent (ChatGiZa for VS Code).
// Unlike src/lib/ai.ts's own web_search tool (which the SERVER executes),
// these tools run on the CLIENT -- the VS Code extension owns the actual
// file system / terminal access, since that's where the user's workspace
// lives, not this server. This file only defines the tool *schema* the
// model chooses from; the real execution (with user confirmation for
// anything that writes or runs a command) lives in the extension.
export const AGENT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "read_file",
      description: "Read the full text contents of a file in the user's open workspace.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path relative to the workspace root, e.g. \"src/index.ts\"." },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_directory",
      description: "List files and subdirectories at a path in the user's open workspace.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path relative to the workspace root, e.g. \".\" or \"src\"." },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_workspace",
      description: "Search the workspace's text files for a literal string or regular expression, returning matching file paths and line numbers.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Text or regex pattern to search for." },
          isRegex: { type: "boolean", description: "Whether `query` should be treated as a regular expression. Defaults to false." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "write_file",
      description:
        "Create a new file or overwrite an existing file's full contents in the user's workspace. The user is always shown a confirmation prompt before this actually happens, so it's safe to propose changes here.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path relative to the workspace root." },
          content: { type: "string", description: "The complete new contents of the file (not a diff/patch)." },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "run_terminal_command",
      description:
        "Run a shell command in the workspace's root directory (e.g. `npm install`, `npm run build`, `git status`). The user is always shown the exact command and must approve it before it runs, so it's safe to propose one here. Output (stdout/stderr) is truncated if very long.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "The exact shell command to run." },
        },
        required: ["command"],
      },
    },
  },
];

export const AGENT_SYSTEM_PROMPT =
  "You are ChatGiZa acting as a coding agent inside VS Code. You help the user build, modify, debug, and understand " +
  "real websites and applications directly in their open workspace, using the tools available to you " +
  "(read_file, list_directory, search_workspace, write_file, run_terminal_command).\n\n" +
  "How to work:\n" +
  "- Investigate before changing anything: use read_file/list_directory/search_workspace to understand the " +
  "existing project structure, conventions, and relevant code before writing new code, rather than guessing.\n" +
  "- Make real, complete changes: when you write a file, write its full, correct, working contents -- not a " +
  "sketch, not placeholder comments like \"// rest of the code here\", not pseudocode.\n" +
  "- Prefer editing/extending the user's existing project structure and conventions over introducing a new, " +
  "unrelated pattern, unless the user's request is for something genuinely new.\n" +
  "- write_file and run_terminal_command are always confirmed by the user before they actually happen -- you " +
  "don't need to ask permission in your own words first, just call the tool; the app's own confirmation prompt " +
  "is the safety gate. Still, explain in plain language what you're about to do and why before making the call, " +
  "so the confirmation prompt has context.\n" +
  "- After running a command (e.g. a build or test run), read its actual output rather than assuming success, " +
  "and fix real errors it reports before claiming the task is done.\n" +
  "- If a request is genuinely ambiguous or you're missing information only the user has (which framework, which " +
  "file, which behavior they want), ask a short clarifying question instead of guessing at something consequential.\n" +
  "- Give a clear, concise summary of what you actually did (and why) once finished -- not a step-by-step " +
  "narration of every tool call as you make it.";
