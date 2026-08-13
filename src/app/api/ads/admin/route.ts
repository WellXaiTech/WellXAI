import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { getAllAds, saveAllAds } from "@/lib/ads";

export async function GET() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const ads = await getAllAds();
  return NextResponse.json({ ads });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const action = body?.action;
  const rejectionReason = typeof body?.rejectionReason === "string" ? body.rejectionReason.trim().slice(0, 500) : "";

  if (!id || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const ads = await getAllAds();
  const idx = ads.findIndex((a) => a.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Ad not found" }, { status: 404 });
  }

  const ad = ads[idx];
  if (ad.status !== "pending_review") {
    return NextResponse.json({ error: "Ad already reviewed" }, { status: 400 });
  }

  if (action === "approve") {
    const now = Date.now();
    ads[idx] = {
      ...ad,
      status: "approved",
      startsAt: now,
      expiresAt: now + ad.durationSeconds * 1000,
    };
  } else {
    ads[idx] = {
      ...ad,
      status: "rejected",
      rejectionReason: rejectionReason || null,
    };
  }

  try {
    await saveAllAds(ads);
    return NextResponse.json({ ad: ads[idx] });
  } catch (err) {
    console.error("Ad review error", err);
    return NextResponse.json({ error: "Failed to update ad" }, { status: 500 });
  }
}
