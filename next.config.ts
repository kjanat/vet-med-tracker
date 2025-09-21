import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.1.2",
    "propc-manjaro",
    "propc",
    "100.79.27.53",
    "propc-manjaro.taildd9ae2.ts.net",
  ],
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
    reactRemoveProperties: process.env.NODE_ENV === "production",
    relay: undefined,
    styledComponents: undefined,
    emotion: undefined,
  },
  compress: process.env.NODE_ENV === "production",
  devIndicators: {
    position: "bottom-right",
  },
  experimental: {
    reactCompiler: true,
    turbopackMinify: true,
    turbopackTreeShaking: false,
    turbopackSourceMaps: true,
    typedEnv: true,
    useCache: true,
    cacheComponents: true,
    // ppr: "incremental",
    webVitalsAttribution: ["CLS", "LCP", "FCP", "FID", "TTFB"],
  },
  generateEtags: true,
  // async headers() {
  //   return [
  //     {
  //       source: "/(.*)",
  //       headers: [
  //         {
  //           key: "X-DNS-Prefetch-Control",
  //           value: "on",
  //         },
  //         {
  //           key: "X-XSS-Protection",
  //           value: "1; mode=block",
  //         },
  //         {
  //           key: "X-Frame-Options",
  //           value: "DENY",
  //         },
  //         {
  //           key: "X-Content-Type-Options",
  //           value: "nosniff",
  //         },
  //       ],
  //     },
  //   ];
  // },
  httpAgentOptions: {
    keepAlive: true,
  },
  // Configure `pageExtensions` to include markdown and MDX files
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  typescript: {
    ignoreBuildErrors: false, // Temporary for bundle optimization
  },
  turbopack: {
    rules: {
      "*.svg": {
        loaders: [
          {
            loader: "@svgr/webpack",
            options: {
              icon: true,
            },
          },
        ],
        as: "*.js",
      },
    },
  },
};

const withMDX = createMDX({
  extension: /\.(md|mdx)$/,
});

// Merge MDX config with Next.js config
export default withMDX(nextConfig);
//export default nextConfig;
