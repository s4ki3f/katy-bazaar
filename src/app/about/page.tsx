import Link from "next/link";
import type { Metadata } from "next";
import { site, valueProps } from "@/lib/site.config";
import { Reveal } from "@/components/Reveal";
import { ICON_MAP, ArrowIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "About Us",
  description: `Learn about ${site.fullName} — your neighborhood halal meat and grocery bazaar in Katy, TX.`,
};

export default function AboutPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-primary to-primary-dark text-white">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <span className="text-sm font-bold uppercase tracking-widest text-white/70">Our Story</span>
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">More than a store — a neighborhood bazaar.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/85">{site.description}</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="prose-lg space-y-5 text-foreground/80">
          <p>
            <span className="font-display text-xl font-bold text-foreground">{site.fullName}</span> was built on a simple promise: give
            the families of Katy a place they can fully trust for their meat and groceries. Every cut of meat we sell is
            hand-slaughtered and certified <strong>zabihah halal</strong> — no shortcuts, no doubts.
          </p>
          <p>
            Our in-house butchers cut beef, lamb, goat and chicken fresh every day, exactly the way you ask. Alongside the
            meat counter you&apos;ll find the pantry staples that make a home kitchen sing — aged basmati rice, freshly ground
            spices, lentils, frozen parathas, sweets and everyday essentials from across South Asia and the Middle East.
          </p>
          <p>
            We&apos;re proud to be part of this community, and we treat every customer the way we&apos;d treat family.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {valueProps.map((v, i) => {
            const Icon = ICON_MAP[v.icon as keyof typeof ICON_MAP];
            return (
              <Reveal key={v.title} delay={i * 60}>
                <div className="h-full rounded-card border border-border bg-surface p-6 shadow-soft">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-primary">
                    <Icon width={24} height={24} />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold">{v.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{v.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-card bg-foreground px-8 py-14 text-center text-white sm:px-16">
          <h2 className="font-display text-3xl font-bold">Come visit the bazaar</h2>
          <p className="mx-auto mt-3 max-w-md text-white/70">
            {site.address.line1}, {site.address.city}, {site.address.state} — or shop online for delivery across Katy.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/shop" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-primary hover:scale-[1.03] transition-transform">
              Shop online <ArrowIcon width={18} height={18} />
            </Link>
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 font-semibold text-white hover:bg-white/10">
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
