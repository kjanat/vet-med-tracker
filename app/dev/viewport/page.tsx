import type { Metadata } from "next";
import MobileResponsiveTester from "@/components/dev/viewport-tester";

export const metadata: Metadata = {
	title: "Viewport Tester | VetMed Tracker Dev Tools",
	description:
		"Test your application across different device viewports and screen sizes",
};

export default function ViewportTesterPage() {
	return <MobileResponsiveTester />;
}
