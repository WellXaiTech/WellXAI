import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { createShop } from "@/lib/chackallStore";

const LIMIT_PER_HOUR = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public, no ChatGiZa account needed -- ChackAll is meant to stand on its
// own. A seller's only "login" is the private editToken this returns, kept
// in their dashboard URL (see /store/duka/[slug]/dhibiti) -- no
// email/SMS/password infrastructure needed for this MVP.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rate = await checkRateLimit(`store-create-shop:${ip}`, LIMIT_PER_HOUR, 3600);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many shops created -- try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const whatsapp = typeof body?.whatsapp === "string" ? body.whatsapp.trim() : "";
  if (!name) return NextResponse.json({ error: "Jina la duka linahitajika." }, { status: 400 });
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Barua pepe sahihi inahitajika." }, { status: 400 });
  }

  try {
    const shop = await createShop(name, email, whatsapp || null);
    return NextResponse.json({ slug: shop.slug, editToken: shop.editToken });
  } catch (err) {
    console.error("Create shop error:", err);
    return NextResponse.json({ error: "Imeshindwa kuunda duka." }, { status: 500 });
  }
}
