import type { Metadata } from "next";
import type React from "react";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
// import { DebugHouseholdState } from "@/components/debug/debug-household-state";
import { ErrorBoundary } from "@/components/error-boundary";
import { GlobalLayout } from "@/components/layout/global-layout";
import { AppProvider } from "@/components/providers/app-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { KeyboardShortcutsProvider } from "@/components/providers/keyboard-shortcuts-provider";
import { ThemeProvider } from "@/components/theme-provider";
import {
	GlobalScreenReaderProvider,
	SkipNavigation,
} from "@/components/ui/screen-reader-announcer";
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
		<ClerkProvider>
			<html
				lang="en"
				className={`${inter.variable} ${jetbrainsMono.variable}`}
				suppressHydrationWarning
			>
				<head>
					{/* <script src="http://localhost:8097"></script> */}
					<meta name="apple-mobile-web-app-title" content="KJANAT" />
				</head>
				<body className={inter.className} suppressHydrationWarning>
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
						<ErrorBoundary errorBoundaryId="root">
							<TRPCProvider>
								<AuthProvider>
									<AppProvider>
										<GlobalScreenReaderProvider>
											<KeyboardShortcutsProvider>
												<GlobalLayout>{children}</GlobalLayout>
											</KeyboardShortcutsProvider>
										</GlobalScreenReaderProvider>
									</AppProvider>
								</AuthProvider>
							</TRPCProvider>
						</ErrorBoundary>
						<Analytics />
					</ThemeProvider>
				</body>
			</html>
		</ClerkProvider>
	);
}
