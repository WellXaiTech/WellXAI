export type PlanTier = "starter" | "growth" | "enterprise";

export const PLAN_TIERS: PlanTier[] = ["starter", "growth", "enterprise"];

export const PLAN_DETAILS: Record<
  PlanTier,
  { name: string; priceUsd: number; features: string[] }
> = {
  starter: {
    name: "Starter",
    priceUsd: 10,
    features: [
      "Unlimited chat messages",
      "Standard response speed",
      "Basic image generation",
      "Company KYC — profile & request tracking",
      "Email support",
    ],
  },
  growth: {
    name: "Growth",
    priceUsd: 20,
    features: [
      "Everything in Starter",
      "Priority response speed",
      "HD image & video generation",
      "Web search & Deep research",
      "Company KYC analytics (day/week/month/year)",
    ],
  },
  enterprise: {
    name: "Enterprise",
    priceUsd: 100,
    features: [
      "Everything in Growth",
      "Company KYC at scale — high customer request volume",
      "Multiple team members",
      "Dedicated support",
    ],
  },
};
