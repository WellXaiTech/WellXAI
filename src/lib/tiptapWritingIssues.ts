import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { WritingSuggestion } from "@/lib/ai";

export type WritingIssueRange = { id: string; from: number; to: number };

type IssuesState = { suggestions: WritingSuggestion[]; ranges: WritingIssueRange[]; decorations: DecorationSet };

export const writingIssuesKey = new PluginKey<IssuesState>("writingIssues");

/** Reads the plugin's current suggestion->position map, for the click
 * handler in EbookEditor to resolve which range to replace/dismiss. */
export function getWritingIssueRanges(state: import("@tiptap/pm/state").EditorState): WritingIssueRange[] {
  return writingIssuesKey.getState(state)?.ranges ?? [];
}

// Highlights each suggestion's "original" text with a wavy underline, purely
// as a decoration -- never touches the actual document, so autosave/export
// stay exactly what the user wrote until they explicitly accept a fix. Only
// the FIRST occurrence of each suggestion's text is decorated (a suggestion
// is one specific spot the reviewer flagged, and a short phrase like "there"
// could otherwise match unrelated places elsewhere on the page).
export const WritingIssues = Extension.create({
  name: "writingIssues",

  addProseMirrorPlugins() {
    return [
      new Plugin<IssuesState>({
        key: writingIssuesKey,
        state: {
          init: () => ({ suggestions: [], ranges: [], decorations: DecorationSet.empty }),
          apply(tr, prev) {
            const meta = tr.getMeta(writingIssuesKey) as { suggestions: WritingSuggestion[] } | undefined;
            const suggestions = meta?.suggestions ?? prev.suggestions;
            if (!meta && !tr.docChanged) return prev;

            const ranges: WritingIssueRange[] = [];
            const decorations: Decoration[] = [];
            const remaining = new Map(suggestions.map((s) => [s.id, s]));

            tr.doc.descendants((node, pos) => {
              if (remaining.size === 0) return false;
              if (!node.isText || !node.text) return;
              for (const [id, s] of remaining) {
                const idx = node.text.indexOf(s.original);
                if (idx === -1) continue;
                const from = pos + idx;
                const to = from + s.original.length;
                ranges.push({ id, from, to });
                decorations.push(
                  Decoration.inline(from, to, { class: "writing-issue", "data-suggestion-id": id })
                );
                remaining.delete(id);
              }
            });

            return { suggestions, ranges, decorations: DecorationSet.create(tr.doc, decorations) };
          },
        },
        props: {
          decorations(state) {
            return writingIssuesKey.getState(state)?.decorations;
          },
        },
      }),
    ];
  },
});
