import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*", // Applies to all crawlers
			disallow: "/", // Blocks crawling of the entire site
		} /*,
    sitemap: 'https://yourdomain.com/sitemap.xml',*/, // Optional: Point to your sitemap
	};
}
