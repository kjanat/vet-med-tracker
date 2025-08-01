"use client";

import { formatDistanceToNow } from "date-fns";
import { Cloud, CloudOff, RefreshCw, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";

export function SyncStatus() {
	const {
		isOnline,
		queueSize,
		isProcessing,
		syncProgress,
		sync,
		clearQueue,
		getQueueDetails,
		canSync,
	} = useOfflineQueue();

	const [showDetails, setShowDetails] = useState(false);
	const [queueDetails, setQueueDetails] = useState<
		Awaited<ReturnType<typeof getQueueDetails>>
	>([]);

	const handleShowDetails = useCallback(async () => {
		const details = await getQueueDetails();
		setQueueDetails(details);
		setShowDetails(true);
	}, [getQueueDetails]);

	const getProgressPercentage = () => {
		if (syncProgress.total === 0) return 0;
		return (syncProgress.current / syncProgress.total) * 100;
	};

	const getMutationTypeLabel = (type: string) => {
		const labels: Record<string, string> = {
			"admin.create": "Record administration",
			"inventory.update": "Update inventory",
			"inventory.markAsInUse": "Mark inventory as in use",
		};
		return labels[type] || type;
	};

	const getSyncIcon = () => {
		if (isProcessing) return <RefreshCw className="h-4 w-4 animate-spin" />;
		return isOnline ? (
			<Cloud className="h-4 w-4" />
		) : (
			<CloudOff className="h-4 w-4" />
		);
	};

	const getTooltipText = () => {
		if (isOnline) {
			return queueSize > 0
				? `${queueSize} pending change${queueSize > 1 ? "s" : ""}`
				: "All changes synced";
		}
		return "Offline - changes will sync when reconnected";
	};

	const syncButton = (
		<Button
			variant={isOnline ? "ghost" : "outline"}
			size="sm"
			className="relative"
			onClick={canSync ? sync : undefined}
			disabled={!canSync}
		>
			{getSyncIcon()}
			{queueSize > 0 && (
				<Badge
					variant="destructive"
					className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 text-xs"
				>
					{queueSize}
				</Badge>
			)}
		</Button>
	);

	return (
		<TooltipProvider>
			<Popover open={showDetails} onOpenChange={setShowDetails}>
				<Tooltip>
					<TooltipTrigger asChild>
						<PopoverTrigger
							asChild
							onClick={queueSize > 0 ? handleShowDetails : undefined}
						>
							{syncButton}
						</PopoverTrigger>
					</TooltipTrigger>
					<TooltipContent>
						<p>{getTooltipText()}</p>
					</TooltipContent>
				</Tooltip>

				<PopoverContent className="w-80" align="end">
					<div className="flex items-center justify-between mb-4">
						<h3 className="font-semibold">Offline Queue</h3>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowDetails(false)}
						>
							<X className="h-4 w-4" />
						</Button>
					</div>

					{isProcessing && (
						<div className="mb-4">
							<div className="flex items-center justify-between text-sm mb-2">
								<span>Syncing changes...</span>
								<span className="text-muted-foreground">
									{syncProgress.current} / {syncProgress.total}
								</span>
							</div>
							<Progress value={getProgressPercentage()} className="h-2" />
						</div>
					)}

					<div className="space-y-2 max-h-64 overflow-y-auto">
						{queueDetails.length === 0 ? (
							<p className="text-center text-muted-foreground py-4">
								No pending changes
							</p>
						) : (
							queueDetails.map((item) => (
								<div key={item.id} className="text-sm p-2 rounded-md bg-muted">
									<div className="flex items-center justify-between">
										<span className="font-medium">
											{getMutationTypeLabel(item.type)}
										</span>
										{item.retries > 0 && (
											<Badge variant="outline" className="text-xs">
												Retry {item.retries}
											</Badge>
										)}
									</div>
									<div className="text-xs text-muted-foreground mt-1">
										{formatDistanceToNow(new Date(item.timestamp), {
											addSuffix: true,
										})}
									</div>
									{item.lastError && (
										<div className="text-xs text-destructive mt-1">
											Error: {item.lastError}
										</div>
									)}
								</div>
							))
						)}
					</div>

					{queueSize > 0 && (
						<>
							<Separator className="my-4" />
							<div className="flex gap-2">
								<Button
									variant="default"
									size="sm"
									onClick={sync}
									disabled={!canSync}
									className="flex-1"
								>
									<RefreshCw className="h-4 w-4 mr-2" />
									Sync Now
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => clearQueue()}
									className="flex-1"
								>
									Clear Queue
								</Button>
							</div>
						</>
					)}
				</PopoverContent>
			</Popover>
		</TooltipProvider>
	);
}
