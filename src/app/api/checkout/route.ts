import { NextRequest, NextResponse } from "next/server";
import { getStripe, getOrCreatePriceId, getOrCreateCustomer, PLAN_TIERS, type PlanTier } from "@/lib/stripe";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in before upgrading." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const tier = body?.tier as PlanTier | undefined;

  if (!tier || !PLAN_TIERS.includes(tier)) {
    return NextResponse.json({ error: "Invalid plan tier" }, { status: 400 });
  }

  try {
    const priceId = await getOrCreatePriceId(tier);
    const origin = req.headers.get("origin") ?? req.nextUrl.origin;
    const stripe = getStripe();
    const customerId = await getOrCreateCustomer(session.user.id, session.user.email, session.user.name);

    // `client_reference_id` ties the completed payment back to this account
    // server-side (see /api/checkout/verify), which is what lets the IP-based
    // free-quota check exempt accounts that have actually paid. Attaching a
    // real `customer` (instead of an anonymous checkout) is what lets the
    // Billing tab later list this account's real invoices and payment
    // methods from Stripe.
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/chatgiza?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/chatgiza?upgrade=cancelled`,
      metadata: { tier },
      client_reference_id: session.user.id,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("Stripe checkout session error", err);
    const message = err instanceof Error ? err.message : "Failed to start checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
