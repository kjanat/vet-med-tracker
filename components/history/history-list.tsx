"use client";

import { format, isToday, isYesterday } from "date-fns";
import {
	AlertTriangle,
	CheckCircle,
	ChevronRight,
	Clock,
	Trash2,
	UserCheck,
} from "lucide-react";
import { useRef, useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useScreenReaderAnnouncements } from "@/components/ui/screen-reader-announcer";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { useKeyboardNavigation } from "@/lib/keyboard-shortcuts";
import type { AdministrationRecord } from "@/lib/types";
import { formatTimeLocal } from "@/utils/tz";

interface HistoryListProps {
	groups: Array<{
		date: Date;
		records: AdministrationRecord[];
	}>;
	onLoadMore: () => void;
	hasMore: boolean;
	onUndo: (id: string) => void;
	onDelete: (id: string) => void;
	onCosign: (id: string) => void;
}

export function HistoryList({
	groups,
	onLoadMore,
	hasMore,
	onUndo,
	onDelete,
	onCosign,
}: HistoryListProps) {
	const { isOnline } = useOfflineQueue();
	const listRef = useRef<HTMLDivElement>(null);

	// Enable keyboard navigation for the history list
	useKeyboardNavigation(listRef as React.RefObject<HTMLElement>, {
		direction: "vertical",
		wrap: true,
		itemSelector: '[role="button"][aria-expanded]',
	});

	if (groups.length === 0) {
		return (
			<output
				className="text-center py-12"
				aria-label="No medication administrations found"
			>
				<div className="text-muted-foreground">
					<Clock
						className="h-12 w-12 mx-auto mb-4 opacity-50"
						aria-hidden="true"
					/>
					<h3 className="text-lg font-medium mb-2">No administrations found</h3>
					<p>No administrations in this range. Try widening your filters.</p>
				</div>
			</output>
		);
	}

	return (
		<div
			ref={listRef}
			className="space-y-6"
			role="log"
			aria-label="Medication administration history"
		>
			{groups.map((group, groupIndex) => {
				const dateLabel = isToday(group.date)
					? "Today"
					: isYesterday(group.date)
						? "Yesterday"
						: format(group.date, "EEEE, MMMM d");

				return (
					<section
						key={group.date.toISOString()}
						className="space-y-3"
						aria-labelledby={`date-heading-${groupIndex}`}
					>
						<div className="sticky top-20 bg-background/95 backdrop-blur-sm py-2">
							<h2
								id={`date-heading-${groupIndex}`}
								className="font-semibold text-lg"
							>
								{dateLabel}
							</h2>
						</div>

						<ul
							className="space-y-2 list-none"
							aria-label={`${dateLabel} administrations`}
						>
							{group.records.map((record) => (
								<AdministrationRow
									key={record.id}
									record={record}
									onUndo={onUndo}
									onDelete={onDelete}
									onCosign={onCosign}
									isOffline={!isOnline}
								/>
							))}
						</ul>
					</section>
				);
			})}

			{hasMore && (
				<nav className="text-center py-6" aria-label="Load more history">
					<Button
						variant="outline"
						onClick={() => {
							onLoadMore();
							window.dispatchEvent(new CustomEvent("history_pagination_next"));
						}}
						aria-label="Load more medication administration records"
					>
						Load More
					</Button>
				</nav>
			)}

			{!isOnline && (
				<div
					className="text-center py-4 text-sm text-muted-foreground"
					role="alert"
					aria-live="polite"
				>
					Showing cached history. Some recent changes may not be visible.
				</div>
			)}
		</div>
	);
}

const STATUS_CONFIG = {
	ON_TIME: {
		icon: CheckCircle,
		color: "text-green-600",
		bg: "bg-green-100",
		label: "On-time",
	},
	LATE: {
		icon: Clock,
		color: "text-yellow-600",
		bg: "bg-yellow-100",
		label: "Late",
	},
	VERY_LATE: {
		icon: AlertTriangle,
		color: "text-orange-600",
		bg: "bg-orange-100",
		label: "Very late",
	},
	MISSED: {
		icon: AlertTriangle,
		color: "text-red-600",
		bg: "bg-red-100",
		label: "Missed",
	},
	PRN: {
		icon: CheckCircle,
		color: "text-blue-600",
		bg: "bg-blue-100",
		label: "PRN",
	},
} as const;

