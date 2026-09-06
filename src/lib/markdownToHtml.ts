import { marked } from "marked";

// Converts the AI's Markdown page output into the HTML the /ebook/[id]
// editor's Tiptap instance expects to insert -- ebook_pages.content is
// always HTML (Tiptap's native format), Markdown only ever exists as an
// intermediate the model produces and htmlToMarkdown re-derives for export.
export function markdownToHtml(markdown: string): string {
  return marked.parse(markdown, { async: false, gfm: true, breaks: false });
}
