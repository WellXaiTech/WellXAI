import type { MetadataRoute } from "next";

const BASE_URL = "https://chatgiza.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const marketingPaths = [
    "",
    "/research",
    "/products",
    "/business",
    "/developers",
    "/company",
    "/foundation",
    "/stories",
    "/privacy",
    "/terms",
  ];

  return [
    ...marketingPaths.map((path) => ({
      url: `${BASE_URL}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.6,
    })),
    {
      url: `${BASE_URL}/chatgiza`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.3,
    },
  ];
}
