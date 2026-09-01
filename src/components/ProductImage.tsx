"use client";

import { useState } from "react";
import { asset } from "@/lib/asset";
import { ProductThumb } from "./ProductThumb";

/**
 * Real product photo (from /public/products/<slug>.jpg) with a graceful
 * fallback to the category SVG placeholder if the image fails to load.
 */
export function ProductImage({
  slug,
  name,
  category,
  className = "",
}: {
  slug: string;
  name: string;
  category: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <ProductThumb name={name} category={category} className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset(`/products/${slug}.jpg`)}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${className} object-cover`}
    />
  );
}
