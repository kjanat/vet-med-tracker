import { StackProvider, StackTheme } from "@stackframe/stack";
import type { Metadata } from "next";
import type React from "react";
import { stackServerApp } from "../stack";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
// import { DebugHouseholdState } from "@/components/debug/debug-household-state";
import { ThemeProvider } from "@/components/theme-provider";
import { SkipNavigation } from "@/components/ui/screen-reader-announcer";
import { TRPCProvider } from "@/server/trpc/client";
import { inter, jetbrainsMono } from "./fonts";

export const metadata: Metadata = {
	title: "VetMed Tracker - Pet Medication Management Made Simple",
	description:
		"Track pet medications, set reminders, and manage veterinary prescriptions with ease. Never miss a dose with our intuitive medication tracking app.",
	keywords: [
		"pet medication tracker",
		"veterinary medicine management",
		"pet health app",
		"medication reminders",
		"animal prescription tracker",
	],
	openGraph: {
		title: "VetMed Tracker - Pet Medication Management",
		description:
			"Never miss a pet medication dose. Track prescriptions, set reminders, and manage your pet's health with confidence.",
		type: "website",
		locale: "en_US",
		siteName: "VetMed Tracker",
	},
	twitter: {
		card: "summary_large_image",
		title: "VetMed Tracker - Pet Medication Management",
		description:
			"Track pet medications and never miss a dose. Simple, reliable medication management for your furry friends.",
	},
	appleWebApp: {
		title: "VetMed",
	},
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html
			lang="en"
			className={`${inter.variable} ${jetbrainsMono.variable} scroll-smooth`}
			suppressHydrationWarning
		>
			<head>
				<meta name="apple-mobile-web-app-title" content="VetMed" />
			</head>
			<body className={inter.className} suppressHydrationWarning>
				<StackProvider app={stackServerApp}>
					<StackTheme>
						<ThemeProvider
							attribute="class"
							defaultTheme="system"
							enableSystem
							disableTransitionOnChange
						>
							<SkipNavigation
								links={[
									{ href: "#main-content", label: "Skip to main content" },
									{ href: "#main-navigation", label: "Skip to navigation" },
									{ href: "#search", label: "Skip to search" },
								]}
							/>
							<TRPCProvider>{children}</TRPCProvider>
							<Analytics />
						</ThemeProvider>
					</StackTheme>
				</StackProvider>
			</body>
		</html>
	);
}
