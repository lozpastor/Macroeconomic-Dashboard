import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGitHubPages ? "/Macroeconomic-Dashboard" : "",
  assetPrefix: isGitHubPages ? "/Macroeconomic-Dashboard/" : "",
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "echarts"]
  }
};

export default nextConfig;
