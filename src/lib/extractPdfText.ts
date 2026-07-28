const PDFJS_VERSION = "6.1.200";
const MAX_CHARS = 8000;
const MAX_TEXT_PAGES = 30;
const MAX_IMAGE_PAGES = 5;

export type PdfContent = { kind: "text"; text: string } | { kind: "images"; images: string[] };

async function loadPdf(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;
  const buffer = await file.arrayBuffer();
  return pdfjs.getDocument({ data: buffer }).promise;
}

async function extractRawText(pdf: Awaited<ReturnType<typeof loadPdf>>): Promise<string> {
  let text = "";
  const pageCount = Math.min(pdf.numPages, MAX_TEXT_PAGES);

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    text += `${pageText}\n`;
    if (text.length > MAX_CHARS) break;
  }

  return text;
}

async function renderPagesAsImages(pdf: Awaited<ReturnType<typeof loadPdf>>): Promise<string[]> {
  const images: string[] = [];
  const pageCount = Math.min(pdf.numPages, MAX_IMAGE_PAGES);

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    if (!context) continue;
    await page.render({ canvasContext: context, viewport, canvas }).promise;
    images.push(canvas.toDataURL("image/png"));
  }

  return images;
}

/**
 * Tries to extract selectable text from a PDF. If the PDF has none (a scanned
 * or image-only PDF), falls back to rendering its pages as images so a vision
 * model can read them instead.
 */
export async function extractPdfContent(file: File): Promise<PdfContent> {
  const pdf = await loadPdf(file);
  const rawText = await extractRawText(pdf);

  if (rawText.trim()) {
    const truncated = rawText.length > MAX_CHARS;
    const text = truncated ? `${rawText.slice(0, MAX_CHARS)}\n[...truncated]` : rawText.trim();
    return { kind: "text", text };
  }

  const images = await renderPagesAsImages(pdf);
  if (images.length === 0) {
    throw new Error("This PDF couldn't be read — it has no selectable text and its pages couldn't be rendered.");
  }
  return { kind: "images", images };
}
