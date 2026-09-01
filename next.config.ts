import type { NextConfig } from "next";

// Repo/base path for GitHub Pages. Live URL: https://<user>.github.io<basePath>/
// Override at build time with BASE_PATH (e.g. BASE_PATH="" for a user/root site).
const basePath = process.env.BASE_PATH ?? "/katy-bazaar";

const nextConfig: NextConfig = {
  output: "export", // static HTML export -> ./out
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  trailingSlash: true, // emit /shop/index.html so Pages serves nested routes
  images: {
    unoptimized: true, // no image optimization server on GitHub Pages
  },
  // expose basePath to the client (used by ProductThumb / any raw asset refs if needed)
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