// Helper component for rendering administration badges
function AdministrationBadges({ record }: { record: AdministrationRecord }) {
	return (
		<>
			{record.cosignPending && (
				<Badge
					variant="outline"
					className="text-orange-600 border-orange-200 hidden sm:inline-flex"
				>
					Co-sign
				</Badge>
			)}
			{record.isEdited && (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger>
							<Badge
								variant="secondary"
								className="text-xs hidden sm:inline-flex"
							>
								edited
							</Badge>
						</TooltipTrigger>
						<TooltipContent>
							Edited by {record.editedBy} at {record.editedAt?.toLocaleString()}
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			)}
		</>
	);
}

// Helper component for rendering administration main content
function AdministrationMainContent({
	record,
	animal,
	status,
	isExpanded,
}: {
	record: AdministrationRecord;
	animal?: {
		id: string;
		name: string;
		species: string;
		imageUrl?: string | null;
	};
	status: (typeof STATUS_CONFIG)[keyof typeof STATUS_CONFIG];
	isExpanded: boolean;
}) {
	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
				<div className="text-sm font-mono text-muted-foreground shrink-0">
					{formatTimeLocal(record.recordedAt, "America/New_York")}
				</div>

				{animal && <AnimalAvatar animal={animal} size="sm" />}

				<div className="flex-1 min-w-0">
					<div className="font-medium truncate">
						{record.animalName} - {record.medicationName} {record.strength}
					</div>
					<div className="text-sm text-muted-foreground">
						{record.slot || "PRN"} • {record.caregiverName}
					</div>
				</div>
			</div>

			<div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
				<StatusIcon status={status} />
				<AdministrationBadges record={record} />

				<ChevronRight
					className={`h-4 w-4 transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`}
				/>
			</div>
		</div>
	);
}

