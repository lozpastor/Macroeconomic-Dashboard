import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exportación estática para GitHub Pages
  output: "export",
  
  // BasePath para repositorio no-root
  basePath: "/Macroeconomic-Dashboard",
  
  // Configuración de imágenes para exportación estática
  images: {
    unoptimized: true,
  },
  
  experimental: {
    optimizePackageImports: ["lucide-react", "echarts"]
  }
};

export default nextConfig;
