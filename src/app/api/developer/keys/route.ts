import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";
import { createApiKey, listApiKeys } from "@/lib/apiKeys";

// Key management itself is always authenticated with the user's own web
// session or mobile bearer token -- API keys are for authenticating THIRD-
// PARTY requests to /api/v1/*, not for managing your own key list.
const MAX_KEYS_PER_USER = 10;

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const keys = await listApiKeys(userId);
    // Never return keyHash to the client -- there's no reason for it to
    // leave the server, even hashed.
    const safe = keys.map(({ keyHash, ...rest }) => rest);
    return NextResponse.json({ keys: safe });
  } catch (err) {
    console.error("Developer keys GET error:", err);
    return NextResponse.json({ error: "Failed to load API keys" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const existing = await listApiKeys(userId);
    if (existing.filter((k) => !k.revoked).length >= MAX_KEYS_PER_USER) {
      return NextResponse.json({ error: `You can have at most ${MAX_KEYS_PER_USER} active API keys` }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const label = typeof body?.label === "string" ? body.label.trim() : "";

    const { plaintextKey, record } = await createApiKey(userId, label);
    const { keyHash, ...safeRecord } = record;
    // The plaintext key is returned exactly once, here -- it's never
    // retrievable again after this response.
    return NextResponse.json({ key: plaintextKey, record: safeRecord });
  } catch (err) {
    console.error("Developer keys POST error:", err);
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }
}
