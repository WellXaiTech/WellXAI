import { supabaseAdmin } from "@/lib/supabase";

const BUCKET = "media";
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Uploads a `data:image/...;base64,...` URL to Supabase Storage and returns
 * its public URL, or null if the input isn't a data URL we recognize.
 * Keeps ChatGiZa Media posts out of the database as huge base64 blobs. */
export async function uploadPostImage(dataUrl: string): Promise<string | null> {
  const match = /^data:(image\/[a-z]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const [, mime, base64] = match;
  const ext = EXT_BY_MIME[mime];
  if (!ext) return null;

  const bytes = Buffer.from(base64, "base64");
  const path = `posts/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, bytes, { contentType: mime });
  if (error) {
    console.error("uploadPostImage error:", error);
    return null;
  }

  return supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Removes an uploaded post image given its public URL, if it's one of
 * ours -- called when a post is deleted, so storage doesn't accumulate
 * orphaned files. Silently does nothing for null/non-matching URLs. */
export async function deletePostImage(imageUrl: string | null): Promise<void> {
  if (!imageUrl) return;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return;
  const path = imageUrl.slice(idx + marker.length);
  await supabaseAdmin.storage.from(BUCKET).remove([path]);
}
