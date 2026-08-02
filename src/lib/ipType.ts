import { kv } from "@vercel/kv";

function ipTypeKey(ip: string) {
  return `chatgiza:ip-type:${ip}`;
}

const CACHE_TTL_SECONDS = 24 * 60 * 60;

/**
 * Best-effort classification of whether an IP belongs to a mobile/cellular
 * carrier network (as opposed to home/office WiFi or fixed broadband) — used
 * to scope the strict "one free message forever" wall to SIM/mobile-data
 * connections only, since those are trivial to cycle through by swapping
 * SIMs, while a WiFi network is far more likely to be shared by several
 * unrelated, legitimate people. Defaults to "not mobile" whenever the lookup
 * is inconclusive or fails — safer to under-restrict a shared WiFi network
 * than to wrongly lock someone out of the app forever over a failed call to
 * a third-party service.
 */
export async function isMobileIp(ip: string): Promise<boolean> {
  if (!ip || ip === "unknown") return false;

  try {
    const cached = await kv.get<string>(ipTypeKey(ip));
    if (cached === "mobile") return true;
    if (cached === "other") return false;
  } catch {
    // Cache is an optimization — fall through to a fresh lookup either way.
  }

  try {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,mobile`);
    if (!res.ok) return false;
    const data = await res.json();
    const mobile = data.status === "success" && data.mobile === true;
    try {
      await kv.set(ipTypeKey(ip), mobile ? "mobile" : "other", { ex: CACHE_TTL_SECONDS });
    } catch {
      // Non-fatal — just means we look this IP up again next time.
    }
    return mobile;
  } catch (err) {
    console.error("IP type lookup failed:", err);
    return false;
  }
}
