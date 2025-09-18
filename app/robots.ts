import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
    // sitemap: "https://vetmed.kjanat.com/sitemap.xml",
  };
}
