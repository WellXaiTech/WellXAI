import type { MetadataRoute } from "next";
import { headers } from "next/headers";

// Same cross-host cache-bleed risk fixed elsewhere with force-dynamic -- see
// the matching note in robots.ts.
export const dynamic = "force-dynamic";

// Excluded from the proxy's matcher (see src/proxy.ts and the matching note
// in robots.ts), so this reads the host itself. Each host only lists the
// paths that actually live there per proxy.ts's COMPANY_ONLY_EXACT /
// PRODUCT_ONLY_PREFIXES rules -- e.g. chatgiza.com/research immediately
// redirects to wellxai.world/research, so listing it under chatgiza.com's
// sitemap pointed crawlers at the wrong canonical URL.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get("host")?.split(":")[0] ?? "";
  const now = new Date();

  if (host === "support.wellxai.world") {
    return [{ url: "https://support.wellxai.world", lastModified: now, changeFrequency: "weekly", priority: 1 }];
  }

  if (host === "wellxai.world" || host === "www.wellxai.world") {
    const base = "https://wellxai.world";
    const marketingPaths = ["", "/research", "/products", "/business", "/developers", "/company", "/foundation", "/stories"];
    return marketingPaths.map((path) => ({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.6,
    }));
  }

  const base = "https://chatgiza.com";
  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/chatgiza`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];
}
