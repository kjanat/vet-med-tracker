import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      disallow: "/",
      userAgent: "*",
    },
    // sitemap: "https://vetmed.kjanat.com/sitemap.xml",
  };
}
