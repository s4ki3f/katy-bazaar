"use client";

import { MotionConfig } from "motion/react";

/**
 * `reducedMotion="user"` makes every motion component in the tree respect
 * prefers-reduced-motion without each one checking for itself: transforms
 * and opacity changes are skipped, layout still settles instantly.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </MotionConfig>
  );
}
