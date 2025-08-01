import type { Metadata } from "next";
import type React from "react";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
// import { DebugHouseholdState } from "@/components/debug/debug-household-state";
import { GlobalLayout } from "@/components/layout/global-layout";
import { AppProvider } from "@/components/providers/app-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { TRPCProvider } from "@/server/trpc/client";
import { inter, jetbrainsMono } from "./fonts";

export const metadata: Metadata = {
	title: "VetMed Tracker",
	description: "Veterinary medication management system",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
			<head>
				{/* <script src="http://localhost:8097"></script> */}
				<meta name="apple-mobile-web-app-title" content="KJANAT" />
			</head>
			<body className={inter.className}>
				<TRPCProvider>
					<AuthProvider>
						<AppProvider>
							<GlobalLayout>{children}</GlobalLayout>
							{/* {process.env.NODE_ENV === "development" && <DebugHouseholdState />} */}
						</AppProvider>
					</AuthProvider>
				</TRPCProvider>
				<Analytics />
			</body>
		</html>
	);
}
