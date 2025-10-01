/**
 * Development Routes Layout - Clean Architecture
 *
 * Minimal layout for development routes
 * Replaces: (main)/(dev)
 */

import type React from "react";

export default function DevLayout({ children }: { children: React.ReactNode }) {
  // Only available in development
  if (process.env.NODE_ENV !== "development") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="font-bold text-2xl text-gray-900 dark:text-gray-100">
            404 - Page Not Found
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            This page is only available in development mode.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-8">
        <div className="mb-6 border-gray-200 border-b pb-4 dark:border-gray-700">
          <h1 className="font-bold text-2xl text-gray-900 dark:text-gray-100">
            Development Tools
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Development and testing utilities
          </p>
        </div>

        <main id="main-content">{children}</main>
      </div>
    </div>
  );
}
