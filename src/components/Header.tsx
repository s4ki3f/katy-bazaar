"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { categories } from "@/lib/products";
import { site } from "@/lib/site.config";
import { CartIcon, MenuIcon, CloseIcon, PhoneIcon } from "./icons";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const { count, ready } = useCart();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/85 backdrop-blur-md">
      {/* announcement bar */}
      <div className="bg-primary text-on-primary">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5 text-center text-xs font-semibold">
          <span>Free local delivery on orders over {site.currency}{site.freeDeliveryThreshold} · 100% Zabihah Halal</span>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center" aria-label={site.fullName}>
          <Image src="/logo.svg" alt={site.fullName} width={220} height={60} priority unoptimized className="h-11 w-auto" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 hover:bg-muted ${
                  active ? "text-primary" : "text-foreground/80"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          <a
            href={`tel:${site.phone.replace(/[^0-9+]/g, "")}`}
            className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-foreground/80 hover:bg-muted sm:inline-flex"
          >
            <PhoneIcon width={18} height={18} /> {site.phone}
          </a>

          <Link
            href="/cart"
            className="relative inline-flex items-center justify-center rounded-full bg-muted p-2.5 text-foreground transition-colors hover:bg-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Cart${ready && count ? `, ${count} items` : ""}`}
          >
            <CartIcon width={22} height={22} />
            {ready && count > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-muted p-2.5 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <CloseIcon width={22} height={22} /> : <MenuIcon width={22} height={22} />}
          </button>
        </div>
      </div>

      {/* category rail (desktop) */}
      <div className="hidden border-t border-border bg-surface md:block">
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-6 py-2 no-scrollbar">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/shop?category=${c.slug}`}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-primary"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>

      {/* mobile menu */}
      {open && (
        <div className="border-t border-border bg-surface md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-4 py-2">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-semibold hover:bg-muted"
              >
                {item.label}
              </Link>
            ))}
            <div className="my-2 border-t border-border" />
            <p className="px-3 pb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Categories</p>
            <div className="grid grid-cols-2 gap-1">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/shop?category=${c.slug}`}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
