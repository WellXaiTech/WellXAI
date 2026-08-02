import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { auth } from "@/auth";
import { getStripe, getExistingCustomerId, PLAN_DETAILS, type PlanTier } from "@/lib/stripe";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const customerId = await getExistingCustomerId(session.user.id);
  if (!customerId) {
    // Never subscribed yet (or KV isn't linked in this environment) — an
    // empty state, not an error.
    return NextResponse.json({ subscription: null, invoices: [], paymentMethods: [], billingInfo: null });
  }

  try {
    const stripe = getStripe();
    const [customer, subscriptions, invoices, paymentMethods] = await Promise.all([
      stripe.customers.retrieve(customerId),
      stripe.subscriptions.list({ customer: customerId, status: "all", limit: 5 }),
      stripe.invoices.list({ customer: customerId, limit: 12 }),
      stripe.paymentMethods.list({ customer: customerId, type: "card" }),
    ]);

    const activeSub = subscriptions.data.find((s) => s.status === "active" || s.status === "trialing") ?? null;
    const tier = (activeSub?.metadata?.tier as PlanTier | undefined) ?? null;
    const liveCustomer: Stripe.Customer | null = "deleted" in customer && customer.deleted ? null : customer;
    const defaultPaymentMethodId =
      typeof liveCustomer?.invoice_settings?.default_payment_method === "string"
        ? liveCustomer.invoice_settings.default_payment_method
        : (liveCustomer?.invoice_settings?.default_payment_method?.id ?? null);

    return NextResponse.json({
      subscription: activeSub
        ? {
            tier,
            planName: tier ? PLAN_DETAILS[tier].name : "ChatGiZa",
            currentPeriodEnd: activeSub.items.data[0]?.current_period_end
              ? activeSub.items.data[0].current_period_end * 1000
              : null,
            cancelAtPeriodEnd: activeSub.cancel_at_period_end,
          }
        : null,
      invoices: invoices.data.map((inv) => ({
        id: inv.id,
        date: inv.created * 1000,
        amount: inv.amount_paid || inv.amount_due,
        currency: inv.currency,
        status: inv.status,
        hostedUrl: inv.hosted_invoice_url ?? null,
      })),
      paymentMethods: paymentMethods.data.map((pm) => ({
        id: pm.id,
        brand: pm.card?.brand ?? "card",
        last4: pm.card?.last4 ?? "····",
        isDefault: pm.id === defaultPaymentMethodId,
      })),
      billingInfo: liveCustomer
        ? { email: liveCustomer.email, name: liveCustomer.name, address: liveCustomer.address }
        : null,
    });
  } catch (err) {
    console.error("Billing summary fetch failed:", err);
    return NextResponse.json({ error: "Couldn't load billing details" }, { status: 500 });
  }
}
