"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Fade + rise on scroll into view.
 *
 * Uses motion's `whileInView` instead of an IntersectionObserver +
 * setState pair, so the animation runs off the compositor and the
 * component no longer sets state from an effect.
 *
 * Note: the previous implementation accepted an `as` prop. Nothing in
 * the codebase used it, and re-creating a motion component per render
 * to support it is a correctness hazard — so it has been dropped. Wrap
 * the desired element inside <Reveal> instead.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  /** stagger in milliseconds */
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, delay: delay / 1000, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
