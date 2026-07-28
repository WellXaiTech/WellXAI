import Stripe from "stripe";
import { PLAN_DETAILS, type PlanTier } from "@/lib/plans";

export type { PlanTier } from "@/lib/plans";
export { PLAN_TIERS, PLAN_DETAILS } from "@/lib/plans";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

function lookupKeyFor(tier: PlanTier) {
  return `chatgiza_${tier}_monthly`;
}

export async function getOrCreatePriceId(tier: PlanTier): Promise<string> {
  const stripe = getStripe();
  const lookupKey = lookupKeyFor(tier);

  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  if (existing.data[0]) return existing.data[0].id;

  const details = PLAN_DETAILS[tier];
  const product = await stripe.products.create({
    name: `ChatGiZa ${details.name}`,
    description: details.features.join(" · "),
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: details.priceUsd * 100,
    currency: "usd",
    recurring: { interval: "month" },
    lookup_key: lookupKey,
  });

  return price.id;
}
