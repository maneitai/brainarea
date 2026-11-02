import type { NextConfig } from "next";

// For GitHub Pages project-site publishing, build with
// NEXT_PUBLIC_BASE_PATH=/brainarea (set in .github/workflows/pages.yml).
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  trailingSlash: true,
};

export default nextConfig;