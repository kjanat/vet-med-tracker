import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // devIndicators: false,
  allowedDevOrigins: ["192.168.1.2"],
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
    reactRemoveProperties: process.env.NODE_ENV === "production",
    relay: undefined,
    styledComponents: undefined,
    emotion: undefined,
  },
  compress: true,
  experimental: {
    reactCompiler: true,
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "recharts",
      "date-fns",
      "luxon",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
    ],
    // useCache: true,
    webVitalsAttribution: ["CLS", "LCP", "FCP", "FID", "TTFB"],
  },
  generateEtags: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
  httpAgentOptions: {
    keepAlive: true,
  },
  images: {
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: false,
  },
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{ kebabCase member }}",
    },
    "@radix-ui/react-icons": {
      transform: "@radix-ui/react-icons/dist/{{ member }}",
    },
    "date-fns": {
      transform: "date-fns/{{ member }}",
    },
  },
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  typescript: {
    ignoreBuildErrors: false, // Temporary for bundle optimization
  },
  async redirects() {
    return [
      // Legacy /public route redirects - permanent redirects for SEO
      { source: "/public/privacy", destination: "/privacy", permanent: true },
      { source: "/public/terms", destination: "/terms", permanent: true },
      { source: "/public/cookies", destination: "/cookies", permanent: true },
      { source: "/public/faq", destination: "/faq", permanent: true },
      { source: "/public/help", destination: "/help", permanent: true },
      // Root redirect (already handled by /public/page.tsx)
      { source: "/public", destination: "/", permanent: true },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
