import { NextRequest, NextResponse } from "next/server";
import { getShop } from "@/lib/chackallStore";

// Public shop lookup -- name, email, and WhatsApp number only (a
// business's own contact details, meant to be public so buyers can reach
// them). editToken is never included in this response; it only ever lives
// in the seller's own dashboard URL.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shop = await getShop(slug);
  if (!shop) return NextResponse.json({ error: "Duka halikupatikana." }, { status: 404 });
  return NextResponse.json({ slug: shop.slug, name: shop.name, email: shop.email, whatsapp: shop.whatsapp });
}
