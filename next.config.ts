import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // basePath settes ved domenekobling / annen hosting — ikke på Cloudflare Pages-root
};

export default nextConfig;
