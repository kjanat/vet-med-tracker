"use client";

import { SyncStatus } from "@/components/debug/sync-status";

export default function DebugSyncPage() {
	return (
		<div className="container max-w-2xl mx-auto py-8 px-4">
			<h1 className="text-2xl font-bold mb-6">Debug User Sync</h1>
			<p className="text-muted-foreground mb-8">
				This page helps diagnose and fix user synchronization issues between
				Clerk authentication and the application database.
			</p>
			<SyncStatus />

			<div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
				<h2 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
					Troubleshooting Steps:
				</h2>
				<ol className="list-decimal list-inside space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
					<li>
						Check if your Clerk user appears in the &quot;Clerk User&quot;
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

			<div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
				<h2 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
					Common Issues:
				</h2>
				<ul className="list-disc list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
					<li>Database connection issues in production</li>
					<li>Missing environment variables</li>
					<li>Database migrations not run</li>
					<li>Network connectivity problems</li>
				</ul>
			</div>
		</div>
	);
}
