import AdminOverviewClient from "./AdminOverviewClient";

// This route is reached by proxy.ts rewriting "/" here on
// wx-6f44c8d2a535.wellxai.world. Without force-dynamic, Vercel's edge CDN
// can cache this page and serve that same cached response for other hosts'
// "/" requests too, since the cache key doesn't vary by Host by default --
// see the identical note on src/app/(marketing)/page.tsx, where this exact
// bug first showed up (it's what made this page sometimes land on ChatGiZa
// instead of the dashboard). Needs a server-component wrapper: route
// segment config exports like this one aren't allowed in a "use client"
// file, so the actual page content lives in AdminOverviewClient instead.
export const dynamic = "force-dynamic";

export default function AdminOverviewPage() {
  return <AdminOverviewClient />;
}
