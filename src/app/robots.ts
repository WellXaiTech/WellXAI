import type { MetadataRoute } from "next";
import { headers } from "next/headers";

// Same cross-host cache-bleed risk fixed elsewhere with force-dynamic (see
// support/support-page, admin overview) -- this path is identical across
// every host, so Vercel's edge cache (which doesn't vary by Host) could
// otherwise serve one host's robots.txt to another.
export const dynamic = "force-dynamic";

// robots.txt/sitemap.xml are excluded from the proxy's matcher (see
// src/proxy.ts) since they're static/metadata routes, not pages -- so this
// has to do its own host check via headers() rather than relying on the
// proxy to route it. Without this, every host (wellxai.world,
// support.wellxai.world, chatgiza.com, the admin dashboard) served the same
// chatgiza.com sitemap, sending crawlers on wellxai.world to the wrong site.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host")?.split(":")[0] ?? "";

  // Unguessable-on-purpose admin dashboard -- never index it, and don't even
  // hint at its existence via a sitemap reference.
  if (host === "wx-6f44c8d2a535.wellxai.world") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  const base =
    host === "wellxai.world" || host === "www.wellxai.world"
      ? "https://wellxai.world"
      : host === "support.wellxai.world"
        ? "https://support.wellxai.world"
        : "https://chatgiza.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
