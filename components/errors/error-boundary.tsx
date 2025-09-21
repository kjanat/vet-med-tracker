"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ErrorHandler,
  ErrorSeverity,
  type StandardError,
} from "@/lib/utils/error-handling";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: StandardError, retry: () => void) => ReactNode;
  onError?: (error: StandardError, errorInfo: ErrorInfo) => void;
  level?: "page" | "component" | "feature";
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: StandardError | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Enhanced React Error Boundary with standardized error handling
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      error: null,
      errorInfo: null,
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Convert the error to our standard format
    const standardError = ErrorHandler.handle(error, {
      boundary: "react-error-boundary",
    });

    return {
      error: standardError,
      hasError: true,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const standardError = ErrorHandler.handle(error, {
      boundary: "react-error-boundary",
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error: standardError,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(standardError, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      error: null,
      errorInfo: null,
      hasError: false,
    });
  };

  override render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default error UI based on boundary level
      return this.renderDefaultErrorUI(this.state.error);
    }

    return this.props.children;
  }

  private renderDefaultErrorUI(error: StandardError): ReactNode {
    const { level = "component" } = this.props;

    switch (level) {
      case "page":
        return this.renderPageLevelError(error);
      case "feature":
        return this.renderFeatureLevelError(error);
      default:
        return this.renderComponentLevelError(error);
    }
  }

  private renderPageLevelError(error: StandardError): ReactNode {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Something went wrong
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                {error.userMessage ||
                  "An unexpected error occurred while loading this page."}
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                className="gap-2"
                onClick={this.handleRetry}
                variant="outline"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="secondary"
              >
                Reload Page
              </Button>
            </div>

            {process.env.NODE_ENV === "development" && (
              <details className="mt-4">
                <summary className="cursor-pointer text-muted-foreground text-sm">
                  Debug Information
                </summary>
                <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
                  {JSON.stringify(error, null, 2)}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  private renderFeatureLevelError(error: StandardError): ReactNode {
    return (
      <Alert className="my-4" variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Feature Unavailable</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            {error.userMessage || "This feature is temporarily unavailable."}
          </p>
          <Button
            className="gap-2"
            onClick={this.handleRetry}
            size="sm"
            variant="outline"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  private renderComponentLevelError(error: StandardError): ReactNode {
    const showRetry = error.severity !== ErrorSeverity.CRITICAL;

    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="space-y-2">
          <p>{error.userMessage || "This component failed to load."}</p>
          {showRetry && (
            <Button
              className="h-auto gap-2 p-0"
              onClick={this.handleRetry}
              size="sm"
              variant="ghost"
            >
              <RefreshCw className="h-3 w-3" />
              Try again
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }
}

/**
 * Higher-order component for wrapping components with error boundaries
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    level?: ErrorBoundaryProps["level"];
    fallback?: ErrorBoundaryProps["fallback"];
    onError?: ErrorBoundaryProps["onError"];
  } = {},
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...options}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * Hook for programmatic error reporting
 */
export function useErrorReporting() {
  return {
    reportError: (error: unknown, context?: Record<string, unknown>) => {
      return ErrorHandler.handle(error, context);
    },
  };
}
