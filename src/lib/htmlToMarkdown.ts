import TurndownService from "turndown";

// atx headings ("## Heading") and "-" bullets match what generatePdf.ts's
// line-by-line parser expects -- turndown's defaults (setext headings, "*"
// bullets) would silently fall through to plain-text rendering there.
const turndownService = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });

// Tiptap's TaskItem renders as <li data-checked="true"><label><input
// type="checkbox">...</label><div>text</div></li> -- turndown's built-in
// list rule doesn't know that shape, so without this it would emit stray
// "[ ]"-less bullets or drop the checkbox state entirely.
turndownService.addRule("taskListItem", {
  filter: (node) => node.nodeName === "LI" && node.getAttribute("data-checked") !== null,
  replacement: (content, node) => {
    const checked = (node as HTMLElement).getAttribute("data-checked") === "true";
    const text = content.replace(/^\s+|\s+$/g, "").replace(/\n+/g, " ");
    return `- [${checked ? "x" : " "}] ${text}\n`;
  },
});

// Converts a book page's stored HTML (Tiptap's native format) back into
// Markdown for /export, which reuses generatePdf.ts's existing Markdown ->
// PDF renderer rather than a second HTML-aware one. Alignment, text color,
// and highlight are intentionally lost here -- plain Markdown (and
// generatePdf.ts's jsPDF rendering) has no equivalent for any of them.
export function htmlToMarkdown(html: string): string {
  return turndownService.turndown(html);
}
