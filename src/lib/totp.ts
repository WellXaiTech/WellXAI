import { createHmac, randomBytes } from "crypto";

// RFC 4226 (HOTP) + RFC 6238 (TOTP) implemented directly on Node's crypto
// module -- no external authenticator-app dependency, same approach as the
// scrypt password hashing in account/password/route.ts.
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number): string {
  const counterBuf = Buffer.alloc(8);
  // Counter is time/30s, nowhere near 2^32 for the lifetime of this app --
  // the high 4 bytes stay zero.
  counterBuf.writeUInt32BE(0, 0);
  counterBuf.writeUInt32BE(counter, 4);
  const hmac = createHmac("sha1", secret).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (binCode % 10 ** DIGITS).toString().padStart(DIGITS, "0");
}

/** A fresh base32 secret for a new Authenticator App enrollment. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** The otpauth:// URI an authenticator app scans as a QR code. */
export function generateTotpUri(base32Secret: string, email: string, issuer = "ChatGiZa"): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const params = new URLSearchParams({
    secret: base32Secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Checks a 6-digit code against the secret, tolerating one step (±30s) of
 * clock drift between the phone and the authenticator app's device. */
export function verifyTotp(base32Secret: string, token: string, windowSteps = 1): boolean {
  const clean = token.trim();
  if (!/^\d{6}$/.test(clean)) return false;
  const secret = base32Decode(base32Secret);
  const nowStep = Math.floor(Date.now() / 1000 / STEP_SECONDS);
  for (let drift = -windowSteps; drift <= windowSteps; drift++) {
    if (hotp(secret, nowStep + drift) === clean) return true;
  }
  return false;
}
