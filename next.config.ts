import type { NextConfig } from "next";

/**
 * Dynamic Next.js app, server-rendered and deployed to Vercel.
 *
 * This was previously a static export under a /katy-bazaar base path for
 * GitHub Pages. That is gone: a static site cannot authenticate staff,
 * cannot receive an order, and cannot show the shop's own inventory edits
 * to customers. All three now work because there is a server.
 */
const nextConfig: NextConfig = {
  // No trailingSlash: it existed so GitHub Pages could serve /shop/index.html.
  // With a server it only causes 308 redirects on API routes, which break
  // POSTs from any client that does not follow redirects.
  images: {
    remotePatterns: [],
  },
  env: {
    // kept so existing asset helpers resolve to the domain root
    NEXT_PUBLIC_BASE_PATH: "",
  },
};

export default nextConfig;
