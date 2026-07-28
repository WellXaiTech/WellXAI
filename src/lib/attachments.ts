import type { ChatContentPart } from "./ai";

export type Attachment = {
  id: string;
  name: string;
  mimeType: string;
  kind: "image" | "text" | "pdf-pages";
  dataUrl?: string;
  text?: string;
  pages?: string[];
};

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_TEXT_CHARS = 8000;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Couldn't read that file"));
    reader.readAsDataURL(file);
  });
}

export async function readAttachment(file: File): Promise<Attachment[]> {
  const id = crypto.randomUUID();

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`"${file.name}" is too large (max 8MB)`);
  }

  if (file.type.startsWith("image/")) {
    const dataUrl = await readAsDataUrl(file);
    return [{ id, name: file.name, mimeType: file.type, kind: "image", dataUrl }];
  }

  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    const { extractPdfContent } = await import("./extractPdfText");
    const content = await extractPdfContent(file);

    if (content.kind === "text") {
      return [{ id, name: file.name, mimeType: file.type || "application/pdf", kind: "text", text: content.text }];
    }

    // Scanned/image-only PDF: keep it as a single PDF-looking attachment in the
    // UI, but carry the per-page images internally for the vision model to read.
    return [
      {
        id,
        name: file.name,
        mimeType: "application/pdf",
        kind: "pdf-pages",
        pages: content.images,
      },
    ];
  }

  if (file.type.startsWith("text/") || /\.(txt|md)$/i.test(file.name)) {
    const raw = await file.text();
    const text = raw.length > MAX_TEXT_CHARS ? `${raw.slice(0, MAX_TEXT_CHARS)}\n[...truncated]` : raw;
    return [{ id, name: file.name, mimeType: file.type || "text/plain", kind: "text", text }];
  }

  throw new Error(`"${file.name}" isn't a supported file type yet (images, PDF, .txt, .md)`);
}

export function buildApiContent(text: string, attachments: Attachment[]): string | ChatContentPart[] {
  const textAttachments = attachments.filter((a) => a.kind === "text");
  const imageAttachments = attachments.filter((a) => a.kind === "image");
  const pdfPageAttachments = attachments.filter((a) => a.kind === "pdf-pages");

  let combinedText = text;
  for (const a of textAttachments) {
    combinedText += `\n\n[Attached file: ${a.name}]\n${a.text}`;
  }

  const hasVisualContent = imageAttachments.length > 0 || pdfPageAttachments.length > 0;
  if (!hasVisualContent) {
    return combinedText;
  }

  const parts: ChatContentPart[] = [{ type: "text", text: combinedText || "See attached image(s)." }];
  for (const a of imageAttachments) {
    if (a.dataUrl) parts.push({ type: "image_url", image_url: { url: a.dataUrl } });
  }
  for (const a of pdfPageAttachments) {
    for (const page of a.pages ?? []) {
      parts.push({ type: "image_url", image_url: { url: page } });
    }
  }
  return parts;
}
