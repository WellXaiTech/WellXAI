import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

// Node's built-in scrypt instead of a bcrypt dependency -- no native
// bindings to worry about on Vercel's serverless runtime, and it's already
// a recommended password-hashing KDF. Shared between Change Password and
// the password sign-in route so both hash/verify the exact same way.
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}
