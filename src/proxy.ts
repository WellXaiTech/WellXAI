import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// wellxai.world is the official WellXAI *company* site (marketing pages +
// admin dashboard); chatgiza.com is the ChatGiZa *product* -- chat only.
// Both are served from this same Next.js app rather than a second
// deployment, since the (marketing) route group and the admin dashboard
// already exist here. This proxy just decides which host is allowed to
// show what:
//
//  - wellxai.world "/" is rewritten to "/home" (its home page).
//  - chatgiza.com visiting a company-only or admin path is redirected to
//    the same path on wellxai.world instead of serving it locally -- e.g.
//    chatgiza.com/wx-6f44c8d2a535 -> wellxai.world/wx-6f44c8d2a535.
//  - wellxai.world visiting the product itself (/chatgiza and its
//    sub-routes, e.g. /chatgiza/build) is redirected the other way, back
//    to chatgiza.com -- wellxai.world must never render the chat app.
//
// /terms and /privacy are deliberately NOT redirected away from
// chatgiza.com: the sign-in page (src/app/login/page.tsx) links to them
// directly as part of the product's own flow, so they need to keep working
// on chatgiza.com too, not just wellxai.world.
//
// Named `proxy` (not `middleware`) and living at `src/proxy.ts` (next to
// `src/app`, not the project root) -- Next.js 16 renamed the file
// convention and moved where it's expected to live when using a `src/`
// layout; see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
const COMPANY_HOSTS = new Set(["wellxai.world", "www.wellxai.world"]);
const PRODUCT_HOSTS = new Set(["chatgiza.com", "www.chatgiza.com"]);

const ADMIN_PREFIX = "/wx-6f44c8d2a535";
// Paths (and, for the ones with their own sub-routes, prefixes) that only
// make sense on the company site, never on the product domain.
const COMPANY_ONLY_EXACT = new Set([
  "/home",
  "/company",
  "/business",
  "/developers",
  "/foundation",
  "/research",
  "/products",
  "/stories",
  "/support",
]);
const COMPANY_ONLY_PREFIXES = ["/workspace", "/advertise", ADMIN_PREFIX];
// The chat product itself -- never allowed on the company domain.
const PRODUCT_ONLY_PREFIXES = ["/chatgiza"];

function matchesAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isCompanyOnlyPath(pathname: string): boolean {
  return COMPANY_ONLY_EXACT.has(pathname) || matchesAny(pathname, COMPANY_ONLY_PREFIXES);
}

export function proxy(req: NextRequest) {
  const host = req.headers.get("host")?.split(":")[0] ?? "";
  const { pathname } = req.nextUrl;

  if (COMPANY_HOSTS.has(host)) {
    if (pathname === "/") return NextResponse.rewrite(new URL("/home", req.url));
    if (matchesAny(pathname, PRODUCT_ONLY_PREFIXES)) {
      const url = new URL(req.url);
      url.hostname = "chatgiza.com";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (PRODUCT_HOSTS.has(host) && isCompanyOnlyPath(pathname)) {
    const url = new URL(req.url);
    url.hostname = "wellxai.world";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except API routes, Next internals, and static files -- those
  // never need company/product host logic and shouldn't pay the extra hop.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
