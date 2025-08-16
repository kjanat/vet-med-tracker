"use client";

import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <div className="w-full max-w-lg space-y-6 rounded-lg bg-white p-8 text-center shadow-lg">
            {/* Error Icon */}
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-red-50 p-4">
                <AlertTriangle className="h-12 w-12 text-red-600" />
              </div>
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h1 className="font-semibold text-2xl text-gray-900">
                Critical Application Error
              </h1>
              <p className="text-gray-600">
                A critical error occurred that prevented the application from
                loading. Please try refreshing the page.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={reset}
                className="flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </button>
              <Link
                href="/"
                className="flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Link>
            </div>

            {/* Error Details (in development) */}
            {process.env.NODE_ENV === "development" && error.message && (
              <div className="rounded-lg bg-gray-100 p-4 text-left">
                <p className="font-mono text-gray-700 text-sm">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="mt-2 text-gray-500 text-xs">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
