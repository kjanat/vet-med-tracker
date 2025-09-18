import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VetMed Tracker",
    short_name: "VetMed",
    description:
      "Track pet medications, set reminders, and manage veterinary prescriptions with ease.",
    start_url: "/",
    display: "standalone",
    background_color: "#2c3e50",
    theme_color: "#2c3e50",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
