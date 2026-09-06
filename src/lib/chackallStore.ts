import { randomBytes } from "node:crypto";
import { kv } from "@vercel/kv";

export type Shop = {
  slug: string;
  name: string;
  // Email is the required, universal contact method -- WhatsApp isn't
  // dominant everywhere in the world the way it is across East Africa, so
  // it's an optional extra a seller can add on top, not the only way to
  // reach them.
  email: string;
  whatsapp: string | null; // digits only, no "+" -- ready to drop into a wa.me link
  editToken: string;
  createdAt: number;
};

export type Product = {
  id: string;
  name: string;
  price: string;
  image: string | null;
  video: string | null;
  description: string | null;
  createdAt: number;
};

function shopKey(slug: string) {
  return `chackall:shop:${slug}`;
}
function productsKey(slug: string) {
  return `chackall:shop:${slug}:products`;
}

function baseSlugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return slug || "duka";
}

// Strips everything but digits so the number drops straight into a
// wa.me/<digits> link -- WhatsApp's own click-to-chat format, no "+",
// spaces, or dashes.
export function normalizeWhatsapp(raw: string): string {
  return raw.replace(/\D/g, "");
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = baseSlugify(name);
  if (!(await kv.exists(shopKey(base)))) return base;
  // Collision -- append a short random suffix rather than an incrementing
  // counter, so two concurrent signups for the same name can't race each
  // other onto the same slug.
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${base}-${randomBytes(2).toString("hex")}`;
    if (!(await kv.exists(shopKey(candidate)))) return candidate;
  }
  return `${base}-${randomBytes(4).toString("hex")}`;
}

export async function createShop(name: string, email: string, whatsapp: string | null): Promise<Shop> {
  const slug = await generateUniqueSlug(name);
  const shop: Shop = {
    slug,
    name: name.trim(),
    email: email.trim(),
    whatsapp: whatsapp ? normalizeWhatsapp(whatsapp) : null,
    editToken: randomBytes(24).toString("hex"),
    createdAt: Date.now(),
  };
  await kv.set(shopKey(slug), shop);
  return shop;
}

export async function getShop(slug: string): Promise<Shop | null> {
  return (await kv.get<Shop>(shopKey(slug))) ?? null;
}

export async function listProducts(slug: string): Promise<Product[]> {
  return (await kv.get<Product[]>(productsKey(slug))) ?? [];
}

export async function addProduct(
  slug: string,
  input: { name: string; price: string; image: string | null; video: string | null; description: string | null }
): Promise<Product> {
  const product: Product = {
    id: randomBytes(8).toString("hex"),
    name: input.name.trim(),
    price: input.price.trim(),
    image: input.image,
    video: input.video,
    description: input.description,
    createdAt: Date.now(),
  };
  const current = await listProducts(slug);
  await kv.set(productsKey(slug), [product, ...current]);
  return product;
}

export async function deleteProduct(slug: string, productId: string): Promise<void> {
  const current = await listProducts(slug);
  await kv.set(
    productsKey(slug),
    current.filter((p) => p.id !== productId)
  );
}
