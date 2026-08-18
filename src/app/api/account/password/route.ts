import { NextRequest, NextResponse } from "next/server";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestUser } from "@/lib/requestUser";

// Node's built-in scrypt instead of a bcrypt dependency -- no native
// bindings to worry about on Vercel's serverless runtime, and it's already
// a recommended password-hashing KDF.
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

// Whether this account has ever set an in-app password -- accounts that
// have only ever signed in with Google won't have one, so the app can skip
// straight to "set a new password" instead of asking for a nonexistent one.
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin.from("users").select("password_hash").eq("id", user.id).maybeSingle();
  if (error) {
    console.error("Password status error:", error);
    return NextResponse.json({ error: "Failed to load password status" }, { status: 500 });
  }
  return NextResponse.json({ hasPassword: !!data?.password_hash });
}

// Sets (first time) or changes (oldPassword required once one exists) the
// account's in-app password -- entirely separate from the Google sign-in
// itself, which stays the actual credential used to authenticate.
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const oldPassword = typeof body?.oldPassword === "string" ? body.oldPassword : undefined;
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  try {
    const { data } = await supabaseAdmin.from("users").select("password_hash").eq("id", user.id).maybeSingle();
    const existingHash = data?.password_hash as string | null | undefined;

    if (existingHash) {
      if (!oldPassword || !verifyPassword(oldPassword, existingHash)) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
      }
    }

    const newHash = hashPassword(newPassword);
    const { error } = await supabaseAdmin.from("users").update({ password_hash: newHash }).eq("id", user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Password update error:", err);
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}
