// Prefix static assets in /public with the configured basePath so they
// resolve correctly under a GitHub Pages sub-path (e.g. /katy-bazaar/logo.svg).
// next/image + static export does NOT auto-prefix a string src, so we do it here.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const asset = (path: string) => `${BASE_PATH}${path.startsWith("/") ? "" : "/"}${path}`;
