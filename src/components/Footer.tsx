import Link from "next/link";
import { site, phoneIsPlaceholder, addressLines } from "@/lib/site.config";
import { asset } from "@/lib/asset";
import { categories } from "@/lib/products";
import { PhoneIcon, PinIcon, ClockIcon } from "./icons";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-foreground text-white/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/logo.svg")} alt={site.fullName} width={220} height={60} className="h-11 w-auto brightness-0 invert" />
          <p className="max-w-xs text-sm leading-relaxed text-white/60">{site.description}</p>
        </div>

        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-white">Shop</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {categories.slice(0, 6).map((c) => (
              <li key={c.slug}>
                <Link href={`/shop?category=${c.slug}`} className="text-white/60 hover:text-white">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-white">Company</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/about" className="text-white/60 hover:text-white">About Us</Link></li>
            <li><Link href="/shop" className="text-white/60 hover:text-white">All Products</Link></li>
            <li><Link href="/contact" className="text-white/60 hover:text-white">Contact</Link></li>
            <li><Link href="/cart" className="text-white/60 hover:text-white">Your Cart</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-white">Visit Us</h3>
          <ul className="mt-4 space-y-3 text-sm text-white/60">
            <li className="flex gap-2.5">
              <PinIcon width={18} height={18} className="mt-0.5 shrink-0 text-secondary" />
              <span>
                {addressLines().map((l, i) => <span key={l}>{i > 0 && <br />}{l}</span>)}
              </span>
            </li>
            <li className="flex gap-2.5">
              <PhoneIcon width={18} height={18} className="mt-0.5 shrink-0 text-secondary" />
{phoneIsPlaceholder
                ? <span className="text-white/60">Phone number coming soon — message us on WhatsApp</span>
                : <a href={`tel:${site.phone.replace(/[^0-9+]/g, "")}`} className="hover:text-white">{site.phone}</a>}
            </li>
            <li className="flex gap-2.5">
              <ClockIcon width={18} height={18} className="mt-0.5 shrink-0 text-secondary" />
              <span>{site.hours[0].day}: {site.hours[0].time}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-5 text-xs text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} {site.fullName}. All rights reserved.</p>
          <p>Zabihah Halal Certified · Katy, TX</p>
        </div>
      </div>
    </footer>
  );
}
