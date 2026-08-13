import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getStripe, getOrCreateCustomer } from "@/lib/stripe";

// Redirects to Stripe's own hosted Customer Portal for anything that means
// collecting or editing real card/billing-address data — safer than building
// a custom card-entry form here, and it's Stripe's real, secure surface for
// the account owner to manage their own payment methods and billing info.
// Stripe's portal URL is itself a pre-authorized, one-time-use link -- once
// the app hands it to the browser, the browser doesn't need its own signed-
// in session on chatgiza.com (it never had one), the link works standalone.
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const customerId = await getOrCreateCustomer(userId, session?.user?.email, session?.user?.name);
    const stripe = getStripe();
    const origin = req.headers.get("origin") ?? req.nextUrl.origin;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/chatgiza`,
    });
    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("Billing portal session failed:", err);
    const message = err instanceof Error ? err.message : "Couldn't open billing portal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
