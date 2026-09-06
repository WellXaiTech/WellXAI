// Derives the same short "UID" the Android app already shows on its
// account-hub screen (MainActivity.kt's ProfileHubScreen) -- there is no
// real backend UID field, so both sides independently derive an 8-digit
// number from the account's own id (the Google sub). This only works if
// both platforms use the exact same hash: Kotlin's `String.hashCode()` is
// Java's classic polynomial hash (base 31, 32-bit signed overflow), which
// javaStringHashCode reproduces bit-for-bit using Math.imul for the 32-bit
// multiply and `| 0` to truncate/sign each step the same way a JVM int does.
function javaStringHashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(hash, 31) + str.charCodeAt(i)) | 0;
  }
  return hash;
}

export function deriveUid(accountId: string): string {
  const hash = javaStringHashCode(accountId);
  return (Math.abs(hash) % 100_000_000).toString().padStart(8, "0");
}
