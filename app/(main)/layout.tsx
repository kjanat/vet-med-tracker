import type React from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { GlobalKeyboardShortcuts } from "@/components/layout/global-keyboard-shortcuts";
import { GlobalLayout } from "@/components/layout/global-layout";
import { ConsolidatedAppProvider } from "@/components/providers/app-provider-consolidated";

export default function MainLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ErrorBoundary errorBoundaryId="main">
			<ConsolidatedAppProvider>
				<GlobalKeyboardShortcuts />
				<GlobalLayout>{children}</GlobalLayout>
			</ConsolidatedAppProvider>
		</ErrorBoundary>
	);
}
