import Link from "next/link";
import type { Product } from "@/lib/products";
import { money } from "@/lib/format";
import { ProductThumb } from "./ProductThumb";
import { Stars } from "./Stars";
import { QuickAdd } from "./QuickAdd";

const BADGE_STYLES: Record<string, string> = {
  Sale: "bg-destructive text-white",
  New: "bg-accent text-white",
  Popular: "bg-primary text-white",
  Fresh: "bg-secondary text-white",
};

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-soft transition-shadow duration-200 hover:shadow-lift">
      <Link href={`/product/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden">
        <ProductThumb
          name={product.name}
          category={product.category}
          className="h-full w-full transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex gap-1.5">
          {product.badge && (
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${BADGE_STYLES[product.badge]}`}>
              {product.badge}
            </span>
          )}
          {product.halal && (
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-primary">
              Halal
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Stars rating={product.rating} reviews={product.reviews} />
        <h3 className="font-display text-base font-semibold leading-snug">
          <Link href={`/product/${product.slug}`} className="hover:text-primary">
            {product.name}
          </Link>
        </h3>
        <p className="text-xs text-muted-foreground">{product.unit}</p>

        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-lg font-bold text-foreground">{money(product.price)}</span>
            {product.oldPrice && (
              <span className="text-sm text-muted-foreground line-through">{money(product.oldPrice)}</span>
            )}
          </div>
          <QuickAdd id={product.id} />
        </div>
      </div>
    </article>
  );
}
