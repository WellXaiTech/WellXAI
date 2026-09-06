import StorePageClient from "@/components/StorePageClient";

// See src/app/store/page.tsx for why force-dynamic is needed on every page
// reached through proxy.ts's host rewriting.
export const dynamic = "force-dynamic";

export default function TafutaPage() {
  return <StorePageClient />;
}
