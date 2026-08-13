import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getAllAds, isAdActive, resolveLanguageQuery } from "@/lib/ads";

// Public-facing (any signed-in user/device), used by the Events carousel on
// both web and the Android app -- only exposes the fields a viewer actually
// needs to render the banner, never the advertiser's identity or internal
// review state.
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const country = (req.nextUrl.searchParams.get("country") ?? "").trim().toUpperCase();
  const language = resolveLanguageQuery(req.nextUrl.searchParams.get("language") ?? "");
  const now = Date.now();
  const ads = await getAllAds();
  const active = ads
    .filter(
      (ad) =>
        isAdActive(ad, now) &&
        (!country || ad.countries.includes(country)) &&
        (!language || ad.language === language)
    )
    .map((ad) => ({
      id: ad.id,
      headline: ad.headline,
      subtitle: ad.subtitle,
      imageUrl: ad.imageUrl,
      linkUrl: ad.linkUrl,
    }));

  return NextResponse.json({ ads: active });
}
