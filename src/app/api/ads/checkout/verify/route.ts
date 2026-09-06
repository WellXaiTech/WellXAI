import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getAllAds, mutateAds, type Ad } from "@/lib/ads";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = checkoutSession.payment_status === "paid" || checkoutSession.status === "complete";
    const adId = checkoutSession.metadata?.adId;

    if (!adId) {
      return NextResponse.json({ error: "No ad on this session" }, { status: 400 });
    }

    const existing = await getAllAds();
    const current = existing.find((a) => a.id === adId);
    if (!current) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    // Idempotent -- Stripe may retry, and the advertiser's own page reload
    // after returning from checkout hits this same endpoint again. Skipping
    // the write entirely when there's nothing to change also avoids paying
    // mutateAds's CAS-retry cost on every redundant call.
    if (!paid || current.paymentStatus === "paid") {
      return NextResponse.json({ paid, ad: current });
    }

    let updatedAd: Ad = current;
    await mutateAds((ads) => {
      const idx = ads.findIndex((a) => a.id === adId);
      if (idx === -1 || ads[idx].paymentStatus === "paid") {
        updatedAd = idx === -1 ? current : ads[idx];
        return ads;
      }
      const next = [...ads];
      next[idx] = { ...ads[idx], paymentStatus: "paid", status: "pending_review" };
      updatedAd = next[idx];
      return next;
    });

    return NextResponse.json({ paid, ad: updatedAd });
  } catch (err) {
    console.error("Ad checkout verify error", err);
    const message = err instanceof Error ? err.message : "Failed to verify checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