// Helper component for status icon
function StatusIcon({
	status,
}: {
	status: (typeof STATUS_CONFIG)[keyof typeof STATUS_CONFIG];
}) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger>
					<div className={`p-1 rounded-full ${status.bg}`}>
						<status.icon className={`h-4 w-4 ${status.color}`} />
					</div>
				</TooltipTrigger>
				<TooltipContent>{status.label}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function AdministrationRow({
	record,
	onUndo,
	onDelete,
	onCosign,
	isOffline,
}: {
	record: AdministrationRecord;
	onUndo: (id: string) => void;
	onDelete: (id: string) => void;
	onCosign: (id: string) => void;
	isOffline: boolean;
}) {
	const [isExpanded, setIsExpanded] = useState(false);
	const { animals } = useApp();
	const { announce } = useScreenReaderAnnouncements();

	const handleExpandToggle = (expanded: boolean) => {
		setIsExpanded(expanded);
		announce(
			`${record.animalName} ${record.medicationName} details ${expanded ? "expanded" : "collapsed"}`,
			"polite",
		);
	};

	const animal = animals.find((a) => a.id === record.animalId);
	const canUndo = canUndoRecord(record);
	const canDelete = canDeleteRecord(record);
	const status = STATUS_CONFIG[record.status];

	return (
		<li className="list-none">
			<Card
				className={record.isDeleted ? "opacity-50" : ""}
				aria-label={`Medication administration: ${record.animalName} - ${record.medicationName} ${record.strength}`}
			>
				<Collapsible open={isExpanded} onOpenChange={handleExpandToggle}>
					<CollapsibleTrigger asChild>
						<CardContent
							className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
							aria-expanded={isExpanded}
							aria-controls={`administration-details-${record.id}`}
							aria-label={`${isExpanded ? "Hide" : "Show"} details for ${record.animalName} ${record.medicationName} administration`}
						>
							<AdministrationMainContent
								record={record}
								animal={animal}
								status={status}
								isExpanded={isExpanded}
							/>
						</CardContent>
					</CollapsibleTrigger>

					<CollapsibleContent id={`administration-details-${record.id}`}>
						<CardContent className="pt-0 pb-4 px-4">
							<div className="border-t pt-4 space-y-4">
								{/* Details */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
									{record.scheduledFor && (
										<div>
											<span className="font-medium">Scheduled:</span>{" "}
											{formatTimeLocal(record.scheduledFor, "America/New_York")}
										</div>
									)}
									<div>
										<span className="font-medium">Route:</span> {record.route} •{" "}
										{record.form}
									</div>
									{record.site && (
										<div>
											<span className="font-medium">Site:</span> {record.site}
										</div>
									)}
									{record.sourceItem && (
										<div className="sm:col-span-2">
											<span className="font-medium">Source:</span>{" "}
											{record.sourceItem.name} (Lot {record.sourceItem.lot})
										</div>
									)}
								</div>

								{/* Notes */}
								{record.notes && (
									<div>
										<span className="font-medium text-sm">Notes:</span>
										<p className="text-sm text-muted-foreground mt-1">
											{record.notes}
										</p>
									</div>
								)}

								{/* Co-sign Status */}
								{record.cosignUser && record.cosignedAt && (
									<div className="flex items-center gap-2 text-sm">
										<UserCheck className="h-4 w-4 text-green-600" />
										<span>
											Co-signed by {record.cosignUser} at{" "}
											{formatTimeLocal(record.cosignedAt, "America/New_York")}
										</span>
									</div>
								)}

								{/* Actions */}
								<div className="flex items-center gap-2 pt-2">
									{canUndo && (
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														variant="outline"
														size="sm"
														onClick={() => {
															announce(
																`Undoing medication administration for ${record.animalName} - ${record.medicationName}`,
																"assertive",
															);
															onUndo(record.id);
															window.dispatchEvent(
																new CustomEvent("history_undo", {
																	detail: { recordId: record.id },
																}),
															);
														}}
														disabled={isOffline}
													>
														Undo
													</Button>
												</TooltipTrigger>
												<TooltipContent>
													{record.status === "PRN"
														? "Can undo PRN within 24 hours"
														: "Can undo scheduled within 10 minutes"}
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									)}

									{canDelete && (
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												announce(
													`Deleting medication administration for ${record.animalName} - ${record.medicationName}`,
													"assertive",
												);
												onDelete(record.id);
												window.dispatchEvent(
													new CustomEvent("history_delete", {
														detail: { recordId: record.id },
													}),
												);
											}}
											disabled={isOffline}
										>
											<Trash2 className="h-4 w-4 mr-1" />
											Delete
										</Button>
									)}

									{record.cosignPending && (
										<Button
											variant="default"
											size="sm"
											onClick={() => {
												announce(
													`Co-signing medication administration for ${record.animalName} - ${record.medicationName}`,
													"assertive",
												);
												onCosign(record.id);
												window.dispatchEvent(
													new CustomEvent("history_cosign", {
														detail: { recordId: record.id },
													}),
												);
											}}
											disabled={isOffline}
										>
											<UserCheck className="h-4 w-4 mr-1" />
											Co-sign
										</Button>
									)}
								</div>
							</div>
						</CardContent>
					</CollapsibleContent>
				</Collapsible>
			</Card>
		</li>
	);
}

function canUndoRecord(record: AdministrationRecord): boolean {
	const now = new Date();
	const recordTime = record.recordedAt;
	const diffMinutes = (now.getTime() - recordTime.getTime()) / (1000 * 60);

	if (record.status === "PRN") {
		return diffMinutes <= 24 * 60; // 24 hours for PRN
	} else {
		return diffMinutes <= 10; // 10 minutes for scheduled
	}
}

function canDeleteRecord(record: AdministrationRecord): boolean {
	return canUndoRecord(record); // Same logic for now
}
