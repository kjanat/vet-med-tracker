"use client";

import { AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getIndexedDBDiagnostics, resetIndexedDBCache } from "@/lib/offline/db";
import { Alert, AlertDescription } from "./alert";
import { Button } from "./button";

interface IndexedDBStatusProps {
	className?: string;
	showWhenWorking?: boolean;
}

export function IndexedDBStatus({
	className,
	showWhenWorking = false,
}: IndexedDBStatusProps) {
	const [diagnostics, setDiagnostics] = useState<{
		supported: boolean;
		available: boolean;
		error?: string;
		suggestion?: string;
	} | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const checkStatus = useCallback(async () => {
		setIsLoading(true);
		try {
			const result = await getIndexedDBDiagnostics();
			setDiagnostics(result);
		} catch (error) {
			console.error("Failed to check IndexedDB status:", error);
			setDiagnostics({
				supported: false,
				available: false,
				error: "Failed to check IndexedDB status",
				suggestion: "Try refreshing the page",
			});
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		checkStatus();
	}, [checkStatus]);

	const handleRetry = useCallback(async () => {
		resetIndexedDBCache();
		await checkStatus();
		toast.info("IndexedDB status refreshed");
	}, [checkStatus]);

	if (isLoading) {
		return (
			<Alert className={className}>
				<RefreshCw className="h-4 w-4 animate-spin" />
				<AlertDescription>Checking offline storage status...</AlertDescription>
			</Alert>
		);
	}

	if (!diagnostics) {
		return null;
	}

	// If IndexedDB is working and we don't want to show success state
	if (diagnostics.available && !showWhenWorking) {
		return null;
	}

	// Success state
	if (diagnostics.available) {
		return (
			<Alert className={className}>
				<CheckCircle className="h-4 w-4 text-green-500" />
				<AlertDescription>Offline storage is working properly</AlertDescription>
			</Alert>
		);
	}

	// Error state
	return (
		<Alert variant="destructive" className={className}>
			<AlertTriangle className="h-4 w-4" />
			<AlertDescription className="space-y-2">
				<div>
					<strong>Offline storage unavailable:</strong> {diagnostics.error}
				</div>
				{diagnostics.suggestion && (
					<div className="text-sm">
						<strong>Suggestion:</strong> {diagnostics.suggestion}
					</div>
				)}
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleRetry}
						className="h-8"
					>
						<RefreshCw className="mr-1 h-3 w-3" />
						Retry
					</Button>
				</div>
			</AlertDescription>
		</Alert>
	);
}
