import type { jsPDF } from "jspdf";

type Segment = { text: string; bold: boolean };

// Cleans inline markdown that isn't handled by rich rendering (links, inline
// code, stray fence delimiters) while leaving **bold** markers intact so
// renderRichLine can still render them as real bold text.
function cleanInlineMarkdown(line: string): string {
  return line
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");
}

function parseInlineSegments(line: string): Segment[] {
  const segments: Segment[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(line))) {
    if (match.index > lastIndex) segments.push({ text: line.slice(lastIndex, match.index), bold: false });
    segments.push({ text: match[1], bold: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < line.length) segments.push({ text: line.slice(lastIndex), bold: false });
  return segments;
}

// Renders one logical line with mixed bold/normal runs, wrapping manually
// word-by-word since jsPDF has no native support for mixed-weight text flow.
function renderRichLine(
  doc: jsPDF,
  line: string,
  x: number,
  startY: number,
  maxWidth: number,
  pageHeight: number,
  margin: number,
  fontSize: number,
  lineHeight: number
): number {
  doc.setFontSize(fontSize);
  const segments = parseInlineSegments(line);
  let cursorX = x;
  let cursorY = startY;

  for (const seg of segments) {
    const tokens = seg.text.split(/(\s+)/).filter((t) => t !== "");
    for (const token of tokens) {
      doc.setFont("helvetica", seg.bold ? "bold" : "normal");
      const tokenWidth = doc.getTextWidth(token);
      const isWhitespace = /^\s+$/.test(token);
      if (!isWhitespace && cursorX + tokenWidth > x + maxWidth && cursorX > x) {
        cursorY += lineHeight;
        cursorX = x;
        if (cursorY > pageHeight - margin) {
          doc.addPage();
          cursorY = margin;
        }
      }
      if (!(isWhitespace && cursorX === x)) {
        doc.text(token, cursorX, cursorY);
        cursorX += tokenWidth;
      }
    }
  }
  return cursorY + lineHeight;
}

export async function textToPdfBlob(title: string, body: string): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  // A4 in points (595.28 x 841.89) — jsPDF's built-in "a4" format preset.
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 56;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  const titleLines: string[] = doc.splitTextToSize(title, maxWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 22 + 18;
  doc.setDrawColor(200);
  doc.line(margin, y - 10, pageWidth - margin, y - 10);

  const lines = body
    .split("\n")
    .filter((line) => !/^\s*```/.test(line)); // drop stray code-fence delimiters, keep inner content

  for (const rawLine of lines) {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }

    if (rawLine.trim() === "") {
      y += 10;
      continue;
    }

    const headingMatch = rawLine.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const size = level === 1 ? 18 : level === 2 ? 15 : 13;
      const lineHeight = size + 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(size);
      const headingLines: string[] = doc.splitTextToSize(cleanInlineMarkdown(headingMatch[2]).replace(/\*\*/g, ""), maxWidth);
      doc.text(headingLines, margin, y);
      y += headingLines.length * lineHeight + 8;
      continue;
    }

    const bulletMatch = rawLine.match(/^\s*[-*+]\s+(.*)/);
    if (bulletMatch) {
      const bulletIndent = 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text("•", margin, y);
      y = renderRichLine(doc, cleanInlineMarkdown(bulletMatch[1]), margin + bulletIndent, y, maxWidth - bulletIndent, pageHeight, margin, 11, 16);
      continue;
    }

    y = renderRichLine(doc, cleanInlineMarkdown(rawLine), margin, y, maxWidth, pageHeight, margin, 11, 16);
  }

  return doc.output("blob");
}
