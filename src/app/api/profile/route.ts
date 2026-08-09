import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";

type ProfileData = {
  profile: {
    nickname: string;
    about: string;
    role?: string;
    fullName?: string;
    birthDate?: string;
    country?: string;
    // Public-facing (shown on the ChatGiZa Media profile page) --
    // distinct from `about`, which is private AI-personalization
    // context and must never be surfaced to other users.
    bio?: string;
    // Public display name shown boldly on the Media profile (e.g.
    // "QUANTARA"), distinct from `nickname` -- nickname personalizes how
    // the AI addresses you in chat, displayName is what other users see.
    displayName?: string;
  };
  memory: string[];
  memoryEnabled: boolean;
  language: string;
};

const DEFAULT_PROFILE_DATA: ProfileData = {
  profile: { nickname: "", about: "", bio: "", displayName: "" },
  memory: [],
  memoryEnabled: true,
  language: "",
};

function profileKey(userId: string) {
  return `chatgiza:profile-data:${userId}`;
}

// The single source of truth for account/profile settings — website and the
// native Android app both read and write here (via cookie session or bearer
// token respectively), so editing your nickname/memory in one place shows up
// in the other instead of being stuck in that device's localStorage only.
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const data = await kv.get<ProfileData>(profileKey(userId));
    return NextResponse.json(data ?? DEFAULT_PROFILE_DATA);
  } catch (err) {
    console.error("Profile KV get error", err);
    const message = err instanceof Error ? err.message : "Failed to load profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const data: ProfileData = {
    profile: {
      nickname: typeof body.profile?.nickname === "string" ? body.profile.nickname : "",
      about: typeof body.profile?.about === "string" ? body.profile.about : "",
      role: typeof body.profile?.role === "string" ? body.profile.role : undefined,
      fullName: typeof body.profile?.fullName === "string" ? body.profile.fullName : undefined,
      birthDate: typeof body.profile?.birthDate === "string" ? body.profile.birthDate : undefined,
      country: typeof body.profile?.country === "string" ? body.profile.country : undefined,
      bio: typeof body.profile?.bio === "string" ? body.profile.bio.slice(0, 150) : "",
      displayName: typeof body.profile?.displayName === "string" ? body.profile.displayName.slice(0, 60) : "",
    },
    memory: Array.isArray(body.memory) ? body.memory.filter((m: unknown) => typeof m === "string") : [],
    memoryEnabled: typeof body.memoryEnabled === "boolean" ? body.memoryEnabled : true,
    language: typeof body.language === "string" ? body.language : "",
  };

  try {
    await kv.set(profileKey(userId), data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Profile KV set error", err);
    const message = err instanceof Error ? err.message : "Failed to save profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
