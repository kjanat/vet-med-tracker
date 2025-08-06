import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "VetMed Tracker",
		short_name: "VetMed",
		description:
			"Track pet medications, set reminders, and manage veterinary prescriptions with ease",
		start_url: "/",
		display: "standalone",
		background_color: "#404040",
		theme_color: "#ffffff",
		orientation: "portrait-primary",
		icons: [
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
		categories: ["health", "medical", "productivity"],
		/* screenshots: [
			{
				src: "/screenshot-mobile.png",
				sizes: "390x844",
				type: "image/png",
				form_factor: "narrow",
			},
			{
				src: "/screenshot-desktop.png",
				sizes: "1280x720",
				type: "image/png",
				form_factor: "wide",
			},
		], */
	};
}
