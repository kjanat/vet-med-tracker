"use client";

import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useBackgroundSync } from "@/hooks/offline/useBackgroundSync";
import { useOfflineQueue } from "@/hooks/offline/useOfflineQueue";

export function OfflineBanner() {
	const { isOnline, queueSize, isProcessing, sync } = useOfflineQueue();
	const { requestSync } = useBackgroundSync();
	const [showBanner, setShowBanner] = useState(false);

	useEffect(() => {
		// Show banner when offline or when there are queued items
		setShowBanner(!isOnline || queueSize > 0);
	}, [isOnline, queueSize]);

	const handleRetryNow = async () => {
		if (isOnline) {
			await sync();
		} else {
			// Request background sync for when connection returns
			await requestSync("admin");
			await requestSync("inventory");
			await requestSync("settings");
		}
	};

	if (!showBanner) {
		return null;
	}

	return (
		<Alert
			className={`mb-4 ${!isOnline ? "border-orange-200 bg-orange-50" : "border-blue-200 bg-blue-50"}`}
		>
			<div className="flex items-center gap-2">
				{isOnline ? (
					<Wifi className="h-4 w-4 text-blue-600" />
				) : (
					<WifiOff className="h-4 w-4 text-orange-600" />
				)}

				<AlertDescription className="flex-1">
					{!isOnline ? (
						<>
							<strong>You&apos;re offline.</strong> Changes will be saved and
							synced when connection is restored.
							{queueSize > 0 && ` ${queueSize} items queued.`}
						</>
					) : queueSize > 0 ? (
						<>
							<strong>Syncing changes...</strong> {queueSize} items pending.
						</>
					) : (
						<>
							<strong>Back online!</strong> All changes have been synced.
						</>
					)}
				</AlertDescription>

				{(queueSize > 0 || !isOnline) && (
					<Button
						variant="outline"
						size="sm"
						onClick={handleRetryNow}
						disabled={isProcessing}
						className="shrink-0 bg-transparent"
					>
						{isProcessing ? (
							<>
								<RefreshCw className="mr-2 h-3 w-3 animate-spin" />
								Syncing...
							</>
						) : (
							<>
								<RefreshCw className="mr-2 h-3 w-3" />
								{isOnline ? "Retry Now" : "Queue for Sync"}
							</>
						)}
					</Button>
				)}
			</div>
		</Alert>
	);
}
