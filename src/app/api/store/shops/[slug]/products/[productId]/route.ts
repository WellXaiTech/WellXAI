import { NextRequest, NextResponse } from "next/server";
import { getShop, deleteProduct } from "@/lib/chackallStore";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string; productId: string }> }) {
  const { slug, productId } = await params;
  const shop = await getShop(slug);
  if (!shop) return NextResponse.json({ error: "Duka halikupatikana." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  if (token !== shop.editToken) return NextResponse.json({ error: "Huna ruhusa." }, { status: 403 });

  await deleteProduct(slug, productId);
  return NextResponse.json({ ok: true });
}
