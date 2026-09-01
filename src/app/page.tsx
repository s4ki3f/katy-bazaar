import Link from "next/link";
import { site, valueProps } from "@/lib/site.config";
import { categories, products } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { Reveal } from "@/components/Reveal";
import { Stars } from "@/components/Stars";
import { HeroSearch } from "@/components/HeroSearch";
import { ICON_MAP, ArrowIcon, CheckIcon } from "@/components/icons";

export default function HomePage() {
  const popular = products.filter((p) => p.badge === "Popular").slice(0, 4);
  const fresh = products.filter((p) => ["New", "Fresh", "Sale"].includes(p.badge ?? "")).slice(0, 8);

  return (
    <>
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary via-primary-dark to-[#065f46]" />
        <div className="absolute -right-24 -top-24 -z-10 h-96 w-96 rounded-full bg-secondary/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 -z-10 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />

        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:py-24">
          <div className="text-white">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-accent" /> 100% Zabihah Halal · Katy, TX
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
              Fresh halal meat &<br />everyday groceries.
            </h1>
            <p className="mt-5 max-w-md text-lg text-white/85">{site.tagline}</p>

            <HeroSearch />

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/80">
              {["Cut fresh daily", "Order ahead for pickup", "Trusted since day one"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <CheckIcon width={16} height={16} className="text-accent" /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* hero visual: featured product tiles */}
          <div className="relative hidden lg:block">
            <div className="grid grid-cols-2 gap-4">
              {popular.slice(0, 4).map((p, i) => (
                <Reveal key={p.id} delay={i * 80} className={i % 2 ? "mt-8" : ""}>
                  <div className="rounded-card bg-white/95 p-3 shadow-lift backdrop-blur">
                    <ProductCardMini slug={p.slug} name={p.name} category={p.category} price={p.price} />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── VALUE PROPS ─── */}
      <section className="mx-auto max-w-7xl px-6">
        <div className="-mt-8 grid gap-4 rounded-card border border-border bg-surface p-6 shadow-soft sm:grid-cols-2 lg:grid-cols-4 lg:p-8 relative z-10">
          {valueProps.map((v) => {
            const Icon = ICON_MAP[v.icon as keyof typeof ICON_MAP];
            return (
              <div key={v.title} className="flex gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                  <Icon width={24} height={24} />
                </span>
                <div>
                  <h3 className="font-display text-base font-semibold">{v.title}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{v.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── CATEGORIES ─── */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <SectionHead eyebrow="Shop by aisle" title="Everything for your kitchen" href="/shop" cta="View all" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((c, i) => (
            <Reveal key={c.slug} delay={i * 50}>
              <Link
                href={`/shop?category=${c.slug}`}
                className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-card p-5 text-white shadow-soft transition-shadow hover:shadow-lift"
                style={{ background: `linear-gradient(135deg, ${c.hue[0]}, ${c.hue[1]})` }}
              >
                <div className="absolute right-4 top-4 opacity-0 transition-opacity group-hover:opacity-100">
                  <ArrowIcon width={22} height={22} />
                </div>
                <h3 className="font-display text-lg font-bold">{c.name}</h3>
                <p className="text-sm text-white/80">{c.blurb}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── MEAT COUNTER BAND ─── */}
      <section className="bg-foreground text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-6 py-16 lg:grid-cols-2">
          <Reveal>
            <span className="text-sm font-bold uppercase tracking-widest text-accent">The Meat Counter</span>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Cut fresh, the way you ask for it.</h2>
            <p className="mt-4 max-w-md text-white/70">
              Our in-house butchers hand-cut beef, lamb, goat and chicken to order — boneless, bone-in, cubes, mince, or whole.
              Every animal is slaughtered zabihah halal. Just tell us how you cook it.
            </p>
            <ul className="mt-6 space-y-2">
              {["Custom cuts at no extra charge", "Ground fresh while you shop", "Bulk & event orders welcome"].map((t) => (
                <li key={t} className="flex items-center gap-2.5 text-white/85">
                  <CheckIcon width={18} height={18} className="text-secondary" /> {t}
                </li>
              ))}
            </ul>
            <Link href="/shop?category=halal-meat" className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-white transition-colors hover:bg-accent-dark">
              Shop the meat counter <ArrowIcon width={18} height={18} />
            </Link>
          </Reveal>
          <div className="grid grid-cols-2 gap-4">
            {[
              { k: "Daily", v: "Fresh cuts" },
              { k: "4", v: "Meat types" },
              { k: "100%", v: "Zabihah halal" },
              { k: "0$", v: "Custom-cut fee" },
            ].map((s) => (
              <div key={s.v} className="rounded-card border border-white/10 bg-white/5 p-6 text-center">
                <div className="font-display text-3xl font-bold text-accent">{s.k}</div>
                <div className="mt-1 text-sm text-white/70">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FRESH THIS WEEK ─── */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <SectionHead eyebrow="Fresh this week" title="New, on sale & in season" href="/shop" cta="Shop all" />
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {fresh.map((p, i) => (
            <Reveal key={p.id} delay={(i % 4) * 60}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="bg-muted">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <SectionHead eyebrow="Loved locally" title="What Katy families say" />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              { n: "Ayesha R.", t: "The only place I trust for halal meat in Katy. The goat curry cuts are always fresh and cleaned perfectly." },
              { n: "Imran S.", t: "Basmati, spices, frozen parathas — I order ahead online and my whole month's groceries are bagged and ready when I arrive." },
              { n: "Fatima K.", t: "They ground the beef fresh while I shopped and even cut it exactly how I wanted. Wonderful service." },
            ].map((r) => (
              <Reveal key={r.n}>
                <figure className="flex h-full flex-col rounded-card border border-border bg-surface p-6 shadow-soft">
                  <Stars rating={5} />
                  <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-foreground/80">“{r.t}”</blockquote>
                  <figcaption className="mt-4 font-display text-sm font-semibold">{r.n}</figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="overflow-hidden rounded-card bg-gradient-to-br from-primary to-primary-dark px-8 py-14 text-center text-white shadow-lift sm:px-16">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Ready to fill your cart?</h2>
          <p className="mx-auto mt-3 max-w-lg text-white/85">
            Browse the full bazaar, order ahead, and pick up fresh in-store.
          </p>
          <Link href="/shop" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 font-semibold text-primary transition-transform hover:scale-[1.03]">
            Start shopping <ArrowIcon width={18} height={18} />
          </Link>
        </div>
      </section>
    </>
  );
}

function SectionHead({ eyebrow, title, href, cta }: { eyebrow: string; title: string; href?: string; cta?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <span className="text-sm font-bold uppercase tracking-widest text-primary">{eyebrow}</span>
        <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{title}</h2>
      </div>
      {href && cta && (
        <Link href={href} className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-muted sm:inline-flex">
          {cta} <ArrowIcon width={16} height={16} />
        </Link>
      )}
    </div>
  );
}

// tiny inline card for hero (no cart button, decorative)
function ProductCardMini({ slug, name, category, price }: { slug: string; name: string; category: string; price: number }) {
  return (
    <Link href={`/product/${slug}`} className="block">
      <ProductImage slug={slug} name={name} category={category} className="aspect-[4/3] w-full overflow-hidden rounded-lg" />
      <div className="px-1 pt-2.5">
        <p className="truncate font-display text-sm font-semibold text-foreground">{name}</p>
        <p className="text-sm font-bold text-primary">{site.currency}{price.toFixed(2)}</p>
      </div>
    </Link>
  );
}
