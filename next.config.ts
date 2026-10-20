import type { NextConfig } from "next";

// Static export: the whole site is files on a CDN (ADR 0001).
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  agentRules: false,
  // The dev server does not serve a folder's index.html (Vercel does); the export ignores rewrites, so only dev gets them.
  ...(process.env.NODE_ENV === "development" && {
    rewrites: async () => [
      { source: "/game/24", destination: "/game/24/index.html" },
      { source: "/game/24/play", destination: "/game/24/play/index.html" },
    ],
  }),
};

export default nextConfig;
