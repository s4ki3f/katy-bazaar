import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, getCategory, products, productsByCategory } from "@/lib/products";
import { money } from "@/lib/format";
import { ProductImage } from "@/components/ProductImage";
import { ProductCard } from "@/components/ProductCard";
import { AddToCart } from "@/components/AddToCart";
import { Stars } from "@/components/Stars";
import { CheckIcon, ShieldIcon, TruckIcon, ArrowIcon } from "@/components/icons";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) return { title: "Product not found" };
  return { title: p.name, description: p.description };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const cat = getCategory(product.category);
  const related = productsByCategory(product.category).filter((p) => p.id !== product.id).slice(0, 4);
  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      {/* breadcrumb */}
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-primary">Home</Link><span>/</span>
        <Link href="/shop" className="hover:text-primary">Shop</Link><span>/</span>
        <Link href={`/shop?category=${product.category}`} className="hover:text-primary">{cat?.name}</Link><span>/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* image */}
        <div className="relative overflow-hidden rounded-card border border-border shadow-soft">
          <ProductImage slug={product.slug} name={product.name} category={product.category} className="aspect-square w-full" />
          <div className="absolute left-4 top-4 flex gap-2">
            {product.badge && <span className="rounded-full bg-white/95 px-3 py-1 text-sm font-bold text-primary">{product.badge}</span>}
            {product.halal && <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-white">Zabihah Halal</span>}
          </div>
        </div>

        {/* details */}
        <div>
          <Link href={`/shop?category=${product.category}`} className="text-sm font-bold uppercase tracking-widest text-primary">{cat?.name}</Link>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{product.name}</h1>
          <div className="mt-3"><Stars rating={product.rating} reviews={product.reviews} size={18} /></div>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="font-display text-4xl font-bold">{money(product.price)}</span>
            {product.oldPrice && <span className="text-xl text-muted-foreground line-through">{money(product.oldPrice)}</span>}
            {discount > 0 && <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-sm font-bold text-destructive">Save {discount}%</span>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{product.unit}</p>

          <p className="mt-5 leading-relaxed text-foreground/80">{product.description}</p>

          <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <span className="h-2 w-2 rounded-full bg-primary" />
            {product.stock > 0 ? `In stock — ${product.stock} available` : "Out of stock"}
          </div>

          <div className="mt-6">
            <AddToCart id={product.id} stock={product.stock} />
          </div>

          <ul className="mt-8 grid gap-3 rounded-card border border-border bg-muted p-5 sm:grid-cols-2">
            {[
              { icon: ShieldIcon, t: "100% Zabihah halal certified" },
              { icon: CheckIcon, t: "Cut & packed fresh daily" },
              { icon: TruckIcon, t: "Free local delivery over $60" },
              { icon: CheckIcon, t: "Custom cuts at no extra cost" },
            ].map(({ icon: Icon, t }) => (
              <li key={t} className="flex items-center gap-2.5 text-sm text-foreground/80">
                <Icon width={18} height={18} className="shrink-0 text-primary" /> {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* related */}
      {related.length > 0 && (
        <section className="mt-20">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">More from {cat?.name}</h2>
            <Link href={`/shop?category=${product.category}`} className="hidden items-center gap-1.5 text-sm font-semibold text-primary hover:underline sm:inline-flex">
              View all <ArrowIcon width={16} height={16} />
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
