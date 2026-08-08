import type { ChatContentPart } from "./ai";

export type Attachment = {
  id: string;
  name: string;
  mimeType: string;
  kind: "image" | "text" | "pdf-pages" | "video-frames";
  dataUrl?: string;
  text?: string;
  pages?: string[];
  // The original uploaded file's real size in bytes (from `File.size`), not an
  // estimate — this is what Settings > Storage reports for uploaded files, so
  // it matches what was actually uploaded rather than approximating from the
  // extracted/encoded content (which can be smaller or larger, e.g. a scanned
  // PDF's re-rendered page images vs. its original file size).
  sizeBytes?: number;
};

const MAX_FILE_SIZE = 8 * 1024 * 1024;
// Videos are only ever read locally (frames drawn to a canvas, extracted
// via an object URL) -- never base64-encoded or held as one big string the
// way images/PDFs are -- so a much bigger file is fine.
const MAX_VIDEO_FILE_SIZE = 100 * 1024 * 1024;
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
  const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(file.name);

  if (isVideo) {
    if (file.size > MAX_VIDEO_FILE_SIZE) {
      throw new Error(`"${file.name}" is too large (max ${MAX_VIDEO_FILE_SIZE / (1024 * 1024)}MB)`);
    }
    const { extractVideoFrames } = await import("./extractVideoFrames");
    const pages = await extractVideoFrames(file);
    return [
      { id, name: file.name, mimeType: file.type || "video/mp4", kind: "video-frames", pages, sizeBytes: file.size },
    ];
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`"${file.name}" is too large (max 8MB)`);
  }

  if (file.type.startsWith("image/")) {
    const dataUrl = await readAsDataUrl(file);
    return [{ id, name: file.name, mimeType: file.type, kind: "image", dataUrl, sizeBytes: file.size }];
  }

  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    const { extractPdfContent } = await import("./extractPdfText");
    const content = await extractPdfContent(file);

    if (content.kind === "text") {
      return [
        {
          id,
          name: file.name,
          mimeType: file.type || "application/pdf",
          kind: "text",
          text: content.text,
          sizeBytes: file.size,
        },
      ];
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
        sizeBytes: file.size,
      },
    ];
  }

  if (file.type.startsWith("text/") || /\.(txt|md)$/i.test(file.name)) {
    const raw = await file.text();
    const text = raw.length > MAX_TEXT_CHARS ? `${raw.slice(0, MAX_TEXT_CHARS)}\n[...truncated]` : raw;
    return [{ id, name: file.name, mimeType: file.type || "text/plain", kind: "text", text, sizeBytes: file.size }];
  }

  if (
    /\.(xlsx|xls|csv)$/i.test(file.name) ||
    file.type === "text/csv" ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel"
  ) {
    const { extractSpreadsheetText } = await import("./extractSpreadsheetText");
    const text = await extractSpreadsheetText(file);
    return [{ id, name: file.name, mimeType: file.type || "text/csv", kind: "text", text, sizeBytes: file.size }];
  }

  throw new Error(`"${file.name}" isn't a supported file type yet (images, PDF, .txt, .md, .xlsx, .csv, video)`);
}

export function buildApiContent(text: string, attachments: Attachment[]): string | ChatContentPart[] {
  const textAttachments = attachments.filter((a) => a.kind === "text");
  const imageAttachments = attachments.filter((a) => a.kind === "image");
  const framePageAttachments = attachments.filter((a) => a.kind === "pdf-pages" || a.kind === "video-frames");

  let combinedText = text;
  for (const a of textAttachments) {
    combinedText += `\n\n[Attached file: ${a.name}]\n${a.text}`;
  }
  for (const a of attachments.filter((x) => x.kind === "video-frames")) {
    combinedText += `\n\n[Attached video: ${a.name} — you are seeing ${a.pages?.length ?? 0} frames sampled evenly across it, not the full motion/audio]`;
  }

  const hasVisualContent = imageAttachments.length > 0 || framePageAttachments.length > 0;
  if (!hasVisualContent) {
    return combinedText;
  }

  const parts: ChatContentPart[] = [{ type: "text", text: combinedText || "See attached image(s)." }];
  for (const a of imageAttachments) {
    if (a.dataUrl) parts.push({ type: "image_url", image_url: { url: a.dataUrl } });
  }
  for (const a of framePageAttachments) {
    for (const page of a.pages ?? []) {
      parts.push({ type: "image_url", image_url: { url: page } });
    }
  }
  return parts;
}
