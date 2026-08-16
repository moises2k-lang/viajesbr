import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "static.cupid.travel" },
      { protocol: "https", hostname: "flagcdn.com" },
      { protocol: "https", hostname: "image.pollinations.ai" },
    ],
  },
  // Los PDF leen las tipografías Barlow del disco al generarse.
  outputFileTracingIncludes: {
    "/api/documentos/**": ["./public/fuentes/**"],
  },
};

export default nextConfig;
