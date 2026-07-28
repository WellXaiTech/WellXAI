import { NextRequest, NextResponse } from "next/server";
import { getStripe, getOrCreatePriceId, PLAN_TIERS, type PlanTier } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const tier = body?.tier as PlanTier | undefined;

  if (!tier || !PLAN_TIERS.includes(tier)) {
    return NextResponse.json({ error: "Invalid plan tier" }, { status: 400 });
  }

  try {
    const priceId = await getOrCreatePriceId(tier);
    const origin = req.headers.get("origin") ?? req.nextUrl.origin;
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/chatgiza?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/chatgiza?upgrade=cancelled`,
      metadata: { tier },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout session error", err);
    const message = err instanceof Error ? err.message : "Failed to start checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
