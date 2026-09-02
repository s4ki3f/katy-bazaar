import { Suspense } from "react";
import type { Metadata } from "next";
import { ShopBrowser } from "@/components/ShopBrowser";
import { getCatalog } from "@/lib/server/catalog";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse fresh halal meat, groceries, spices and more at Katy Bazaar.",
};

// Prices and stock come from the shop's live inventory, so this cannot be
// cached at build time.
export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const products = await getCatalog();
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-20 text-center text-muted-foreground">Loading the bazaar…</div>}>
      <ShopBrowser products={products} />
    </Suspense>
  );
}
