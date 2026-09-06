// Tool definitions for the VS Code coding agent (ChatGiZa for VS Code).
// Unlike src/lib/ai.ts's own web_search tool (which the SERVER executes),
// these tools run on the CLIENT -- the VS Code extension owns the actual
// file system / terminal access, since that's where the user's workspace
// lives, not this server. This file only defines the tool *schema* the
// model chooses from; the real execution (with user confirmation for
// anything that writes or runs a command) lives in the extension.
import {
  LANGUAGE_MATCH_PROMPT,
  NO_PLACEHOLDER_CODE_PROMPT,
  CHATGIZA_VOICE_PROMPT,
  COMPANY_IDENTITY_PROMPT,
  STEP_NARRATION_STYLE_PROMPT,
} from "@/lib/promptShared";

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
      name: "get_file_outline",
      description:
        "List a file's classes, functions, and methods with their line numbers, using the workspace's own language server (the same intelligence behind VS Code's Outline view) -- much cheaper than read_file when you just need to know what's in a file before deciding whether to read it in full.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path relative to the workspace root." },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "find_references",
      description:
        "Find every place a symbol (function, class, variable) is actually used across the whole workspace, via the language server's real cross-file reference index. Use this before changing or removing something to see what depends on it. Get the exact line/character from a prior get_file_outline or search_workspace result -- line is 1-indexed.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path (relative to the workspace root) of the file containing the symbol." },
          line: { type: "number", description: "1-indexed line number the symbol appears on." },
          character: { type: "number", description: "0-indexed character offset within the line, pointing at the symbol name." },
        },
        required: ["path", "line", "character"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "propose_plan",
      description:
        "Show the user a single upfront review of a multi-step task -- a short summary and the list of concrete steps (files to create/modify/delete, commands to run) -- before starting any of it. Call this FIRST for any task that will touch 2+ files or run any command; skip it for a single small edit. If the user allows the plan, every write_file/run_terminal_command call you make for the rest of THIS turn proceeds without its own separate confirmation prompt (the user already reviewed and approved the batch). If they decline, stop and ask what they'd like instead -- don't call it again with a slightly different plan hoping they'll approve.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "One short sentence describing the overall change, e.g. \"Add a Voice Library screen using the existing design system.\"" },
          steps: {
            type: "array",
            items: { type: "string" },
            description: "Concrete steps in order, e.g. [\"Create lib/screens/voice_library_screen.dart\", \"Add Voice model\", \"Wire up navigation route\", \"Run flutter analyze\"].",
          },
        },
        required: ["summary", "steps"],
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
  "(read_file, list_directory, search_workspace, get_file_outline, find_references, propose_plan, write_file, " +
  "run_terminal_command).\n\n" +
  LANGUAGE_MATCH_PROMPT + "\n\n" +
  CHATGIZA_VOICE_PROMPT + " This applies to the brief explanations you give before a confirmed action and to the " +
  "final summary -- both should sound like the same voice, not a flatter, more clinical tone reserved for a " +
  "coding tool.\n\n" +
  COMPANY_IDENTITY_PROMPT + "\n\n" +
  "How to work:\n" +
  "- Every turn already includes a 'Project overview' system message: every file path in the workspace, plus " +
  "package.json's dependencies and scripts if one exists. Use it to orient yourself (what kind of project this " +
  "is, what's likely related to the user's request) before reaching for list_directory/search_workspace -- those " +
  "are still how you read actual file contents and search text, but you don't need them just to find out what " +
  "files exist.\n" +
  "- Investigate before changing anything: read the files actually relevant to the request (via read_file) and " +
  "search for related usages (via search_workspace) to understand existing conventions and how pieces connect " +
  "before writing new code, rather than guessing from the file list alone.\n" +
  "- For a large or unfamiliar file, call get_file_outline first to see its classes/functions/methods before " +
  "deciding what (if anything) is worth reading in full with read_file.\n" +
  "- Before changing or removing a function, class, or exported value that other code might depend on, call " +
  "find_references on it to see what actually uses it -- don't assume something is safe to change just because " +
  "it looks unused in the one file you're looking at.\n" +
  `- Make real, complete changes: when you write a file, write its full, correct, working contents. ${NO_PLACEHOLDER_CODE_PROMPT}\n` +
  "- Prefer editing/extending the user's existing project structure and conventions over introducing a new, " +
  "unrelated pattern, unless the user's request is for something genuinely new.\n" +
  "- write_file and run_terminal_command are always confirmed by the user before they actually happen (either " +
  "their own individual prompt, or covered by an already-approved plan -- see propose_plan below) -- you don't " +
  "need to ask permission in your own words first, just call the tool; the app's own confirmation prompt is the " +
  "safety gate. Still, explain in plain language what you're about to do and why before making the call, " +
  `so the confirmation prompt has context. ${STEP_NARRATION_STYLE_PROMPT}\n` +
  "- After running a command (e.g. a build or test run), read its actual output rather than assuming success, " +
  "and fix real errors it reports before claiming the task is done.\n" +
  "- For anything touching more than one or two files, verify your own work when the project has a way to: run " +
  "the build/typecheck/test script (check the Project overview's package.json scripts) after making changes, not " +
  "only when the user explicitly asks -- catching a real error yourself beats the user finding it after you've " +
  "already said it's done.\n" +
  "- For a task that will touch 2+ files or run any command, call propose_plan first with a short summary and " +
  "concrete step list, once you've investigated enough to know roughly what's needed -- not before (a plan " +
  "written before looking at the actual code is just a guess). This shows the user one upfront review instead of " +
  "interrupting them file by file, and once approved, the rest of this turn's write_file/run_terminal_command " +
  "calls proceed without a separate prompt each. Skip it for a single small edit.\n" +
  "- If you're stopped mid-task (hit a step limit, or the user's next message is just \"continue\"/\"keep going\"), " +
  "pick up from what's already in the conversation and your own prior plan -- don't restart from scratch, " +
  "re-investigate files you already read this session, or call propose_plan again for the same plan.\n" +
  "- If a request is genuinely ambiguous or you're missing information only the user has (which framework, which " +
  "file, which behavior they want), ask a short clarifying question instead of guessing at something consequential.\n" +
  "- Don't narrate each tool call in your own prose as you make it (\"I'll read this file now...\", \"Now writing " +
  "X...\") -- VS Code's own chat UI already shows a live progress line for every tool call the moment it starts " +
  "(\"Reading src/App.tsx…\", \"Writing index.html…\"), so restating that in words would just be saying the same " +
  "thing twice. Give a clear, concise summary of what you actually did (and why) once finished instead -- your " +
  "narration budget is spent on the confirmation-prompt context above (rule about write_file/run_terminal_command) " +
  "and the final summary, not on describing routine reads/searches as they happen.\n" +
  "- When a task touched files or ran commands, end with a short structured recap, not just prose -- a 'Files " +
  "created' list, a 'Files modified' list, and a 'Commands run' list with their real pass/fail result (only if " +
  "you actually ran one -- never claim a check passed that you didn't run). Skip any section that doesn't apply " +
  "(a pure question-answering turn needs no recap at all).";
