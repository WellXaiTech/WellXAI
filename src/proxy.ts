import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// wellxai.world is the official WellXAI *company* site (marketing pages);
// chatgiza.com is the ChatGiZa *product* -- chat only; support.wellxai.world
// is the Help Center and admin.wellxai.world is the admin dashboard --
// each its own standalone site (no main nav/footer -- support's own header
// in src/app/support/page.tsx, admin's own AdminShell), same relationship
// chatgiza.com has to wellxai.world. All four are served from this same
// Next.js app rather than separate deployments, since the (marketing) route
// group, the admin dashboard, and the chat app already exist here. This
// proxy just decides which host is allowed to show what:
//
//  - wellxai.world "/" is rewritten to "/home" (its home page).
//  - support.wellxai.world "/" is rewritten to "/support" (its only page).
//  - admin.wellxai.world's paths are rewritten with the "/wx-6f44c8d2a535"
//    prefix prepended -- e.g. admin.wellxai.world/users serves the page at
//    src/app/wx-6f44c8d2a535/users, without that prefix ever showing up in
//    the admin subdomain's own URLs.
//  - Any host visiting "/support" or "/wx-6f44c8d2a535" (and its sub-routes)
//    is redirected to the matching subdomain instead of serving it locally
//    -- those only exist on their own subdomains now.
//  - chatgiza.com visiting a company-only path is redirected to the same
//    path on wellxai.world instead of serving it locally.
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
const SUPPORT_HOSTS = new Set(["support.wellxai.world"]);
const SUPPORT_HOSTNAME = "support.wellxai.world";
const SUPPORT_PREFIX = "/support";
// Deliberately not "admin.wellxai.world" -- an obvious name defeats the
// point of the admin panel already living behind an unguessable path;
// reusing that same secret string as the subdomain keeps it consistent.
const ADMIN_HOSTNAME = "wx-6f44c8d2a535.wellxai.world";
const ADMIN_HOSTS = new Set([ADMIN_HOSTNAME]);
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
]);
const COMPANY_ONLY_PREFIXES = ["/workspace", "/advertise"];
// The chat product itself -- never allowed on the company domain.
const PRODUCT_ONLY_PREFIXES = ["/chatgiza"];

function matchesAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isCompanyOnlyPath(pathname: string): boolean {
  return COMPANY_ONLY_EXACT.has(pathname) || matchesAny(pathname, COMPANY_ONLY_PREFIXES);
}

// Redirects `pathname` (on any host) over to `hostname`, stripping `prefix`
// off the front -- e.g. "/support/foo" -> https://support.wellxai.world/foo.
function redirectToSubdomain(req: NextRequest, hostname: string, prefix: string) {
  const url = new URL(req.url);
  url.hostname = hostname;
  url.pathname = req.nextUrl.pathname.slice(prefix.length) || "/";
  return NextResponse.redirect(url);
}

export function proxy(req: NextRequest) {
  const host = req.headers.get("host")?.split(":")[0] ?? "";
  const { pathname } = req.nextUrl;

  if (SUPPORT_HOSTS.has(host)) {
    if (pathname === "/") return NextResponse.rewrite(new URL("/support", req.url));
    return NextResponse.next();
  }

  if (ADMIN_HOSTS.has(host)) {
    const url = new URL(req.url);
    url.pathname = ADMIN_PREFIX + (pathname === "/" ? "" : pathname);
    return NextResponse.rewrite(url);
  }

  if (matchesAny(pathname, [SUPPORT_PREFIX])) return redirectToSubdomain(req, SUPPORT_HOSTNAME, SUPPORT_PREFIX);
  if (matchesAny(pathname, [ADMIN_PREFIX])) return redirectToSubdomain(req, ADMIN_HOSTNAME, ADMIN_PREFIX);

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
