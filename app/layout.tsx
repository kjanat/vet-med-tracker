import type { Metadata } from "next";
import type React from "react";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { GlobalLayout } from "@/components/layout/global-layout";
import { AppProvider } from "@/components/providers/app-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { TRPCProvider } from "@/server/trpc/client";
import { inter, jetbrainsMono } from "./fonts";

export const metadata: Metadata = {
	title: "VetMed Tracker",
	description: "Veterinary medication management system",
	generator: "v0.dev",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
			<head>
				<meta name="apple-mobile-web-app-title" content="KJANAT" />
			</head>
			<body className={inter.className}>
				<TRPCProvider>
					<AuthProvider>
						<AppProvider>
							<GlobalLayout>{children}</GlobalLayout>
						</AppProvider>
					</AuthProvider>
				</TRPCProvider>
				<Analytics />
			</body>
		</html>
	);
}
