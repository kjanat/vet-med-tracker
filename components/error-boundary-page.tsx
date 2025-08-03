"use client";

import { AlertCircle, ArrowLeft, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ErrorBoundary } from "./error-boundary";

interface PageErrorBoundaryProps {
	children: React.ReactNode;
	pageName: string;
	customMessage?: string;
	showBackButton?: boolean;
}

/**
 * Page-specific error boundary with contextual recovery options
 */
export function PageErrorBoundary({
	children,
	pageName,
	customMessage,
	showBackButton = true,
}: PageErrorBoundaryProps) {
	const router = useRouter();

	const fallback = (
		<div className="container mx-auto px-4 py-8">
			<Card className="mx-auto max-w-2xl">
				<CardHeader>
					<div className="flex items-center gap-2">
						<AlertCircle className="h-5 w-5 text-destructive" />
						<CardTitle>Error in {pageName}</CardTitle>
					</div>
					<CardDescription>
						{customMessage ||
							`We encountered an error while loading the ${pageName.toLowerCase()} page.`}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<p className="text-muted-foreground text-sm">
							This might be a temporary issue. You can try refreshing the page
							or navigating to a different section.
						</p>
						{/* Context-specific suggestions based on page */}
						{pageName === "Record Administration" && (
							<div className="rounded-lg bg-muted p-4">
								<p className="font-medium text-sm">Offline Mode Available</p>
								<p className="mt-1 text-muted-foreground text-sm">
									Your medication records are saved locally and will sync when
									the connection is restored.
								</p>
							</div>
						)}
						{pageName === "Inventory" && (
							<div className="rounded-lg bg-muted p-4">
								<p className="font-medium text-sm">Inventory Data</p>
								<p className="mt-1 text-muted-foreground text-sm">
									Your inventory changes are queued and will be saved once the
									issue is resolved.
								</p>
							</div>
						)}
					</div>
				</CardContent>
				<CardFooter className="flex flex-wrap gap-2">
					<Button
						onClick={() => window.location.reload()}
						variant="default"
						size="sm"
					>
						<RefreshCw className="mr-2 h-4 w-4" />
						Refresh Page
					</Button>
					{showBackButton && (
						<Button onClick={() => router.back()} variant="outline" size="sm">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Go Back
						</Button>
					)}
					<Button asChild variant="outline" size="sm">
						<Link href="/">
							<Home className="mr-2 h-4 w-4" />
							Go Home
						</Link>
					</Button>
				</CardFooter>
			</Card>
		</div>
	);

	return (
		<ErrorBoundary errorBoundaryId={`page-${pageName}`} fallback={fallback}>
			{children}
		</ErrorBoundary>
	);
}

/**
 * Specific error boundaries for each critical page
 */
export function RecordAdminErrorBoundary({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<PageErrorBoundary
			pageName="Record Administration"
			customMessage="Unable to load the medication recording page. Your offline records are safe and will sync automatically."
		>
			{children}
		</PageErrorBoundary>
	);
}

export function InventoryErrorBoundary({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<PageErrorBoundary
			pageName="Inventory"
			customMessage="Unable to load inventory data. Any pending changes are saved locally."
		>
			{children}
		</PageErrorBoundary>
	);
}

export function HistoryErrorBoundary({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<PageErrorBoundary
			pageName="History"
			customMessage="Unable to load medication history. Please try again later."
		>
			{children}
		</PageErrorBoundary>
	);
}

export function InsightsErrorBoundary({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<PageErrorBoundary
			pageName="Insights"
			customMessage="Unable to generate insights and reports. Your data is safe."
		>
			{children}
		</PageErrorBoundary>
	);
}

export function SettingsErrorBoundary({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<PageErrorBoundary
			pageName="Settings"
			customMessage="Unable to load settings. Your preferences are saved."
		>
			{children}
		</PageErrorBoundary>
	);
}
