"use client";

import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg space-y-6 p-8 text-center">
        {/* Error Icon */}
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-2">
          <h1 className="font-semibold text-2xl">Something went wrong!</h1>
          <p className="text-muted-foreground">
            We encountered an unexpected error while processing your request.
            Don't worry, your pet's medication data is safe.
          </p>
        </div>

        {/* Error Details (in development) */}
        {process.env.NODE_ENV === "development" && error.message && (
          <div className="rounded-lg bg-muted p-4 text-left">
            <p className="font-mono text-muted-foreground text-sm">
              {error.message}
            </p>
            {error.digest && (
              <p className="mt-2 text-muted-foreground text-xs">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={reset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
        </div>

        {/* Additional Help */}
        <div className="border-t pt-4">
          <p className="text-muted-foreground text-sm">
            If this problem persists, please{" "}
            <Link href="/help" className="text-primary hover:underline">
              contact support
            </Link>{" "}
            or check our{" "}
            <Link href="/dashboard" className="text-primary hover:underline">
              dashboard
            </Link>
            .
          </p>
        </div>
      </Card>
    </div>
  );
}
