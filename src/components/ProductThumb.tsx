import { categoryHue, getCategory } from "@/lib/products";

/**
 * Self-contained SVG "photo" placeholder for a product.
 * Uses the category gradient + product initials so the store looks
 * complete without external image dependencies. Swap for <Image> +
 * real photos later by dropping files in /public and mapping by slug.
 */
export function ProductThumb({
  name,
  category,
  className = "",
}: {
  name: string;
  category: string;
  className?: string;
}) {
  const [c1, c2] = categoryHue(category);
  const cat = getCategory(category)?.name ?? "";
  const initials = name
    .split(" ")
    .filter((w) => /[a-zA-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  const gid = `pg-${category}-${initials || "x"}`;

  return (
    <svg
      viewBox="0 0 400 300"
      className={className}
      role="img"
      aria-label={name}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="400" y2="300" gradientUnits="userSpaceOnUse">
          <stop stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${gid})`} />
      {/* soft decorative blobs */}
      <circle cx="330" cy="60" r="90" fill="#ffffff" opacity="0.10" />
      <circle cx="70" cy="250" r="70" fill="#000000" opacity="0.08" />
      <text
        x="200" y="150" textAnchor="middle" dominantBaseline="central"
        fontFamily="Rubik, system-ui, sans-serif" fontWeight="700" fontSize="96"
        fill="#ffffff" opacity="0.92"
      >
        {initials}
      </text>
      <text
        x="200" y="230" textAnchor="middle"
        fontFamily="'Nunito Sans', system-ui, sans-serif" fontWeight="700" fontSize="18"
        letterSpacing="2" fill="#ffffff" opacity="0.75"
      >
        {cat.toUpperCase()}
      </text>
    </svg>
  );
}
