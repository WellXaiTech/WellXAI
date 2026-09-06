// There's no account/login system yet (see the note in
// src/app/api/store/shops/route.ts) -- the editToken in a shop's dashboard
// URL IS the login. Saving the most recently created shop here means the
// same browser can find its way back to "Dashibodi" even after losing or
// closing that original tab, without needing real auth. Only ever read on
// the client (localStorage doesn't exist during server rendering).
const KEY = "chackall:my-shop";

export type LocalShop = { slug: string; name: string; editToken: string };

export function saveLocalShop(shop: LocalShop): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(shop));
  } catch {
    // Private browsing / storage disabled -- the seller just won't get
    // the "Duka lako" shortcut back; not worth failing shop creation over.
  }
}

export function getLocalShop(): LocalShop | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.slug === "string" && typeof parsed?.editToken === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}
