import { NextRequest, NextResponse } from "next/server";
import { getStripe, type PlanTier } from "@/lib/stripe";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === "paid" || session.status === "complete";
    const tier = (session.metadata?.tier as PlanTier | undefined) ?? null;

    return NextResponse.json({ paid, tier });
  } catch (err) {
    console.error("Stripe checkout verify error", err);
    const message = err instanceof Error ? err.message : "Failed to verify checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
