import type { NextConfig } from "next";

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
  compress: process.env.NODE_ENV === "production",
  experimental: {
    reactCompiler: true,
    turbopackMinify: true,
    turbopackTreeShaking: false,
    turbopackSourceMaps: true,
    typedEnv: true,
    useCache: true,
    ppr: "incremental",
    // webVitalsAttribution: ["CLS", "LCP", "FCP", "FID", "TTFB"],
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

export default nextConfig;
