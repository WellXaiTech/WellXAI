import { redirect } from "next/navigation";

// chatgiza.com's root now goes straight into the product ("Ready when you
// are.") instead of a separate marketing landing page with its own "What
// can I help with?" hero — there's only one entry point into ChatGiZa now.
//
// force-dynamic: this route's actual destination now depends on the Host
// header (proxy.ts rewrites "/" to "/company" on wellxai.world before this
// component ever runs). Without this, Next.js prerenders "/" as a single
// static response and Vercel's edge CDN serves that same cached response
// for every host that points at this deployment, entirely bypassing proxy
// on cache hits -- which is exactly what made wellxai.world show this
// redirect instead of the company page the first time it was wired up.
export const dynamic = "force-dynamic";

export default function Home() {
  redirect("/chatgiza");
}
