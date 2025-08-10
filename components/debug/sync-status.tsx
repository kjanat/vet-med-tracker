"use client";

import { useUser } from "@stackframe/stack";
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface SyncStatus {
	stackUser: {
		id: string;
		email: string;
		name: string;
	} | null;
	dbUser: {
		id: string;
		stackUserId: string;
		email: string;
		name: string;
	} | null;
	synced: boolean;
}

export function SyncStatus() {
	const user = useUser();
	const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
	const [loading, setLoading] = useState(true);
	const [syncing, setSyncing] = useState(false);

	const checkSyncStatus = useCallback(async () => {
		try {
			const response = await fetch("/api/sync-user");
			if (!response.ok) {
				throw new Error("Failed to check sync status");
			}
			const data = await response.json();
			setSyncStatus(data);
		} catch (error) {
			console.error("Error checking sync status:", error);
			toast.error("Failed to check sync status");
		} finally {
			setLoading(false);
		}
	}, []);

	const syncUser = async () => {
		setSyncing(true);
		try {
			const response = await fetch("/api/sync-user", {
				method: "POST",
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.details || "Failed to sync user");
			}

			const data = await response.json();
			toast.success(data.message || "User synced successfully");

			// Re-check status
			await checkSyncStatus();

			// Reload the page to refresh all data
			setTimeout(() => {
				window.location.reload();
			}, 1500);
		} catch (error) {
			console.error("Error syncing user:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to sync user",
			);
		} finally {
			setSyncing(false);
		}
	};

	useEffect(() => {
		if (user) {
			checkSyncStatus();
		}
	}, [user, checkSyncStatus]);

	const isLoaded = true; // Stack Auth loads synchronously
	if (!isLoaded || loading) {
		return (
			<Card>
				<CardContent className="pt-6">
					<div className="flex items-center justify-center">
						<Loader2 className="h-6 w-6 animate-spin" />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!user) {
		return null;
	}

	const isSynced = syncStatus?.synced || false;

	return (
		<Card className={isSynced ? "border-green-500" : "border-red-500"}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					{isSynced ? (
						<CheckCircle className="h-5 w-5 text-green-500" />
					) : (
						<AlertCircle className="h-5 w-5 text-red-500" />
					)}
					User Sync Status
				</CardTitle>
				<CardDescription>
					{isSynced
						? "Your account is properly synced"
						: "Your account needs to be synced with the database"}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div>
					<h4 className="mb-2 font-medium">Stack User</h4>
					<div className="space-y-1 text-muted-foreground text-sm">
						<p>ID: {syncStatus?.stackUser?.id || "N/A"}</p>
						<p>Email: {syncStatus?.stackUser?.email || "N/A"}</p>
						<p>Name: {syncStatus?.stackUser?.name || "N/A"}</p>
					</div>
				</div>

				<div>
					<h4 className="mb-2 font-medium">Database User</h4>
					<div className="space-y-1 text-muted-foreground text-sm">
						{syncStatus?.dbUser ? (
							<>
								<p>ID: {syncStatus.dbUser.id}</p>
								<p>Stack ID: {syncStatus.dbUser.stackUserId}</p>
								<p>Email: {syncStatus.dbUser.email}</p>
								<p>Name: {syncStatus.dbUser.name || "N/A"}</p>
							</>
						) : (
							<p className="text-red-500">User not found in database</p>
						)}
					</div>
				</div>

				{!isSynced && (
					<Button
						onClick={syncUser}
						disabled={syncing}
						className="w-full"
						variant="default"
					>
						{syncing ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Syncing...
							</>
						) : (
							<>
								<RefreshCw className="mr-2 h-4 w-4" />
								Sync User Now
							</>
						)}
					</Button>
				)}
			</CardContent>
		</Card>
	);
}
