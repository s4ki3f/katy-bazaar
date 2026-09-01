import { Suspense } from "react";
import type { Metadata } from "next";
import { ShopBrowser } from "@/components/ShopBrowser";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse fresh halal meat, groceries, spices and more at Katy Bazaar.",
};

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-20 text-center text-muted-foreground">Loading the bazaar…</div>}>
      <ShopBrowser />
    </Suspense>
  );
}
