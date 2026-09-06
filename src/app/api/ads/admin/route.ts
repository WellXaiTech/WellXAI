import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { getAllAds, mutateAds, type Ad } from "@/lib/ads";

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

  // outcome/updatedAd reflect whichever attempt mutateAds actually persists
  // -- if it has to retry against a fresher list (see mutateAds), this
  // re-evaluates "not found" / "already reviewed" against that fresh data
  // too, instead of trusting a stale read from before the retry.
  let outcome: "not_found" | "already_reviewed" | "ok" = "not_found";
  let updatedAd: Ad | null = null;

  try {
    await mutateAds((ads) => {
      const idx = ads.findIndex((a) => a.id === id);
      if (idx === -1) {
        outcome = "not_found";
        return ads;
      }
      const ad = ads[idx];
      if (ad.status !== "pending_review") {
        outcome = "already_reviewed";
        return ads;
      }
      const next = [...ads];
      if (action === "approve") {
        const now = Date.now();
        next[idx] = { ...ad, status: "approved", startsAt: now, expiresAt: now + ad.durationSeconds * 1000 };
      } else {
        next[idx] = { ...ad, status: "rejected", rejectionReason: rejectionReason || null };
      }
      outcome = "ok";
      updatedAd = next[idx];
      return next;
    });
  } catch (err) {
    console.error("Ad review error", err);
    return NextResponse.json({ error: "Failed to update ad" }, { status: 500 });
  }

  if (outcome === "not_found") {
    return NextResponse.json({ error: "Ad not found" }, { status: 404 });
  }
  if (outcome === "already_reviewed") {
    return NextResponse.json({ error: "Ad already reviewed" }, { status: 400 });
  }
  return NextResponse.json({ ad: updatedAd });
}
