"use client";

import { SyncStatus } from "@/components/debug/sync-status";

export default function DebugSyncPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-bold text-2xl">Debug User Sync</h1>
      <p className="mb-8 text-muted-foreground">
        This page helps diagnose and fix user synchronization issues between
        Stack Auth and the application database.
      </p>
      <SyncStatus />

      <div className="mt-8 rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
        <h2 className="mb-2 font-semibold text-yellow-900 dark:text-yellow-100">
          Troubleshooting Steps:
        </h2>
        <ol className="list-inside list-decimal space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
          <li>
            Check if your Stack user appears in the &quot;Stack User&quot;
            section
          </li>
          <li>Check if you have a corresponding &quot;Database User&quot;</li>
          <li>
            If not synced, click &quot;Sync User Now&quot; to manually sync
          </li>
          <li>The page will reload after successful sync</li>
          <li>If sync fails, check the browser console for errors</li>
        </ol>
      </div>

      <div className="mt-8 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
        <h2 className="mb-2 font-semibold text-blue-900 dark:text-blue-100">
          Common Issues:
        </h2>
        <ul className="list-inside list-disc space-y-2 text-blue-800 text-sm dark:text-blue-200">
          <li>Database connection issues in production</li>
          <li>Missing environment variables</li>
          <li>Database migrations not run</li>
          <li>Network connectivity problems</li>
        </ul>
      </div>
    </div>
  );
}
