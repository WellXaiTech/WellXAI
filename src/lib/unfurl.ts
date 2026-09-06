import dns from "node:dns/promises";
import net from "node:net";

export interface UnfurlResult {
  url: string;
  title: string | null;
  image: string | null;
  video: string | null;
  description: string | null;
  siteName: string | null;
  price: string | null;
}

const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 8000;
// Capping how much of the page we read avoids buffering an entire product
// page (some run into megabytes) just to pull out a bit of metadata. Price
// (in a Product JSON-LD block) is frequently placed in <body>, not <head>,
// unlike plain og: meta tags -- so this has to be generous enough to
// actually reach it, not just stop at </head> the way title/image alone
// could get away with.
const MAX_BYTES = 2_000_000;
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    const a = parts[0];
    const b = parts[1];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata (169.254.169.254)
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }
  const lower = ip.toLowerCase();
  return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
}

// Blocks the classic "paste a link to our own internal service" SSRF: a
// public hostname's DNS can still resolve to (or later redirect to) a
// private/internal address, so every hop -- not just the URL the user
// typed -- gets checked before we ever fetch it.
async function assertPublicHost(hostname: string): Promise<void> {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost")) throw new Error("blocked host");

  const addresses = net.isIP(lower) ? [lower] : (await dns.lookup(lower, { all: true })).map((r) => r.address);
  if (addresses.length === 0 || addresses.some(isPrivateIp)) throw new Error("blocked host");
}

async function safeFetch(startUrl: string): Promise<Response> {
  let current = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const parsed = new URL(current);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("unsupported protocol");
    await assertPublicHost(parsed.hostname);

    // Redirects are followed manually (not `redirect: "follow"`) so each
    // hop gets the same private-address check above -- an auto-follow
    // would skip straight past that.
    const res = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        // Pasted links aren't always a webpage -- a direct image or video
        // file (e.g. straight to a .jpg/.mp4) is a normal thing to paste
        // too, so those need to be accepted here rather than just HTML.
        Accept: "text/html,application/xhtml+xml,image/*,video/*;q=0.9,*/*;q=0.5",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error("redirect with no location");
      current = new URL(location, current).toString();
      continue;
    }
    return res;
  }
  throw new Error("too many redirects");
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`, "i"),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match?.[1]) return decodeEntities(match[1]);
  }
  return null;
}

function extractTitleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1] ? decodeEntities(match[1].trim()) : null;
}

function formatPrice(amount: unknown, currency: unknown): string | null {
  const num = typeof amount === "number" ? amount : typeof amount === "string" ? Number(amount) : NaN;
  if (!Number.isFinite(num)) return null;
  return typeof currency === "string" && currency ? `${currency} ${num}` : String(num);
}

// Walks a parsed JSON-LD value looking for a Product node (or an Offer
// directly), including Product arrays and the @graph wrapper some sites
// use -- schema.org structured data is how most modern storefronts (and
// Google's own product-rich-results requirements) expose machine-readable
// price, so it's a far more reliable source than scraping visible text.
function findProductPrice(node: unknown): string | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findProductPrice(item);
      if (found) return found;
    }
    return null;
  }
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;

  const type = obj["@type"];
  const isProduct = type === "Product" || (Array.isArray(type) && type.includes("Product"));
  if (isProduct && obj.offers) {
    const offers = Array.isArray(obj.offers) ? obj.offers[0] : obj.offers;
    if (offers && typeof offers === "object") {
      const o = offers as Record<string, unknown>;
      const found = formatPrice(o.price, o.priceCurrency);
      if (found) return found;
    }
  }

  if (obj["@graph"]) {
    const found = findProductPrice(obj["@graph"]);
    if (found) return found;
  }
  return null;
}

function extractJsonLdPrice(html: string): string | null {
  const blocks = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1].trim());
      const found = findProductPrice(parsed);
      if (found) return found;
    } catch {
      // Malformed/partial JSON-LD is common enough (trailing commas, HTML
      // comments inside the block) -- just skip this block and try the next.
    }
  }
  return null;
}

// Falls back to the Open Graph Product extension's flat meta tags, used by
// some storefronts instead of (or alongside) JSON-LD.
function extractMetaPrice(html: string): string | null {
  const amount = extractMeta(html, "product:price:amount") ?? extractMeta(html, "og:price:amount");
  const currency = extractMeta(html, "product:price:currency") ?? extractMeta(html, "og:price:currency");
  return amount ? formatPrice(amount, currency) : null;
}

// A pasted link straight to a media file (product photo hosted on a CDN,
// a short product-demo video, etc.) has no HTML/OG tags to read -- the
// filename itself, decoded and without its extension, is the best
// available title.
function titleFromUrl(url: string): string | null {
  try {
    const last = new URL(url).pathname.split("/").filter(Boolean).pop();
    if (!last) return null;
    return decodeURIComponent(last.replace(/\.[a-z0-9]+$/i, "")).replace(/[-_]+/g, " ").trim() || null;
  } catch {
    return null;
  }
}

// Reads a product/article link's Open Graph tags (title, image,
// description, site name) -- the same metadata WhatsApp/Slack/Twitter use
// to render link previews, so it works across most storefronts (Shopify,
// eBay, Alibaba listings, etc.) without a per-platform integration. Amazon
// in particular often blocks non-browser requests outright even with a
// realistic User-Agent -- that surfaces as a thrown error here, and the
// caller should fall back to letting the person fill the card in by hand
// rather than pretending this always works.
export async function unfurlUrl(rawUrl: string): Promise<UnfurlResult> {
  const res = await safeFetch(rawUrl);
  if (!res.ok) throw new Error(`fetch failed with status ${res.status}`);

  const contentType = res.headers.get("content-type") ?? "";
  const finalUrl = res.url || rawUrl;

  // A direct link to the media itself -- the whole point of unfurling was
  // to find an image; if the link already IS one, use it as-is instead of
  // trying (and failing) to parse it as HTML.
  if (contentType.startsWith("image/")) {
    await res.body?.cancel().catch(() => {});
    return {
      url: finalUrl,
      title: titleFromUrl(finalUrl),
      image: finalUrl,
      video: null,
      description: null,
      siteName: null,
      price: null,
    };
  }
  if (contentType.startsWith("video/")) {
    await res.body?.cancel().catch(() => {});
    return {
      url: finalUrl,
      title: titleFromUrl(finalUrl),
      image: null,
      video: finalUrl,
      description: null,
      siteName: null,
      price: null,
    };
  }

  if (!contentType.includes("text/html")) throw new Error("not an HTML page");

  let html = "";
  const reader = res.body?.getReader();
  if (reader) {
    let bytes = 0;
    const decoder = new TextDecoder();
    while (bytes < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      html += decoder.decode(value, { stream: true });
    }
    await reader.cancel().catch(() => {});
  } else {
    html = await res.text();
  }

  const rawImage = extractMeta(html, "og:image");
  const rawVideo = extractMeta(html, "og:video:url") ?? extractMeta(html, "og:video");
  return {
    url: finalUrl,
    price: extractJsonLdPrice(html) ?? extractMetaPrice(html),
    title: extractMeta(html, "og:title") ?? extractTitleTag(html),
    image: rawImage ? new URL(rawImage, finalUrl).toString() : null,
    video: rawVideo ? new URL(rawVideo, finalUrl).toString() : null,
    description: extractMeta(html, "og:description") ?? extractMeta(html, "description"),
    siteName: extractMeta(html, "og:site_name"),
  };
}
