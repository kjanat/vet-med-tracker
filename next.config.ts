import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	devIndicators: false,
	experimental: {
		// ppr: "incremental",
		// reactCompiler: true,
		// typedRoutes: true,
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
