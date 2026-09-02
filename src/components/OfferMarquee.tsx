"use client";

import { useState } from "react";
import { useReducedMotion } from "motion/react";
import { weekendOffers } from "@/lib/site.config";

/**
 * Scrolling weekend-offer banner.
 *
 * WCAG 2.2.2 (Pause, Stop, Hide): content that moves automatically for more
 * than five seconds needs a mechanism to stop it. This has three — an
 * explicit button, pause on hover, and pause on keyboard focus — and it
 * renders as a plain static list under prefers-reduced-motion.
 *
 * The scroll is a CSS animation rather than a JS one so pausing is a single
 * animation-play-state flip and the browser can run it off the main thread.
 *
 * The banner shows all week; each offer carries its own dates ("Fri–Sun
 * only"). Hiding it on weekdays would mean deciding the day during render,
 * which a static export bakes in at build time — that needs a server.
 */

// Module scope: defining this inside the component would remount every item
// on each render.
function OfferItems({ decorative = false }: { decorative?: boolean }) {
  return (
    <span aria-hidden={decorative || undefined} className="flex shrink-0 items-center">
      {weekendOffers.map((o, i) => (
        <span key={`${o.text}-${i}`} className="mx-5 inline-flex shrink-0 items-center gap-2.5 text-sm">
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
            {o.label}
          </span>
          <span className="text-white/90">{o.text}</span>
          <span aria-hidden className="text-white/25">◆</span>
        </span>
      ))}
    </span>
  );
}

export function OfferMarquee() {
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);

  if (weekendOffers.length === 0) return null;

  if (reduced) {
    return (
      <aside aria-label="Weekend offers" className="border-b border-white/10 bg-foreground py-2.5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-y-2 px-4">
          <OfferItems />
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Weekend offers"
      className="relative overflow-hidden border-b border-white/10 bg-foreground py-2.5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="marquee-track flex w-max whitespace-nowrap" data-paused={paused}>
        <OfferItems />
        {/* duplicate makes the -50% loop seamless */}
        <OfferItems decorative />
      </div>

      {/* fade so scrolling text recedes under the control instead of
          colliding with it, which is most visible on narrow screens */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-foreground via-foreground/90 to-transparent"
      />

      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-foreground/90 px-2.5 py-1 text-[11px] font-semibold text-white/80 backdrop-blur transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
      >
        {paused ? "Play" : "Pause"}
        <span className="sr-only"> the weekend offers banner</span>
      </button>
    </aside>
  );
}
