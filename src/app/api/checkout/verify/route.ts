import { NextRequest, NextResponse } from "next/server";
import { getStripe, PLAN_DETAILS, type PlanTier } from "@/lib/stripe";
import { sendMailBestEffort } from "@/lib/mailer";
import { paymentConfirmationEmail } from "@/lib/emailTemplates";
import { setAccountPlan } from "@/lib/usageLimit";

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

    if (paid && tier && session.client_reference_id) {
      await setAccountPlan(session.client_reference_id, tier);
    }

    const customerEmail = session.customer_details?.email;
    if (paid && tier && customerEmail) {
      const details = PLAN_DETAILS[tier];
      const { subject, html } = paymentConfirmationEmail(details.name, `$${details.priceUsd}`);
      await sendMailBestEffort(customerEmail, subject, html);
    }

    return NextResponse.json({ paid, tier });
  } catch (err) {
    console.error("Stripe checkout verify error", err);
    const message = err instanceof Error ? err.message : "Failed to verify checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
