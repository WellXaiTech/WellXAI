// Shared by /api/build/vercel/deploy and /api/build/github/push -- both
// accepted a full project file map straight from the client with no
// bound on count or size at all. A real, legitimate multi-file site is
// small and well under these numbers, so this only ever engages for
// something clearly wrong (a runaway client, a malformed payload, a
// deliberately oversized request), never for normal Build usage.
export const MAX_BUILD_FILE_COUNT = 500;
export const MAX_BUILD_SINGLE_FILE_BYTES = 2 * 1024 * 1024; // 2MB
export const MAX_BUILD_TOTAL_BYTES = 20 * 1024 * 1024; // 20MB

// Returns a plain, user-facing error string if the file set is too big
// in any of the three ways that matter (too many files, one file too
// large, or the whole project too large), or null if it's fine.
export function validateBuildFiles(files: Record<string, string>): string | null {
  const entries = Object.entries(files);
  if (entries.length > MAX_BUILD_FILE_COUNT) {
    return `Too many files (${entries.length}, max ${MAX_BUILD_FILE_COUNT}).`;
  }

  let totalBytes = 0;
  for (const [path, content] of entries) {
    const bytes = Buffer.byteLength(content, "utf-8");
    if (bytes > MAX_BUILD_SINGLE_FILE_BYTES) {
      return `"${path}" is too large (${Math.round(bytes / 1024)}KB, max ${Math.round(MAX_BUILD_SINGLE_FILE_BYTES / 1024 / 1024)}MB per file).`;
    }
    totalBytes += bytes;
  }

  if (totalBytes > MAX_BUILD_TOTAL_BYTES) {
    return `Project is too large (${Math.round(totalBytes / 1024 / 1024)}MB total, max ${Math.round(MAX_BUILD_TOTAL_BYTES / 1024 / 1024)}MB).`;
  }

  return null;
}
