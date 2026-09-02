import type { NextConfig } from "next";

/**
 * One config, two targets.
 *
 * Vercel sets VERCEL=1 during its builds. There we want a SERVER — API
 * routes, real auth for the counter app — and the site served from the
 * domain root.
 *
 * Everywhere else the build stays a static export under /katy-bazaar so
 * the existing GitHub Pages workflow keeps working untouched.
 */
const onVercel = Boolean(process.env.VERCEL);

// Pages needs the repo name as a base path; a Vercel domain serves from root.
const basePath = process.env.BASE_PATH ?? (onVercel ? "" : "/katy-bazaar");

const nextConfig: NextConfig = {
  ...(onVercel ? {} : { output: "export" as const }), // static HTML export -> ./out
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: {
    unoptimized: !onVercel, // Vercel can optimise; GitHub Pages cannot
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
