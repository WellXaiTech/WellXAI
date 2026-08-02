export const PDF_START = "[[PDF_START]]";
export const PDF_END = "[[PDF_END]]";

const SECTION_RE = /\[\[PDF_START\]\]([\s\S]*?)\[\[PDF_END\]\]/;

// If the reply marks out a document section, only that section belongs in the
// exported PDF — surrounding chat commentary ("Here's your document:", "You can
// download this below") should never end up inside the file itself.
export function extractPdfSection(text: string): string {
  const match = text.match(SECTION_RE);
  return match ? match[1].trim() : text;
}

// The markers are a convention for the model, not something a reader should
// ever see rendered in the chat — strip just the tokens, keep the content.
export function stripPdfMarkers(text: string): string {
  return text.replace(/\[\[PDF_START\]\]\n?/g, "").replace(/\n?\[\[PDF_END\]\]/g, "");
}

// The document's first line becomes the PDF title (rendered once, bold, at
// the top) — it must not also stay in the body, or it prints twice.
export function splitTitleAndBody(text: string, fallbackTitle: string): { title: string; body: string } {
  const lines = text.split("\n");
  const title = (lines[0] ?? "").replace(/^#{1,6}\s+/, "").trim().slice(0, 80) || fallbackTitle;
  const body = lines.slice(1).join("\n").replace(/^\n+/, "");
  return { title, body };
}

// Splits a reply into the chat commentary before/after a complete document
// section, so the document body can be rendered as a real file card instead
// of plain paragraph text.
export function splitAroundPdfSection(text: string): { before: string; after: string; hasSection: boolean } {
  const match = text.match(/^([\s\S]*?)\[\[PDF_START\]\]([\s\S]*?)\[\[PDF_END\]\]([\s\S]*)$/);
  if (!match) return { before: text, after: "", hasSection: false };
  return { before: match[1], after: match[3], hasSection: true };
}
