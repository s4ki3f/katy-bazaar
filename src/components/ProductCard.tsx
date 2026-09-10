import Link from "next/link";
import type { Product } from "@/lib/products";
import { money } from "@/lib/format";
import { ProductImage } from "./ProductImage";
import { Stars } from "./Stars";
import { QuickAdd } from "./QuickAdd";

/*
 * Every badge carries white text, so each ground must clear 4.5:1 against white. `bg-secondary`
 * (#a855f7) reaches only 3.96:1 — fine for an icon under 1.4.11's 3:1, not for small text — so
 * "Fresh" uses the accent green instead, which is also the more natural reading of the word.
 *   destructive #dc2626  4.83:1
 *   accent      #37863f  4.52:1
 *   primary     #7b04c5  7.88:1
 */
const BADGE_STYLES: Record<string, string> = {
  Sale: "bg-destructive text-white",
  New: "bg-primary text-white",
  Popular: "bg-primary-dark text-white",
  Fresh: "bg-accent text-white",
};

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-soft transition-[box-shadow,border-color] duration-200 hover:border-primary/40 hover:shadow-lift">
      <Link href={`/product/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden">
        <ProductImage
          slug={product.slug}
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
            <span className="rounded-full bg-sign/90 px-2.5 py-1 text-xs font-bold text-on-sign backdrop-blur">
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
            <span className="font-display text-lg font-bold text-primary">{money(product.price)}</span>
            {product.oldPrice && (
              <span className="text-sm text-muted-foreground line-through decoration-destructive/60">{money(product.oldPrice)}</span>
            )}
          </div>
          <QuickAdd id={product.id} />
        </div>
      </div>
    </article>
  );
}
