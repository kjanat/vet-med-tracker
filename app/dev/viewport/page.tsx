import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
	title: "Viewport Tester | VetMed Tracker Dev Tools",
	description:
		"Test your application across different device viewports and screen sizes",
};

// Redirect to the improved version in (dev) directory
export default function ViewportTesterPage() {
	redirect("/viewport");
}
