import Stripe from "stripe";
import { kv } from "@vercel/kv";
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

function stripeCustomerKey(userId: string) {
  return `chatgiza:stripe-customer:${userId}`;
}

/** Read-only lookup — never creates a customer, unlike getOrCreateCustomer. */
export async function getExistingCustomerId(userId: string): Promise<string | null> {
  try {
    return (await kv.get<string>(stripeCustomerKey(userId))) ?? null;
  } catch (err) {
    console.error("Stripe customer KV lookup failed:", err);
    return null;
  }
}

/**
 * Persists a real Stripe Customer id per account (in KV) the first time it's
 * needed, so later checkouts and the Billing tab's history/payment-methods
 * lookups all resolve to the same Stripe customer instead of Checkout
 * creating a fresh anonymous one every time.
 */
export async function getOrCreateCustomer(userId: string, email?: string | null, name?: string | null): Promise<string> {
  const stripe = getStripe();
  try {
    const existing = await kv.get<string>(stripeCustomerKey(userId));
    if (existing) return existing;
  } catch (err) {
    console.error("Stripe customer KV lookup failed:", err);
  }

  const customer = await stripe.customers.create({
    email: email ?? undefined,
    name: name ?? undefined,
    metadata: { chatgizaUserId: userId },
  });

  try {
    await kv.set(stripeCustomerKey(userId), customer.id);
  } catch (err) {
    console.error("Stripe customer KV set failed:", err);
  }

  return customer.id;
}
