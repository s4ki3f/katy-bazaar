import { StarIcon } from "./icons";

import { site } from "@/lib/site.config";

export function Stars({ rating, reviews, size = 14 }: { rating: number; reviews?: number; size?: number }) {
  // Seeded demo ratings stay hidden until wired to real reviews (site.showRatings).
  if (!site.showRatings) return null;

  const full = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      <span className="inline-flex text-accent">
        {Array.from({ length: 5 }).map((_, i) => (
          <StarIcon
            key={i}
            width={size}
            height={size}
            className={i < full ? "text-accent" : "text-border"}
          />
        ))}
      </span>
      {reviews !== undefined && (
        <span className="text-xs text-muted-foreground">{rating.toFixed(1)} ({reviews})</span>
      )}
    </span>
  );
}
