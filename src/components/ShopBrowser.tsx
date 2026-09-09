"use client";

import { useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { categories, type Product } from "@/lib/products";
import { ProductCard } from "./ProductCard";
import { SearchIcon } from "./icons";

type Sort = "popular" | "price-asc" | "price-desc" | "rating";

export function ShopBrowser({ products }: { products: Product[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // The URL is the single source of truth for category and query. Mirroring
  // it into state and re-syncing from an effect caused a cascading render on
  // every navigation; deriving it here cannot drift.
  const category = params.get("category") ?? "all";
  const query = params.get("q") ?? "";
  const [sort, setSort] = useState<Sort>("popular");

  function setParam(key: string, value: string, keep = true) {
    const sp = new URLSearchParams(Array.from(params.entries()));
    if (!value || (key === "category" && value === "all")) sp.delete(key);
    else sp.set(key, value);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: keep });
  }

  const selectCategory = (slug: string) => setParam("category", slug, false);
  const setQuery = (v: string) => setParam("q", v);

  const results = useMemo(() => {
    let list = products.slice();
    if (category !== "all") list = list.filter((p) => p.category === category);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }
    switch (sort) {
      case "price-asc": list.sort((a, b) => a.price - b.price); break;
      case "price-desc": list.sort((a, b) => b.price - a.price); break;
      case "rating": list.sort((a, b) => b.rating - a.rating); break;
      default:
        list.sort((a, b) => (b.badge === "Popular" ? 1 : 0) - (a.badge === "Popular" ? 1 : 0));
    }
    return list;
  }, [products, category, query, sort]);

  const activeName = category === "all" ? "All Products" : categories.find((c) => c.slug === category)?.name;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-8">
        <p className="text-sm font-bold uppercase tracking-widest text-primary">Shop the bazaar</p>
        <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{activeName}</h1>
        <p className="mt-1 text-muted-foreground">{results.length} {results.length === 1 ? "product" : "products"} available</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        {/* sidebar */}
        <aside className="lg:sticky lg:top-36 lg:self-start">
          <div className="relative mb-4">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" width={18} height={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              aria-label="Search products"
              className="w-full rounded-full border border-field bg-surface py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <h2 className="px-1 pb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Categories</h2>
          <ul className="flex gap-2 overflow-x-auto no-scrollbar lg:flex-col lg:gap-1 lg:overflow-visible">
            {[{ slug: "all", name: "All Products" }, ...categories].map((c) => (
              <li key={c.slug} className="shrink-0">
                <button
                  type="button"
                  onClick={() => selectCategory(c.slug)}
                  className={`w-full whitespace-nowrap rounded-full px-4 py-2 text-left text-sm font-medium transition-colors cursor-pointer ${
                    category === c.slug ? "bg-primary text-on-primary" : "text-foreground/75 hover:bg-muted"
                  }`}
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* results */}
        <div>
          <div className="mb-5 flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Showing {results.length} results</span>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Sort</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="rounded-full border border-field bg-surface px-3 py-2 text-sm font-medium outline-none focus:border-primary cursor-pointer"
              >
                <option value="popular">Most popular</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="rating">Top rated</option>
              </select>
            </label>
          </div>

          {results.length ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {results.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="rounded-card border border-dashed border-border bg-surface py-20 text-center">
              <p className="font-display text-lg font-semibold">No products found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try a different search or category.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
