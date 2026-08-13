import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getAllAds, saveAllAds } from "@/lib/ads";

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

    const ads = await getAllAds();
    const idx = ads.findIndex((a) => a.id === adId);
    if (idx === -1) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    // Idempotent -- Stripe may retry, and the advertiser's own page reload
    // after returning from checkout hits this same endpoint again.
    if (paid && ads[idx].paymentStatus !== "paid") {
      ads[idx] = { ...ads[idx], paymentStatus: "paid", status: "pending_review" };
      await saveAllAds(ads);
    }

    return NextResponse.json({ paid, ad: ads[idx] });
  } catch (err) {
    console.error("Ad checkout verify error", err);
    const message = err instanceof Error ? err.message : "Failed to verify checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
