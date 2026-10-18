import type { NextConfig } from "next";

// Static export: the whole site is files on a CDN (ADR 0001).
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  agentRules: false,
};

export default nextConfig;
