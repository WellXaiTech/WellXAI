import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { getShop, listProducts, addProduct } from "@/lib/chackallStore";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shop = await getShop(slug);
  if (!shop) return NextResponse.json({ error: "Duka halikupatikana." }, { status: 404 });
  const products = await listProducts(slug);
  return NextResponse.json({ products });
}

const LIMIT_PER_HOUR = 60;

// Adding a product is authenticated by the shop's own editToken (sent by
// the dashboard page, which only has it because it's baked into that
// page's own URL) rather than a signed-in user -- see the note on
// POST /api/store/shops.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shop = await getShop(slug);
  if (!shop) return NextResponse.json({ error: "Duka halikupatikana." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  if (token !== shop.editToken) return NextResponse.json({ error: "Huna ruhusa." }, { status: 403 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rate = await checkRateLimit(`store-add-product:${slug}:${ip}`, LIMIT_PER_HOUR, 3600);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Bidhaa nyingi mno kwa sasa -- jaribu baadaye." }, { status: 429 });
  }

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const price = typeof body?.price === "string" ? body.price.trim() : "";
  if (!name) return NextResponse.json({ error: "Jina la bidhaa linahitajika." }, { status: 400 });
  if (!price) return NextResponse.json({ error: "Bei ya bidhaa inahitajika." }, { status: 400 });

  try {
    const product = await addProduct(slug, {
      name,
      price,
      image: typeof body?.image === "string" && body.image ? body.image : null,
      video: typeof body?.video === "string" && body.video ? body.video : null,
      description: typeof body?.description === "string" && body.description ? body.description : null,
    });
    return NextResponse.json({ product });
  } catch (err) {
    console.error("Add product error:", err);
    return NextResponse.json({ error: "Imeshindwa kuongeza bidhaa." }, { status: 500 });
  }
}
