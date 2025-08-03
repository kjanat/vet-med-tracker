"use client";

import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
// import { useRouter } from "next/navigation"; // Uncomment when needed
import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	errorReporter,
	extractErrorContext,
	formatErrorMessage,
} from "@/lib/error-reporting";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
	errorBoundaryId?: string;
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
	hasError: boolean;
	error?: Error;
	errorInfo?: ErrorInfo;
	errorId?: string;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): State {
		// Generate a unique error ID for tracking
		const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		return {
			hasError: true,
			error,
			errorId,
		};
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		// Extract context and report error
		const context = extractErrorContext(error, errorInfo);
		context.errorBoundary = this.props.errorBoundaryId || "root";

		// Report to error tracking service
		errorReporter.report(error, context);

		// Call custom error handler if provided
		if (this.props.onError) {
			this.props.onError(error, errorInfo);
		}

		// Update state with error info
		this.setState({ errorInfo });
	}

	handleReset = (): void => {
		this.setState({ hasError: false, error: undefined, errorInfo: undefined });
	};

	render(): ReactNode {
		if (this.state.hasError) {
			// Use custom fallback if provided
			if (this.props.fallback) {
				return this.props.fallback;
			}

			const { error, errorId } = this.state;
			const userMessage = error
				? formatErrorMessage(error)
				: "An unexpected error occurred";
			const isDevelopment = process.env.NODE_ENV === "development";

			return (
				<div className="flex min-h-screen items-center justify-center bg-background p-4">
					<Card className="w-full max-w-lg">
						<CardHeader>
							<div className="flex items-center gap-2">
								<AlertTriangle className="h-5 w-5 text-destructive" />
								<CardTitle>Something went wrong</CardTitle>
							</div>
							<CardDescription>{userMessage}</CardDescription>
						</CardHeader>
						<CardContent>
							{isDevelopment && error && (
								<details className="mt-4">
									<summary className="cursor-pointer font-medium text-muted-foreground text-sm hover:text-foreground">
										Error Details (Development Only)
									</summary>
									<div className="mt-2 space-y-2">
										<div className="rounded-md bg-muted p-3">
											<p className="break-all font-mono text-xs">
												{error.message}
											</p>
										</div>
										{error.stack && (
											<pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
												{error.stack}
											</pre>
										)}
										{this.state.errorInfo?.componentStack && (
											<details className="mt-2">
												<summary className="cursor-pointer font-medium text-xs">
													Component Stack
												</summary>
												<pre className="mt-1 max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
													{this.state.errorInfo.componentStack}
												</pre>
											</details>
										)}
									</div>
								</details>
							)}
							{errorId && (
								<p className="mt-4 text-muted-foreground text-xs">
									Error ID: {errorId}
								</p>
							)}
						</CardContent>
						<CardFooter className="flex gap-2">
							<Button onClick={this.handleReset} variant="default">
								<RefreshCw className="mr-2 h-4 w-4" />
								Try Again
							</Button>
							<Button asChild variant="outline">
								<Link href="/">
									<Home className="mr-2 h-4 w-4" />
									Go Home
								</Link>
							</Button>
						</CardFooter>
					</Card>
				</div>
			);
		}

		return this.props.children;
	}
}

/**
 * Hook version for functional components that need error boundary behavior
 */
export function useErrorHandler() {
	// const router = useRouter(); // Uncomment if navigation is needed

	const handleError = (error: Error, context?: Record<string, unknown>) => {
		// Report error
		errorReporter.report(error, context || {});

		// In development, log to console
		if (process.env.NODE_ENV === "development") {
			console.error("Handled error:", error, context);
		}

		// Optionally navigate to error page
		// router.push(`/error?message=${encodeURIComponent(error.message)}`);
	};

	return { handleError };
}

/**
 * HOC to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
	Component: React.ComponentType<P>,
	errorBoundaryId?: string,
) {
	const WrappedComponent = (props: P) => (
		<ErrorBoundary errorBoundaryId={errorBoundaryId}>
			<Component {...props} />
		</ErrorBoundary>
	);

	WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

	return WrappedComponent;
}
