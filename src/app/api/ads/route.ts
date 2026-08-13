import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getAllAds, saveAllAds, isValidDurationSeconds, priceForDurationSeconds, type Ad } from "@/lib/ads";
import { getStripe, getOrCreateCustomer } from "@/lib/stripe";

const MAX_TEXT_LENGTH = 500;

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const headline = typeof body?.headline === "string" ? body.headline.trim().slice(0, MAX_TEXT_LENGTH) : "";
  const subtitle = typeof body?.subtitle === "string" ? body.subtitle.trim().slice(0, MAX_TEXT_LENGTH) : "";
  const imageUrl = typeof body?.imageUrl === "string" ? body.imageUrl.trim().slice(0, 2000) : "";
  const linkUrl = typeof body?.linkUrl === "string" ? body.linkUrl.trim().slice(0, 2000) : "";
  const countries = Array.isArray(body?.countries)
    ? body.countries.filter((c: unknown): c is string => typeof c === "string" && c.trim().length > 0).map((c: string) => c.trim().toUpperCase())
    : [];
  const durationSeconds = Number(body?.durationSeconds);

  if (!headline || !subtitle) {
    return NextResponse.json({ error: "Headline and subtitle are required" }, { status: 400 });
  }
  if (countries.length === 0) {
    return NextResponse.json({ error: "Choose at least one country" }, { status: 400 });
  }
  if (!isValidDurationSeconds(durationSeconds)) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  }
  const priceCents = priceForDurationSeconds(durationSeconds);
  if (priceCents === null) {
    return NextResponse.json({ error: "No price available for that duration" }, { status: 400 });
  }

  const ad: Ad = {
    id: crypto.randomUUID(),
    advertiserUserId: userId,
    advertiserEmail: session?.user?.email ?? "",
    headline,
    subtitle,
    imageUrl,
    linkUrl,
    countries,
    durationSeconds,
    // Enters the admin review queue only once payment is confirmed (see
    // /api/ads/checkout/verify) -- never before, so nothing unpaid can slip
    // into the Events rotation.
    status: "pending_payment",
    createdAt: Date.now(),
    startsAt: null,
    expiresAt: null,
    rejectionReason: null,
    priceCents,
    currency: "usd",
    paymentStatus: "pending",
  };

  try {
    const ads = await getAllAds();
    ads.unshift(ad);
    await saveAllAds(ads);

    const stripe = getStripe();
    const origin = req.headers.get("origin") ?? req.nextUrl.origin;
    const customerId = await getOrCreateCustomer(userId, session?.user?.email, session?.user?.name);
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: priceCents,
            product_data: {
              name: `ChatGiZa Ads — ${headline}`,
              description: `${countries.join(", ")} · ${Math.round(durationSeconds / 60)} min live`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/advertise?ad_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/advertise?ad_cancelled=1`,
      metadata: { adId: ad.id },
      client_reference_id: userId,
    });

    return NextResponse.json({ ad, checkoutUrl: checkoutSession.url });
  } catch (err) {
    console.error("Ad create error", err);
    return NextResponse.json({ error: "Failed to create ad" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const ads = await getAllAds();
  const mine = ads.filter((a) => a.advertiserUserId === userId);
  return NextResponse.json({ ads: mine });
}
