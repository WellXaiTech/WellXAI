"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SetInstructionsModal from "@/components/SetInstructionsModal";

const CHATGIZA_GUIDE_MD = `# ChatGiZa guide

## General tips for effective prompting

### 1. Be clear and specific

- Clearly state your task or question at the beginning of your message.
- Provide context and details to help ChatGiZa understand your needs.
- Break complex tasks into smaller, manageable steps.

Bad prompt:
<prompt>
"Help me with a presentation."
</prompt>

Good prompt:
<prompt>
"I need help creating a 10-slide presentation for our quarterly sales meeting. The presentation should cover our Q2 sales performance, top-selling products, and sales targets for Q3. Please provide an outline with key points for each slide."
</prompt>

Why it's better: the good prompt gives specific details about the task, including the number of slides, the purpose of the presentation, and the topics to cover.

### 2. Use examples

- Provide examples of the kind of output you're looking for.
- If you want a specific format or style, show ChatGiZa an example.

Bad prompt:
<prompt>
"Write a professional email."
</prompt>

Good prompt:
<prompt>
"I need to write a professional email to a client about a project delay. Here's a similar email I've sent before:

'Dear [Client], I hope this email finds you well. I wanted to update you on the progress of [Project Name]. Unfortunately, we've encountered an unexpected issue that will delay our completion date by approximately two weeks. We're working diligently to resolve this and will keep you updated on our progress. Please let me know if you have any questions or concerns.'

Please write a new email in a similar tone for a two-week delay on our current website redesign project."
</prompt>

### 3. Break big tasks into steps

Long tasks (research, multi-file code changes, a full itinerary) go better as a short back-and-forth than one giant prompt. Ask for an outline first, review it, then ask ChatGiZa to fill in each section.

## Choosing a model

- **GiZa 5.6** -- fast, good default for everyday chat, drafting, and quick questions.
- **GiZa Pro** -- more capable for harder reasoning, longer documents, and code.
- **Deep Think** -- takes longer but reasons more carefully before answering; use it for tricky math, planning, or debugging.

Switch models any time from the model menu in the composer -- you don't need to start a new chat to change it.

## Projects

Projects group related chats together so context doesn't get lost between them:

- **Instructions** -- standing guidance every chat in the project follows automatically (tone, format, constraints).
- **Memory** -- things ChatGiZa remembers about this project over time, visible only to you.
- **Context** -- documents or text every chat in the project can reference, like this guide.
- **Automations** -- recurring tasks scoped to the project.

## Browse

Open the globe icon inside a chat to search the web or preview a page without leaving the conversation. Typing a word or phrase searches; typing a URL tries to preview that page directly.

## Scheduled tasks

Set up a prompt to run automatically -- a daily summary, a recurring reminder -- from a project or the sidebar's Automations page. ChatGiZa sends the result the same way it would if you'd asked in chat.

## Code

Switch to the Code tab to have ChatGiZa build and preview small apps or scripts directly, iterating on the same project without losing the conversation history.

## A few habits that help

1. Say what "done" looks like -- a word count, a file format, a specific outcome -- so ChatGiZa can check its own work.
2. If a reply misses the mark, say specifically what's wrong rather than just "try again" -- it steers the next attempt much better.
3. For anything you'll reuse (a tone, a template, a set of rules), put it in the project's Instructions once instead of repeating it every message.

## Uploading files and documents

You can attach PDFs, spreadsheets, code files, or plain text to a chat, or to a project's Context so every chat inside it can see the file automatically.

- For a one-off question about a single document, attach it directly in the chat.
- For something you'll reference across many conversations (a style guide, a dataset, product docs), add it to the project's Context instead.
- Ask ChatGiZa to summarize a long document first if you only need the highlights before diving into detail.

### 4. Assign a role when it helps

Telling ChatGiZa to act as a specific kind of expert can sharpen the tone and level of detail of a reply, especially for specialized topics.

Bad prompt:
<prompt>
"Explain this contract clause."
</prompt>

Good prompt:
<prompt>
"You are a contracts lawyer reviewing this clause for a small business owner with no legal background. Explain what it means in plain language, flag anything unusually risky, and suggest two questions I should ask before signing."
</prompt>

### 5. Ask for the format you actually want

If you need a table, a numbered list, a specific heading structure, or a particular length, say so up front rather than after the fact -- it saves a round of edits.

Bad prompt:
<prompt>
"Compare these three plans."
</prompt>

Good prompt:
<prompt>
"Compare these three pricing plans in a markdown table with columns for Price, Storage, and Support. Keep each cell to one short sentence. Add a one-line recommendation below the table for a small team of five."
</prompt>

## A worked example: analyzing a report

Longer, structured prompts work well when you want ChatGiZa to move through several steps in one pass instead of a full back-and-forth. Here's a realistic example for a business report:

<prompt>
"Act as a financial analyst reviewing our Q2 results, attached as a PDF. Please do the following:

1. Revenue overview:
   - Summarize total revenue and how it compares to Q1
   - Call out the three largest contributors to the change

2. Cost breakdown:
   - Identify the categories where spending grew fastest
   - Flag anything that looks like a one-time cost versus a recurring one

3. Margin analysis:
   - Calculate gross margin and compare it to the prior quarter
   - Explain what's driving the change in plain language

4. Segment performance:
   - Break results down by our three main product lines
   - Note which segment is over- or under-performing relative to plan

5. Risks and follow-ups:
   - List three risks this data suggests for Q3
   - Suggest two follow-up questions I should bring to the leadership meeting

Use a table for the segment breakdown. Keep the rest in short paragraphs. Finish with a two-sentence summary I could read out loud at the start of the meeting."
</prompt>

Why it's better: it gives ChatGiZa a role, a clear numbered structure, a specific output format for one section, and a concrete final deliverable -- so the reply comes back organized and ready to use instead of one long undifferentiated block of text.

## Iterating with follow-ups

Most real work happens over several messages, not one perfect prompt:

- Ask for an outline first on anything long, review it, then say "expand section 2" rather than regenerating everything.
- If a reply is close but the tone is off, say so directly: "same content, but more casual" or "cut this by half."
- You can always ask ChatGiZa to keep everything the same and change one specific thing -- it doesn't need to start over.

## Common mistakes to avoid

- **Vague asks.** "Make this better" gives ChatGiZa nothing to aim for -- say what specifically should change.
- **Burying the real question.** Put the actual task first, background second, so it isn't missed in a long message.
- **Re-explaining context every message.** If it's project-wide, put it in Instructions once instead.
- **Accepting the first draft as final.** Treat the first reply as a starting point -- a second, more specific pass usually gets noticeably closer to what you wanted.

## Frequently asked questions

**Can I switch models mid-conversation?**
Yes -- switching models keeps the conversation history, so you can start on GiZa 5.6 and move to Deep Think for a harder follow-up question without losing context.

**Does ChatGiZa remember earlier chats?**
Only within a project's Memory, and only for chats inside that same project. Chats outside a project don't share memory with each other.

**What happens if I remove a chat from a project?**
The chat itself isn't deleted -- it just stops being grouped under that project and no longer sees its Instructions or Context.

**Can automations post directly to me outside the app?**
Scheduled tasks run inside ChatGiZa and can trigger a browser notification when due; check the Scheduled page for a task's history and next run time.

## Writing and debugging code with ChatGiZa

Code questions go faster when ChatGiZa can see the actual error and the relevant file, not just a description of the problem.

### Asking for a fix

Bad prompt:
<prompt>
"My code doesn't work."
</prompt>

Good prompt:
<prompt>
"This function should return the total price after discount, but it always returns 0. Here's the function and the error I get when I call it with (100, 0.2):

\`\`\`js
function applyDiscount(price, rate) {
  let total = price - price * rate
  return total
}
\`\`\`

Error: none, but the returned value is always 0. What's wrong, and how should I fix it?"
</prompt>

Why it's better: it includes the actual code, the exact input used, and what happened versus what was expected -- ChatGiZa doesn't have to guess at any of that.

### Asking for a whole feature

For anything bigger than a one-line fix, describe the feature, the constraints, and any existing patterns to follow:

<prompt>
"Add a search box to this React component that filters the existing 'items' array by name as the user types. Requirements:
- Debounce input so it doesn't filter on every keystroke
- Keep it in the same file, no new dependencies
- Match the existing Tailwind classes used elsewhere in this file for inputs
- Show 'No results' when the filter matches nothing"
</prompt>

### Reviewing code

Paste a function or file and ask specific questions rather than a generic "review this":

<prompt>
"Review this function for edge cases I might have missed -- specifically what happens with an empty array, a negative number, and a very large input."
</prompt>

## Working with images and screenshots

Attach a screenshot or photo directly in the chat when it's faster to show than describe -- a design to match, an error dialog, a chart to interpret, or handwriting to transcribe. Say what you want done with it (match this layout, extract this table, explain this error) rather than just attaching it with no instruction.

## Research and long documents

For research-style questions, ask ChatGiZa to cite what it used to answer, and to say plainly when it isn't sure rather than filling gaps with guesses:

<prompt>
"Summarize the current thinking on [topic]. For each claim, note whether it's well established or still debated, and flag anything you're not confident about instead of presenting it as settled."
</prompt>

For a long document you've attached, ask for a structured pass instead of one long summary:

<prompt>
"Read the attached report and give me: (1) a 3-sentence summary, (2) the five most important findings as bullets, (3) anything that contradicts our current assumptions, (4) open questions the report doesn't answer."
</prompt>

## Privacy and data

- Chats and project Context are visible only to your account unless you explicitly share a conversation.
- Memory is scoped per project -- it doesn't leak into unrelated projects or other people's accounts.
- Deleting a project removes its Instructions and Context; chats that were inside it are not deleted, only ungrouped.

## Troubleshooting

**A reply got cut off.** Ask ChatGiZa to continue from where it stopped rather than repeating the whole prompt.

**The model seems to have lost earlier context.** Very long conversations can push early messages out of what the model actively weighs -- start a fresh chat for a new topic, or move recurring context into the project's Instructions so it isn't dependent on scroll-back.

**A scheduled task didn't run.** Check the Scheduled page -- tasks show their last run time and whether notifications are enabled for this browser.

**Browse isn't showing a page.** Some sites block being previewed this way; try searching for the topic instead, or open the site directly in a new tab.

## Quick reference

| Feature | Where to find it | What it's for |
| --- | --- | --- |
| Model switcher | Composer, bottom of the chat | Pick GiZa 5.6, GiZa Pro, or Deep Think |
| Projects | Sidebar | Group chats with shared Instructions and Context |
| Browse | Globe icon in a chat | Search the web or preview a page |
| Automations | Sidebar / project | Recurring prompts on a schedule |
| Code | Top tab | Build and preview small apps or scripts |
| Artifacts | Chat responses | Documents, code, or diagrams ChatGiZa produces you can view and reuse |

That's the whole guide -- reply in this chat any time with a real task and ChatGiZa will apply what's here automatically, since it's attached as this project's Context.

## Working across projects

If a task genuinely spans two areas (e.g. a client project that also needs general research), it's fine to keep it in whichever project has the more relevant Context and just paste in the extra detail the other one would have provided -- Instructions and Context don't carry over between projects automatically, and that's by design so one project's setup never leaks into another's.

## Naming and organizing projects

- Give a project a name you'll recognize a month from now, not just today -- "Q3 launch" ages better than "New project."
- Pin the few projects you use daily so they stay at the top of the sidebar instead of getting buried under one-off chats.
- Archive a project instead of deleting it if you might reopen it later; deleting removes its Instructions and Context for good.

## Giving feedback that actually improves the next reply

- Point at the specific line or claim that's wrong rather than "this is inaccurate."
- If length is the issue, give a number: "half this length" is more useful than "shorter."
- If you liked an earlier reply's structure, say so explicitly and ask ChatGiZa to reuse it -- it won't guess which past reply you mean otherwise.

## When to start a new chat instead of continuing

A fresh chat helps when the topic has genuinely changed, when a conversation has grown very long and feels like it's forgetting earlier details, or when you want a clean slate to compare two different approaches side by side. Staying in the same chat helps when you're iterating on the same piece of work -- code, a document, a plan -- since ChatGiZa can see exactly what it produced before.
`;

