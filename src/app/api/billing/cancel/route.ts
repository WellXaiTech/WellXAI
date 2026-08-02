import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStripe, getExistingCustomerId } from "@/lib/stripe";

// Cancels at the end of the current billing period — the account keeps full
// access until then, matching the description shown next to the button in
// Settings > Billing. Never an immediate/prorated cancellation.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const customerId = await getExistingCustomerId(session.user.id);
  if (!customerId) {
    return NextResponse.json({ error: "No active plan to cancel" }, { status: 404 });
  }

  try {
    const stripe = getStripe();
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
    const sub = subscriptions.data[0];
    if (!sub) {
      return NextResponse.json({ error: "No active plan to cancel" }, { status: 404 });
    }
    await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Plan cancel failed:", err);
    return NextResponse.json({ error: "Couldn't cancel your plan" }, { status: 500 });
  }
}
