"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface WidgetErrorBoundaryState {
	hasError: boolean;
	error?: Error;
	retryCount: number;
}

interface WidgetErrorBoundaryProps {
	children: React.ReactNode;
	widgetName: string;
	fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
	maxRetries?: number;
	onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class WidgetErrorBoundaryClass extends React.Component<
	WidgetErrorBoundaryProps,
	WidgetErrorBoundaryState
> {
	constructor(props: WidgetErrorBoundaryProps) {
		super(props);
		this.state = {
			hasError: false,
			retryCount: 0,
		};
	}

	static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
		return {
			hasError: true,
			error,
			retryCount: 0,
		};
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error(
			`Widget Error Boundary (${this.props.widgetName}):`,
			error,
			errorInfo,
		);

		// Report error to monitoring service
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dashboard:widget-error", {
					detail: {
						widgetName: this.props.widgetName,
						error: error.message,
						stack: error.stack,
						componentStack: errorInfo.componentStack,
						retryCount: this.state.retryCount,
					},
				}),
			);
		}

		this.props.onError?.(error, errorInfo);
	}

	handleRetry = () => {
		const { maxRetries = 3 } = this.props;
		const { retryCount } = this.state;

		if (retryCount < maxRetries) {
			this.setState({
				hasError: false,
				error: undefined,
				retryCount: retryCount + 1,
			});

			// Small delay before retry to avoid immediate re-render
			setTimeout(() => {
				// Force re-render by updating a key or using a different method
			}, 100);
		}
	};

	render() {
		if (this.state.hasError) {
			const { fallback: CustomFallback } = this.props;

			if (CustomFallback && this.state.error) {
				return (
					<CustomFallback error={this.state.error} retry={this.handleRetry} />
				);
			}

			return (
				<DefaultWidgetErrorFallback
					widgetName={this.props.widgetName}
					error={this.state.error}
					retryCount={this.state.retryCount}
					maxRetries={this.props.maxRetries || 3}
					onRetry={this.handleRetry}
				/>
			);
		}

		return this.props.children;
	}
}

interface DefaultWidgetErrorFallbackProps {
	widgetName: string;
	error?: Error;
	retryCount: number;
	maxRetries: number;
	onRetry: () => void;
}

function DefaultWidgetErrorFallback({
	widgetName,
	error,
	retryCount,
	maxRetries,
	onRetry,
}: DefaultWidgetErrorFallbackProps) {
	const canRetry = retryCount < maxRetries;

	return (
		<Card className="border-destructive/50 bg-destructive/5">
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-destructive">
					<AlertTriangle className="h-5 w-5" />
					Widget Error
				</CardTitle>
				<CardDescription>
					{widgetName} failed to load
					{retryCount > 0 && ` (attempt ${retryCount + 1})`}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{error && (
					<div className="rounded-md bg-muted/50 p-3">
						<p className="font-mono text-muted-foreground text-sm">
							{error.message}
						</p>
					</div>
				)}

				<div className="flex flex-col gap-2">
					{canRetry ? (
						<Button
							variant="outline"
							size="sm"
							onClick={onRetry}
							className="w-full"
						>
							<RefreshCw className="mr-2 h-4 w-4" />
							Retry ({maxRetries - retryCount} attempts left)
						</Button>
					) : (
						<p className="text-center text-muted-foreground text-sm">
							Maximum retry attempts reached. Please refresh the page or contact
							support.
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

// Functional component wrapper for easier use
export function WidgetErrorBoundary({
	children,
	widgetName,
	fallback,
	maxRetries = 3,
	onError,
}: WidgetErrorBoundaryProps) {
	return (
		<WidgetErrorBoundaryClass
			widgetName={widgetName}
			fallback={fallback}
			maxRetries={maxRetries}
			onError={onError}
		>
			{children}
		</WidgetErrorBoundaryClass>
	);
}

// Hook for error reporting from functional components
export function useWidgetError() {
	const reportError = React.useCallback((widgetName: string, error: Error) => {
		console.error(`Widget Error (${widgetName}):`, error);

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dashboard:widget-error", {
					detail: {
						widgetName,
						error: error.message,
						stack: error.stack,
						source: "hook",
					},
				}),
			);
		}
	}, []);

	return { reportError };
}

// Higher-order component for automatic error boundary wrapping
export function withWidgetErrorBoundary<T extends Record<string, any>>(
	Component: React.ComponentType<T>,
	widgetName: string,
	options?: {
		maxRetries?: number;
		fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
	},
) {
	const WrappedComponent = React.forwardRef<any, T>((props, ref) => (
		<WidgetErrorBoundary
			widgetName={widgetName}
			maxRetries={options?.maxRetries}
			fallback={options?.fallback}
		>
			<Component {...(props as T)} />
		</WidgetErrorBoundary>
	));

	WrappedComponent.displayName = `withWidgetErrorBoundary(${Component.displayName || Component.name || widgetName})`;

	return WrappedComponent;
}
