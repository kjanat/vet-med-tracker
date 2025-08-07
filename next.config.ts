import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	devIndicators: false,
	allowedDevOrigins: ["192.168.1.2"],
	experimental: {
		// ppr: "incremental",
		reactCompiler: !!process.env.CI,
		typedRoutes: true,
		// useCache: true,
	},
	images: {
		unoptimized: true,
	},
	poweredByHeader: false,
	reactStrictMode: true,
	typescript: {
		ignoreBuildErrors: false,
	},
	/*eslint: {
		ignoreDuringBuilds: true,
	},*/
};

export default nextConfig;