export type Project = { id: string; name: string; createdAt?: number; pinned?: boolean; description?: string };
type ConversationSummary = { id: string; title: string; projectId?: string };

const FolderIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </svg>
);

const SmallCloseIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const EyeIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const CodeViewIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m16 18 6-6-6-6" />
    <path d="m8 6-6 6 6 6" />
  </svg>
);

const SearchIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);

const ChevronDownIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const TrashIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="m19.5 5.5l-.62 10.025c-.158 2.561-.237 3.842-.88 4.763a4 4 0 0 1-1.2 1.128c-.957.584-2.24.584-4.806.584c-2.57 0-3.855 0-4.814-.585a4 4 0 0 1-1.2-1.13c-.642-.922-.72-2.205-.874-4.77L4.5 5.5M3 5.5h18m-4.944 0l-.683-1.408c-.453-.936-.68-1.403-1.071-1.695a2 2 0 0 0-.275-.172C13.594 2 13.074 2 12.035 2c-1.066 0-1.599 0-2.04.234a2 2 0 0 0-.278.18c-.395.303-.616.788-1.058 1.757L8.053 5.5m1.447 11v-6m5 6v-6" />
  </svg>
);

const PinIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 17v5" />
    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
  </svg>
);

const WaveHandIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
    <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
    <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </svg>
);

const MoreIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

const PlusIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const ArrowUpIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V5" />
    <path d="m5 12 7-7 7 7" />
  </svg>
);

const MicIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 19v2m0-2a7 7 0 0 1-6.93-6M12 19a7 7 0 0 0 6.929-6M12 16a4 4 0 0 1-4-4V7a4 4 0 1 1 8 0v5a4 4 0 0 1-4 4Z" />
  </svg>
);

// Context card's "+" menu -- Upload from device / Add text content / GitHub.
const PaperclipIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551" />
  </svg>
);

const TextContentIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
    <path d="M14 2v5a1 1 0 0 0 1 1h5" />
    <path d="M10 9H8" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
  </svg>
);

// Model-selector menu -- current pick gets this instead of a row icon.
const ModelCheckIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const GitHubIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.221-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.269 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.295 2.747-1.026 2.747-1.026.546 1.378.202 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.744 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
  </svg>
);

const EmptyChatIcon = (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const LockIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

// One right-column card (Instructions/Memory/Context/Scheduled) -- none of
// these have real functionality behind them yet (no per-project
// instructions field, no memory pipeline, no file/context storage, no
// scheduling), so every "+" here is the same honest "coming soon" toast
// every other not-yet-built control in this app already uses, rather than
// looking wired up and silently doing nothing. Context's "+" is the one
// exception -- it opens a real menu (matching the reference) whose three
// items each still land on that same toast, since there's nothing to
// actually upload/connect to yet.
// Minimal markdown-aware coloring for the guide's raw-source view -- just
// enough to tell headings, emphasis, and <prompt> tags apart at a glance,
// without pulling in a full syntax-highlighter dependency for one file.
function highlightMarkdownLine(line: string, key: number) {
  if (/^#{1,6}(\s|$)/.test(line)) {
    return (
      <span key={key} className="text-fuchsia-400">
        {line}
      </span>
    );
  }
  if (/^<\/?prompt>$/.test(line.trim())) {
    return (
      <span key={key} className="text-sky-400">
        {line}
      </span>
    );
  }
  if (/^\s*\|.*\|\s*$/.test(line)) {
    return (
      <span key={key} className="text-emerald-400">
        {line}
      </span>
    );
  }
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span key={key}>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <span key={i} className="text-amber-300">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

function InfoCard({
  title,
  hint,
  badge,
  onAdd,
  dropzone,
  menuItems,
}: {
  title: string;
  hint: string;
  badge?: string;
  onAdd: () => void;
  dropzone?: boolean;
  menuItems?: { label: string; icon: React.ReactNode; onClick: () => void }[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const handleAddClick = menuItems ? () => setMenuOpen((v) => !v) : onAdd;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {badge ? (
          <span className="flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
            {LockIcon}
            {badge}
          </span>
        ) : (
          <div className="relative">
            <button
              onClick={handleAddClick}
              aria-label={`Add ${title.toLowerCase()}`}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              {PlusIcon}
            </button>
            {menuOpen && menuItems && (
              <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-border bg-surface p-1 shadow-lg">
                {menuItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setMenuOpen(false);
                      item.onClick();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-surface-2"
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {dropzone ? (
        <button
          onClick={handleAddClick}
          className="mt-3 flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border px-3 py-12 text-center text-xs text-muted transition-colors hover:bg-surface-2"
        >
          {hint}
        </button>
      ) : (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

const EmptyProjectsIcon = (
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
    <rect x="4" y="4" width="20" height="20" rx="2" />
    <rect x="28" y="4" width="20" height="20" rx="2" />
    <rect x="4" y="28" width="20" height="20" rx="2" />
    <rect x="30" y="30" width="14" height="14" rx="2" fill="currentColor" stroke="none" />
    <path
      d="M38 27L38 45L42 41L45 48L48.5 46.5L45.5 39.5L50 38Z"
      fill="currentColor"
      stroke="currentColor"
      strokeLinejoin="round"
    />
  </svg>
);

// A real (not persisted) project so "How to use ChatGiZa" reuses the exact
// same detail view as any other project -- title, composer, Instructions/
// Memory/Context/Scheduled cards -- rather than a bespoke modal, matching
// how the reference's own example project is just a project like any other.
const HOW_TO_PROJECT_ID = "how-to-use-chatgiza";
const howToProject: Project = {
  id: HOW_TO_PROJECT_ID,
  name: "How to use ChatGiZa",
  description:
    "An example project that also doubles as a how-to guide for using ChatGiZa. Chat with it to learn more about how to get the most out of chatting with ChatGiZa!",
};

type SortMode = "updated" | "name";

export default function ProjectsPanel({
  projects,
  conversations,
  onClose,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onTogglePinProject,
  onAssign,
  onSelectConversation,
  onStartChatInProject,
  onOpenComingSoon,
  initialProjectId,
}: {
  projects: Project[];
  conversations: ConversationSummary[];
  onClose: () => void;
  onCreateProject: (id: string, name: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
  onTogglePinProject: (id: string) => void;
  onAssign: (conversationId: string, projectId: string | null) => void;
  onSelectConversation: (id: string) => void;
  onStartChatInProject: (projectId: string, initialText: string) => void;
  onOpenComingSoon: (title: string) => void;
  // Set when opened from the sidebar's own pinned-project row -- jumps
  // straight into that project's detail view instead of the grid.
  initialProjectId?: string | null;
}) {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(initialProjectId ?? null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [projectDraft, setProjectDraft] = useState("");
  // Was a static "Chat" label + an inert "Work" button -- clicking Work
  // never actually moved the highlighted pill over to it. A real toggle
  // now, even though Work itself still does nothing behind it.
  const [composerMode, setComposerMode] = useState<"chat" | "work">("chat");
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);
  const [folderQuery, setFolderQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("updated");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [howToOpen, setHowToOpen] = useState(false);
  const [guideViewMode, setGuideViewMode] = useState<"preview" | "code">("preview");

  const activeConversations = conversations.filter((c) => c.projectId === activeProjectId);
  const activeProject =
    activeProjectId === HOW_TO_PROJECT_ID ? howToProject : projects.find((p) => p.id === activeProjectId);

  const filteredProjects = projects
    .filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) =>
      sortMode === "name" ? a.name.localeCompare(b.name) : (b.createdAt ?? 0) - (a.createdAt ?? 0)
    );

  function handleNewProject() {
    const id = crypto.randomUUID();
    onCreateProject(id, "New project");
    setActiveProjectId(id);
    setTitleValue("New project");
    setEditingTitle(true);
  }

  function commitTitle() {
    setEditingTitle(false);
    if (activeProjectId && titleValue.trim()) {
      onRenameProject(activeProjectId, titleValue.trim());
    }
  }

  function handleStart() {
    if (!activeProjectId) return;
    onStartChatInProject(activeProjectId, projectDraft);
    setProjectDraft("");
  }

  return (
    // Used to be inset-0 -- a full-viewport overlay that hid the sidebar
    // (and its own chat history list) entirely behind it. Offsetting the
    // left edge past the sidebar's own width on desktop keeps it visible,
    // matching the reference where opening a project never covers it.
    // (Doesn't yet account for the sidebar's own collapsed-to-a-rail
    // state, which lives as local state inside ChatSidebar -- a real but
    // minor gap next to always fully hiding it.)
    <div className="fixed inset-y-0 right-0 left-0 z-50 flex flex-col bg-background sm:left-[var(--sidebar-width)]">
      {/* Only shown for the grid -- a project's own detail view has no
          back/close button or divider line at all now (matching the
          reference, which relies on the "Projects" breadcrumb inside the
          body instead), so this whole bar just doesn't render there. */}
      {!activeProjectId && (
      <div className="flex items-center justify-between px-6 py-6 sm:px-10">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl">Projects</h1>
        </div>

        {
          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              {searchOpen && (
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onBlur={() => !query && setSearchOpen(false)}
                  placeholder="Search projects"
                  className="mr-1 w-40 rounded-full border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-foreground/40"
                />
              )}
              <button
                onClick={() => setSearchOpen((v) => !v)}
                aria-label="Search projects"
                className="rounded-full bg-surface-2 p-2 text-foreground transition-colors hover:bg-surface"
              >
                {SearchIcon}
              </button>
            </div>

            <div className="relative">
              <button
                onClick={() => setSortMenuOpen((v) => !v)}
                className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface"
              >
                Sort by <span className="font-semibold text-foreground">{sortMode === "name" ? "Name" : "Last updated"}</span>
                {ChevronDownIcon}
              </button>
              {sortMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-xl border border-border bg-surface p-1 shadow-lg">
                  {(["updated", "name"] as SortMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setSortMode(mode);
                        setSortMenuOpen(false);
                      }}
                      className={`flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-surface-2 ${
                        sortMode === mode ? "font-semibold text-foreground" : "text-muted"
                      }`}
                    >
                      {mode === "name" ? "Name" : "Last updated"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleNewProject}
              className="btn-primary rounded-full px-4 py-1.5 text-sm font-semibold hover:opacity-85 transition-opacity"
            >
              New project
            </button>
          </div>
        }
      </div>
      )}

      <div className={`flex-1 overflow-y-auto px-6 sm:px-10 ${activeProjectId ? "pt-3 pb-8" : "py-8"}`}>
        {activeProjectId && activeProject ? (
          <>
          <div className="mb-1 flex items-center gap-1.5 text-sm text-muted">
            <button onClick={() => setActiveProjectId(null)} className="transition-colors hover:text-foreground">
              Projects
            </button>
            <span>/</span>
            {editingTitle ? (
              <input
                autoFocus
                onFocus={(e) => e.target.select()}
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitTitle();
                  if (e.key === "Escape") setEditingTitle(false);
                }}
                className="min-w-0 flex-1 rounded-md border border-border bg-surface px-1.5 py-0.5 text-sm text-foreground outline-none focus:border-foreground/40"
              />
            ) : (
              <span
                onDoubleClick={() => {
                  setTitleValue(activeProject.name);
                  setEditingTitle(true);
                }}
                className="cursor-text select-none truncate rounded px-1 text-foreground hover:bg-surface-2"
              >
                {activeProject.name}
              </span>
            )}
          </div>

          <div className="mx-auto mt-14 max-w-6xl">
            <div className={`flex items-center justify-between gap-3 ${activeProject.description ? "mb-1" : "mb-6"}`}>
                  {editingTitle ? (
                    <input
                      autoFocus
                      onFocus={(e) => e.target.select()}
                      value={titleValue}
                      onChange={(e) => setTitleValue(e.target.value)}
                      onBlur={commitTitle}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitTitle();
                        if (e.key === "Escape") setEditingTitle(false);
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 py-0.5 font-serif text-3xl outline-none focus:border-foreground/40"
                    />
                  ) : (
                    <h1
                      onClick={() => {
                        setTitleValue(activeProject.name);
                        setEditingTitle(true);
                      }}
                      className="cursor-text select-none truncate rounded-lg px-1 font-serif text-3xl hover:bg-surface-2"
                    >
                      {activeProject.name}
                    </h1>
                  )}
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => onTogglePinProject(activeProjectId)}
                      aria-label={activeProject.pinned ? "Unpin project" : "Pin project"}
                      className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface-2 ${
                        activeProject.pinned ? "text-foreground" : "text-muted hover:text-foreground"
                      }`}
                    >
                      {PinIcon}
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setMoreMenuOpen((v) => !v)}
                        aria-label="More"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                      >
                        {MoreIcon}
                      </button>
                      {moreMenuOpen && (
                        <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-border bg-surface p-1 shadow-lg">
                          <button
                            onClick={() => {
                              setMoreMenuOpen(false);
                              onDeleteProject(activeProjectId);
                              setActiveProjectId(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-[#b3413e] transition-colors hover:bg-surface-2"
                          >
                            {TrashIcon}
                            Delete project
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

            {activeProject.description && (
              <p className="mb-6 text-sm text-muted">{activeProject.description}</p>
            )}

            <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1">
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <textarea
                    value={projectDraft}
                    onChange={(e) => setProjectDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleStart();
                      }
                    }}
                    rows={2}
                    placeholder="How can I help you today?"
                    className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted"
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenComingSoon("Attach")}
                        aria-label="Add"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                      >
                        {PlusIcon}
                      </button>
                      {/* Same Chat/Work pill as the main composer's own
                          header row, but Work here just switches the
                          toggle -- no "coming soon" toast, since a click
                          right next to where you're about to type
                          shouldn't interrupt with a popup. */}
                      <div className="flex items-center gap-1 rounded-xl bg-[#212121] p-1">
                        <button
                          onClick={() => setComposerMode("chat")}
                          className={`rounded-lg px-4 py-1.5 text-xs font-medium outline-none transition-colors ${
                            composerMode === "chat" ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
                          }`}
                        >
                          Chat
                        </button>
                        <button
                          onClick={() => setComposerMode("work")}
                          className={`rounded-lg px-4 py-1.5 text-xs font-medium outline-none transition-colors ${
                            composerMode === "work" ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
                          }`}
                        >
                          Work
                        </button>
                      </div>
                    </div>
                    <div className="relative flex items-center gap-2">
                      <button
                        onClick={() => setModelMenuOpen((v) => !v)}
                        className="flex h-7 items-center gap-1.5 rounded-lg bg-surface-2 px-4 text-xs font-semibold text-foreground outline-none transition-colors hover:bg-surface"
                      >
                        GiZa 5.6
                        {ChevronDownIcon}
                      </button>
                      {/* Same "Select model" menu the main composer's own
                          GiZa 5.6 button already opens (GiZa Pro is a real
                          "coming soon" entry there too, not invented for
                          this view) -- picking a row here is just a toast,
                          since actually switching models mid-project-
                          creation would need to be threaded all the way
                          into the real composer this hands off to. */}
                      {modelMenuOpen && (
                        <div className="absolute right-0 top-full z-50 mt-1 w-96 overflow-hidden rounded-2xl border border-border bg-surface shadow-lg">
                          <button
                            onClick={() => {
                              setModelMenuOpen(false);
                              onOpenComingSoon("GiZa Pro");
                            }}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
                          >
                            <span className="flex-1 min-w-0">
                              <span className="flex items-center gap-2">
                                <span className="text-sm font-medium">GiZa Pro</span>
                                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-muted">
                                  Coming soon
                                </span>
                              </span>
                              <span className="block text-xs text-muted">For your toughest challenges</span>
                            </span>
                          </button>
                          <button onClick={() => setModelMenuOpen(false)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-2">
                            <span className="flex-1">
                              <span className="block text-sm font-medium">GiZa 5.6</span>
                              <span className="block text-xs text-muted">Reliable, efficient performance for daily business tasks</span>
                            </span>
                            <span className="text-foreground">{ModelCheckIcon}</span>
                          </button>
                          <button
                            onClick={() => {
                              setModelMenuOpen(false);
                              onOpenComingSoon("Deep Think");
                            }}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
                          >
                            <span className="flex-1">
                              <span className="block text-sm font-medium">Deep Think</span>
                              <span className="block text-xs text-muted">Rigorous analysis and reasoning for high-stakes decisions</span>
                            </span>
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => onOpenComingSoon("Voice")}
                        aria-label="Voice"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                      >
                        {MicIcon}
                      </button>
                      <button
                        onClick={handleStart}
                        aria-label="Start chat"
                        className="btn-primary flex h-8 w-8 items-center justify-center rounded-full transition-opacity hover:opacity-85"
                      >
                        {ArrowUpIcon}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="relative mt-2 flex items-center gap-3 px-1 text-xs text-muted">
                  <button
                    onClick={() => setFolderMenuOpen((v) => !v)}
                    className={`truncate rounded-md px-1.5 py-0.5 transition-colors ${
                      folderMenuOpen ? "bg-surface-2 text-foreground" : "hover:text-foreground"
                    }`}
                  >
                    {activeProject.name}
                  </button>
                  <button onClick={() => onOpenComingSoon("Auto")} className="transition-colors hover:text-foreground">
                    Auto
                  </button>

                  {/* Reference calls projects "folders" here -- picking a
                      different one switches straight to it (real behavior,
                      not a toast) since we already have the project list;
                      "Add a folder" stays a coming-soon like every other
                      folder entry point in this app (CreateProjectModal's
                      "Use a folder" row). */}
                  {folderMenuOpen && (
                    <div className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-2xl border border-border bg-surface shadow-lg">
                      <div className="border-b border-border p-2">
                        <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5">
                          <span className="text-muted">{SearchIcon}</span>
                          <input
                            autoFocus
                            value={folderQuery}
                            onChange={(e) => setFolderQuery(e.target.value)}
                            placeholder="Search folders"
                            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
                          />
                        </div>
                      </div>
                      <div className="p-1.5">
                        {/* "Folder" here means a local computer folder to
                            attach (like the reference's own single-item
                            list showing just the project it's already in)
                            -- not a switcher across your other projects, so
                            this only ever shows the current one, checked. */}
                        <button onClick={() => setFolderMenuOpen(false)} className="menu-item compact">
                          <span className="icon">{FolderIcon}</span>
                          <span className="flex-1 truncate">{activeProject.name}</span>
                          <span className="text-foreground">{ModelCheckIcon}</span>
                        </button>
                      </div>
                      <div className="border-t border-border p-1.5">
                        <button
                          onClick={() => {
                            setFolderMenuOpen(false);
                            onOpenComingSoon("Folders");
                          }}
                          className="menu-item compact"
                        >
                          <span className="icon">{PlusIcon}</span>
                          <span className="flex-1 truncate font-medium">Add a folder</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Was also dumping every OTHER unassigned chat in the
                    whole account here as an "Add an existing chat" list --
                    the reference's empty state is just the hint text, no
                    such list, and with a real account's chat history that
                    dump could run to dozens of items. Existing-chat
                    assignment still works from the conversation's own "..."
                    menu (onMoveToProject) elsewhere; this view only shows
                    what's actually already in the project. */}
                {activeConversations.length === 0 ? (
                  <div className="mt-16 flex flex-col items-center gap-3 text-center">
                    <span className="text-muted">{EmptyChatIcon}</span>
                    <p className="max-w-xs text-sm text-muted">
                      Give ChatGiZa a task and it&apos;ll pick up your project context automatically.
                    </p>
                  </div>
                ) : (
                  <div className="mt-8">
                    <p className="mb-2 text-xs text-muted">
                      {activeConversations.length} chat{activeConversations.length === 1 ? "" : "s"} in this project
                    </p>
                    <ul className="space-y-1">
                      {activeConversations.map((c) => (
                        <li key={c.id} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-surface-2">
                          <button onClick={() => onSelectConversation(c.id)} className="flex-1 truncate text-left text-sm">
                            {c.title}
                          </button>
                          <button onClick={() => onAssign(c.id, null)} className="text-xs text-muted hover:text-foreground">
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex w-full shrink-0 flex-col gap-3 lg:w-96">
              {activeProjectId === HOW_TO_PROJECT_ID && (
                <div className="rounded-2xl border border-border p-4">
                  <span className="text-foreground">{WaveHandIcon}</span>
                  <p className="mt-2 text-sm font-semibold">Add relevant context for your project</p>
                  <p className="mt-1 text-xs text-muted">
                    Upload documents, code, and other files to the project for ChatGiZa to reference in your chats.
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    In this example project, we&apos;ve added a key file about how to use ChatGiZa.
                  </p>
                </div>
              )}
              {/* One continuous panel (single border/background), not four
                  separate boxes -- each section divided from the next by a
                  hairline instead of its own card. Wider than before too,
                  matching the reference's proportions better. */}
              <div className="w-full divide-y divide-border rounded-2xl border border-border">
                <InfoCard
                  title="Instructions"
                  hint="Add instructions to tailor ChatGiZa's responses"
                  onAdd={() => setInstructionsOpen(true)}
                />
                <InfoCard title="Memory" hint="Project memory will show here after a few chats." badge="Only you" onAdd={() => {}} />
                {activeProjectId === HOW_TO_PROJECT_ID ? (
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Context</h3>
                      <button
                        onClick={() => onOpenComingSoon("Context")}
                        aria-label="Add context"
                        className="flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                      >
                        {PlusIcon}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      In this example project, we&apos;ve added a key file about how to use ChatGiZa.
                    </p>
                    <button
                      onClick={() => setHowToOpen(true)}
                      className="mt-3 flex w-32 flex-col gap-2 rounded-xl border border-border p-3 text-left transition-colors hover:bg-surface-2"
                    >
                      <span className="truncate text-xs font-medium">ChatGiZa guide.md</span>
                      <span className="text-[10px] text-muted">{(CHATGIZA_GUIDE_MD.length / 1024).toFixed(1)} kB</span>
                      <span className="flex h-5 w-6 items-center justify-center self-start rounded border border-border text-[9px] font-normal text-muted">
                        MD
                      </span>
                    </button>
                  </div>
                ) : (
                  <InfoCard
                    title="Context"
                    hint="Add PDFs, documents, or other text to reference in this project."
                    onAdd={() => onOpenComingSoon("Context")}
                    dropzone
                    menuItems={[
                      { label: "Upload from device", icon: PaperclipIcon, onClick: () => onOpenComingSoon("Upload from device") },
                      { label: "Add text content", icon: TextContentIcon, onClick: () => onOpenComingSoon("Add text content") },
                      { label: "GitHub", icon: GitHubIcon, onClick: () => onOpenComingSoon("GitHub") },
                    ]}
                  />
                )}
                <InfoCard
                  title="Automations"
                  hint="Set up recurring tasks for this project."
                  onAdd={() => onOpenComingSoon("Automations")}
                />
              </div>
              </div>
            </div>
            {instructionsOpen && (
              <SetInstructionsModal projectName={activeProject.name} onClose={() => setInstructionsOpen(false)} />
            )}
          </div>
          </>
        ) : (
          <>
            {filteredProjects.length === 0 && query ? (
              <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <span className="text-foreground">{EmptyProjectsIcon}</span>
                <h2 className="text-base font-semibold">No projects match your search</h2>
              </div>
            ) : (
              <div className="mx-auto mt-4 grid max-w-[1600px] grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filteredProjects.map((p) => {
                  const chatCount = conversations.filter((c) => c.projectId === p.id).length;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setActiveProjectId(p.id)}
                      className="group relative flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-4 text-left transition-all hover:-translate-y-1 hover:border-foreground/30 hover:shadow-xl"
                    >
                      {p.pinned && (
                        <span className="absolute right-4 top-4 text-muted">{PinIcon}</span>
                      )}
                      <div className="min-w-0">
                        <span className="block w-full truncate font-serif text-xl leading-tight">{p.name}</span>
                        <span className="mt-1.5 block text-xs text-muted">
                          {chatCount} chat{chatCount === 1 ? "" : "s"}
                        </span>
                      </div>
                    </button>
                  );
                })}
                {!query && (
                  <button
                    onClick={() => setActiveProjectId(HOW_TO_PROJECT_ID)}
                    className="group relative flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-4 text-left transition-all hover:-translate-y-1 hover:border-foreground/30 hover:shadow-xl"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-serif text-xl leading-tight">How to use ChatGiZa</span>
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
                        Example project
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted">
                      A quick guide to ChatGiZa&apos;s features -- models, projects, Browse, and automations. Open it
                      any time you want a refresher.
                    </p>
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {howToOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-serif text-xl">ChatGiZa guide.md</h2>
                <button
                  onClick={() => setHowToOpen(false)}
                  aria-label="Close"
                  className="rounded-full p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  {SmallCloseIcon}
                </button>
              </div>
              <div className="mt-2 flex items-center justify-end">
                <div className="flex items-center gap-0.5 rounded-lg bg-surface-2 p-0.5">
                  <button
                    onClick={() => setGuideViewMode("preview")}
                    aria-label="Preview"
                    aria-pressed={guideViewMode === "preview"}
                    className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                      guideViewMode === "preview" ? "bg-surface text-foreground shadow" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {EyeIcon}
                  </button>
                  <button
                    onClick={() => setGuideViewMode("code")}
                    aria-label="View source"
                    aria-pressed={guideViewMode === "code"}
                    className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                      guideViewMode === "code" ? "bg-surface text-foreground shadow" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {CodeViewIcon}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
              <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto rounded-xl bg-black px-6 py-6 sm:px-12">
                {guideViewMode === "preview" ? (
                  <div className="markdown markdown-tight chat-text mx-auto w-full max-w-2xl text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{CHATGIZA_GUIDE_MD}</ReactMarkdown>
                  </div>
                ) : (
                  <pre className="mx-auto w-full max-w-2xl font-mono text-xs leading-6 text-foreground">
                    {CHATGIZA_GUIDE_MD.split("\n").map((line, i) => (
                      <div key={i} className="flex gap-4">
                        <span className="w-8 shrink-0 select-none text-right text-muted">{i + 1}</span>
                        <span className="min-w-0 whitespace-pre-wrap break-words">
                          {highlightMarkdownLine(line, i)}
                        </span>
                      </div>
                    ))}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
