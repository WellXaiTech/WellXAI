import { supabaseAdmin } from "@/lib/supabase";

// Books can be large, so uploads go straight from the client to Storage via
// a signed URL (see /api/ebooks/upload-url), the same pattern mediaStorage.ts
// already uses for videos -- our own API never sees the PDF bytes for an
// upload, only for a generated book (see generateAndStoreEbook).
const EBOOK_BUCKET = "ebooks";

function publicUrlOf(path: string): string {
  return supabaseAdmin.storage.from(EBOOK_BUCKET).getPublicUrl(path).data.publicUrl;
}

function pathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${EBOOK_BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

function safeFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() || "book.pdf";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

/** Mints a short-lived signed upload URL for a client-side direct upload. */
export async function createEbookUploadSlot(
  filename: string
): Promise<{ signedUrl: string; token: string; path: string; publicUrl: string } | null> {
  const path = `books/${crypto.randomUUID()}-${safeFilename(filename)}`;
  const { data, error } = await supabaseAdmin.storage.from(EBOOK_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("createEbookUploadSlot error:", error);
    return null;
  }
  return { signedUrl: data.signedUrl, token: data.token, path, publicUrl: publicUrlOf(path) };
}

/** Uploads an AI-generated book's PDF bytes directly (server already has them). */
export async function uploadGeneratedEbook(bytes: Buffer, title: string): Promise<string | null> {
  const path = `books/${crypto.randomUUID()}-${safeFilename(`${title}.pdf`)}`;
  const { error } = await supabaseAdmin.storage.from(EBOOK_BUCKET).upload(path, bytes, { contentType: "application/pdf" });
  if (error) {
    console.error("uploadGeneratedEbook error:", error);
    return null;
  }
  return publicUrlOf(path);
}

/** Uploads an AI-generated cover image's bytes directly (server already has them). */
export async function uploadCoverImage(bytes: Buffer): Promise<string | null> {
  const path = `covers/${crypto.randomUUID()}.png`;
  const { error } = await supabaseAdmin.storage.from(EBOOK_BUCKET).upload(path, bytes, { contentType: "image/png" });
  if (error) {
    console.error("uploadCoverImage error:", error);
    return null;
  }
  return publicUrlOf(path);
}

/** True if [url] points at our own ebook bucket -- checked before trusting a
 * client-supplied fileUrl for an upload, since the client uploaded it
 * directly to Storage without our API seeing the bytes. */
export function isOwnEbookUrl(url: string): boolean {
  return pathFromPublicUrl(url) !== null;
}

export async function deleteEbookFile(fileUrl: string | null): Promise<void> {
  if (!fileUrl) return;
  const path = pathFromPublicUrl(fileUrl);
  if (!path) return;
  await supabaseAdmin.storage.from(EBOOK_BUCKET).remove([path]);
}
