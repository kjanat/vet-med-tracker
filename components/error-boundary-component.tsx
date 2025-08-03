"use client";

import { AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "./error-boundary";

interface ComponentErrorBoundaryProps {
	children: React.ReactNode;
	componentName: string;
	fallbackMessage?: string;
	showDetails?: boolean;
	onRetry?: () => void;
}

/**
 * Component-level error boundary for wrapping complex components
 * Provides inline error display without full page replacement
 */
export function ComponentErrorBoundary({
	children,
	componentName,
	fallbackMessage,
	showDetails = process.env.NODE_ENV === "development",
	onRetry,
}: ComponentErrorBoundaryProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	const fallback = (
		<Alert variant="destructive" className="my-4">
			<AlertCircle className="h-4 w-4" />
			<AlertTitle>Error in {componentName}</AlertTitle>
			<AlertDescription>
				{fallbackMessage ||
					`Unable to load ${componentName}. This component encountered an error.`}
			</AlertDescription>
			{(showDetails || onRetry) && (
				<div className="mt-3 flex items-center gap-2">
					{onRetry && (
						<Button
							onClick={onRetry}
							variant="outline"
							size="sm"
							className="h-7 text-xs"
						>
							Try Again
						</Button>
					)}
					{showDetails && (
						<Button
							onClick={() => setIsExpanded(!isExpanded)}
							variant="ghost"
							size="sm"
							className="h-7 text-xs"
						>
							{isExpanded ? (
								<ChevronDown className="mr-1 h-3 w-3" />
							) : (
								<ChevronRight className="mr-1 h-3 w-3" />
							)}
							Details
						</Button>
					)}
				</div>
			)}
			{showDetails && isExpanded && (
				<div className="mt-3 rounded-md bg-muted p-3">
					<p className="font-mono text-xs">Check console for error details</p>
				</div>
			)}
		</Alert>
	);

	return (
		<ErrorBoundary
			errorBoundaryId={`component-${componentName}`}
			fallback={fallback}
			onError={(error, errorInfo) => {
				// Log component-specific errors
				console.error(`Error in ${componentName}:`, error, errorInfo);
			}}
		>
			{children}
		</ErrorBoundary>
	);
}

/**
 * Specialized error boundaries for specific component types
 */

export function FormErrorBoundary({
	children,
	formName,
}: {
	children: React.ReactNode;
	formName: string;
}) {
	const [key, setKey] = useState(0);

	return (
		<ComponentErrorBoundary
			key={key}
			componentName={`${formName} Form`}
			fallbackMessage="The form encountered an error. Your data has not been lost."
			onRetry={() => setKey(key + 1)}
		>
			{children}
		</ComponentErrorBoundary>
	);
}

export function ChartErrorBoundary({
	children,
	chartName,
}: {
	children: React.ReactNode;
	chartName: string;
}) {
	return (
		<ComponentErrorBoundary
			componentName={`${chartName} Chart`}
			fallbackMessage="Unable to render chart. Data may be unavailable or invalid."
			showDetails={false}
		>
			{children}
		</ComponentErrorBoundary>
	);
}

export function ListErrorBoundary({
	children,
	listName,
}: {
	children: React.ReactNode;
	listName: string;
}) {
	return (
		<ComponentErrorBoundary
			componentName={`${listName} List`}
			fallbackMessage="Unable to load list items. Please refresh the page."
		>
			{children}
		</ComponentErrorBoundary>
	);
}

/**
 * Error boundary for third-party integrations
 */
export function IntegrationErrorBoundary({
	children,
	integrationName,
}: {
	children: React.ReactNode;
	integrationName: string;
}) {
	return (
		<ComponentErrorBoundary
			componentName={`${integrationName} Integration`}
			fallbackMessage={`The ${integrationName} integration is currently unavailable.`}
			showDetails={false}
		>
			{children}
		</ComponentErrorBoundary>
	);
}
