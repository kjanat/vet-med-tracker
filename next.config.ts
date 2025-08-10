import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
	enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
	devIndicators: false,
	allowedDevOrigins: ["192.168.1.2"],
	experimental: {
		// ppr: "incremental",
		reactCompiler: true,
		typedRoutes: true,
		// optimizeCss: true, // Disable for now due to critters issue
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
	images: {
		unoptimized: true,
		formats: ["image/avif", "image/webp"],
		deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
		minimumCacheTTL: 31536000, // 1 year
		dangerouslyAllowSVG: false,
	},
	poweredByHeader: false,
	reactStrictMode: true,
	// Security configurations
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
	typescript: {
		ignoreBuildErrors: true, // Temporary for bundle optimization
	},
	compiler: {
		removeConsole: process.env.NODE_ENV === "production",
		reactRemoveProperties: process.env.NODE_ENV === "production",
		relay: undefined,
		styledComponents: undefined,
		emotion: undefined,
	},
	eslint: {
		ignoreDuringBuilds: true, // Temporary for bundle optimization
	},
	// Performance optimizations
	compress: true,
	generateEtags: true,
	httpAgentOptions: {
		keepAlive: true,
	},
	// Bundle optimization (swcMinify is enabled by default in Next.js 15)
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
};

export default withBundleAnalyzer(nextConfig);
