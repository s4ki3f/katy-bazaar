"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useCart } from "@/context/CartContext";
import { categories } from "@/lib/products";
import { site, phoneIsPlaceholder } from "@/lib/site.config";
import { asset } from "@/lib/asset";
import { CartIcon, MenuIcon, CloseIcon, PhoneIcon, TruckIcon } from "./icons";
import { SessionBadge } from "./SessionBadge";

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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-sign/95 text-on-sign backdrop-blur-md">
      {/* announcement bar */}
      {/*
        Announcement bar.
        It was deep plum on a plum header — dark on dark, so it read as a seam rather than a
        message. It now takes the sign's purple, which is the one thing that pops AGAINST the
        header instead of blending into it: white on #7b04c5 is 7.88:1.
        The dot is the neon green at 4.17:1 on purple — enough for a graphic under 1.4.11, and
        deliberately not used for the text, which needs 4.5:1.
      */}
      <div className="bg-primary text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-[13px] font-bold tracking-wide sm:text-sm">
          <span className="inline-flex items-center gap-2">
            <TruckIcon width={16} height={16} aria-hidden="true" className="shrink-0" />
            Order ahead for fast in-store pickup
          </span>
          <span aria-hidden="true" className="hidden h-1.5 w-1.5 shrink-0 rounded-full bg-accent-neon sm:block" />
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-neon sm:hidden" />
            100% Zabihah Halal
          </span>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center" aria-label={site.fullName}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/logo-sign.png")} alt={site.fullName} width={1229} height={429} className="h-12 w-auto sm:h-14" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 hover:bg-white/10 ${
                  active ? "text-accent-neon" : "text-on-sign/80"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          {!phoneIsPlaceholder && (
          <a
            href={`tel:${site.phone.replace(/[^0-9+]/g, "")}`}
            className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-on-sign/80 hover:bg-white/10 sm:inline-flex"
          >
            <PhoneIcon width={18} height={18} /> {site.phone}
          </a>
          )}

          {/* Who is signed in. Renders nothing for a shopper, which is the common case. */}
          <SessionBadge className="hidden sm:flex" />

          <Link
            href="/cart"
            className="relative inline-flex items-center justify-center rounded-full bg-white/10 p-2.5 text-on-sign transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-neon"
            aria-label={`Cart${ready && count ? `, ${count} items` : ""}`}
          >
            <CartIcon width={22} height={22} />
            <AnimatePresence>
              {ready && count > 0 && (
                <motion.span
                  key="badge"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 520, damping: 24 }}
                  className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-white"
                >
                  {/* re-keying on count replays the pop each time it changes */}
                  <motion.span key={count} initial={{ y: -7, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.18 }}>
                    {count}
                  </motion.span>
                </motion.span>
              )}
            </AnimatePresence>
          </Link>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-white/10 p-2.5 text-on-sign md:hidden"
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
