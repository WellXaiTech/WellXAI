import { supabaseAdmin } from "@/lib/supabase";

const IMAGE_BUCKET = "media";
const VIDEO_BUCKET = "media-video";
const IMAGE_EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const VIDEO_EXT_BY_MIME: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

function publicUrlOf(bucket: string, path: string): string {
  return supabaseAdmin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function pathFromPublicUrl(bucket: string, url: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

/** Uploads a `data:image/...;base64,...` URL to Supabase Storage and returns
 * its public URL, or null if the input isn't a data URL we recognize.
 * Keeps ChatGiZa Media posts out of the database as huge base64 blobs. */
export async function uploadPostImage(dataUrl: string): Promise<string | null> {
  const match = /^data:(image\/[a-z]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const [, mime, base64] = match;
  const ext = IMAGE_EXT_BY_MIME[mime];
  if (!ext) return null;

  const bytes = Buffer.from(base64, "base64");
  const path = `posts/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabaseAdmin.storage.from(IMAGE_BUCKET).upload(path, bytes, { contentType: mime });
  if (error) {
    console.error("uploadPostImage error:", error);
    return null;
  }
  return publicUrlOf(IMAGE_BUCKET, path);
}

export async function deletePostImage(imageUrl: string | null): Promise<void> {
  if (!imageUrl) return;
  const path = pathFromPublicUrl(IMAGE_BUCKET, imageUrl);
  if (!path) return;
  await supabaseAdmin.storage.from(IMAGE_BUCKET).remove([path]);
}

/** Videos are too large to round-trip through our own API's request body,
 * so the client uploads directly to Storage using a short-lived signed
 * upload URL -- this just mints that URL + the eventual public URL. */
export async function createVideoUploadSlot(
  mime: string
): Promise<{ signedUrl: string; token: string; path: string; publicUrl: string } | null> {
  const ext = VIDEO_EXT_BY_MIME[mime];
  if (!ext) return null;

  const path = `posts/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabaseAdmin.storage.from(VIDEO_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("createVideoUploadSlot error:", error);
    return null;
  }
  return { signedUrl: data.signedUrl, token: data.token, path, publicUrl: publicUrlOf(VIDEO_BUCKET, path) };
}

/** True if [url] points at our own video bucket -- used to validate a
 * client-supplied videoUrl before trusting it on a post, since the client
 * uploaded it directly to Storage without our API seeing the bytes. */
export function isOwnVideoUrl(url: string): boolean {
  return pathFromPublicUrl(VIDEO_BUCKET, url) !== null;
}

export async function deletePostVideo(videoUrl: string | null): Promise<void> {
  if (!videoUrl) return;
  const path = pathFromPublicUrl(VIDEO_BUCKET, videoUrl);
  if (!path) return;
  await supabaseAdmin.storage.from(VIDEO_BUCKET).remove([path]);
}
