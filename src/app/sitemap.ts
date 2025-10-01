import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      changeFrequency: "yearly",
      lastModified: new Date(),
      priority: 1,
      url: "https://vetmed.kjanat.com",
    },
    {
      changeFrequency: "weekly",
      lastModified: new Date(),
      priority: 0.8,
      url: "https://vetmed.kjanat.com/help",
    },
    {
      changeFrequency: "weekly",
      lastModified: new Date(),
      priority: 0.8,
      url: "https://vetmed.kjanat.com/faq",
    },
    {
      changeFrequency: "yearly",
      lastModified: new Date(),
      priority: 0.2,
      url: "https://vetmed.kjanat.com/terms",
    },
    {
      changeFrequency: "yearly",
      lastModified: new Date(),
      priority: 0.2,
      url: "https://vetmed.kjanat.com/privacy",
    },
    {
      changeFrequency: "yearly",
      lastModified: new Date(),
      priority: 0.2,
      url: "https://vetmed.kjanat.com/cookies",
    },
  ];
}
