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
import { useApp } from "@/components/providers/app-provider-consolidated";
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
import { useOfflineQueue } from "@/hooks/offline/useOfflineQueue";
import { useKeyboardNavigation } from "@/lib/utils/keyboard-shortcuts";
import type { AdministrationRecord } from "@/lib/utils/types";
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
				className="py-12 text-center"
				aria-label="No medication administrations found"
			>
				<div className="text-muted-foreground">
					<Clock
						className="mx-auto mb-4 h-12 w-12 opacity-50"
						aria-hidden="true"
					/>
					<h3 className="mb-2 font-medium text-lg">No administrations found</h3>
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
						<div className="sticky top-20 bg-background/95 py-2 backdrop-blur-sm">
							<h2
								id={`date-heading-${groupIndex}`}
								className="font-semibold text-lg"
							>
								{dateLabel}
							</h2>
						</div>

						<ul
							className="list-none space-y-2"
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
				<nav className="py-6 text-center" aria-label="Load more history">
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
					className="py-4 text-center text-muted-foreground text-sm"
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
					className="hidden border-orange-200 text-orange-600 sm:inline-flex"
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
								className="hidden text-xs sm:inline-flex"
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
			<div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
				<div className="shrink-0 font-mono text-muted-foreground text-sm">
					{formatTimeLocal(record.recordedAt, "America/New_York")}
				</div>

				{animal && <AnimalAvatar animal={animal} size="sm" />}

				<div className="min-w-0 flex-1">
					<div className="truncate font-medium">
						{record.animalName} - {record.medicationName} {record.strength}
					</div>
					<div className="text-muted-foreground text-sm">
						{record.slot || "PRN"} • {record.caregiverName}
					</div>
				</div>
			</div>

			<div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0">
				<StatusIcon status={status} />
				<AdministrationBadges record={record} />

				<ChevronRight
					className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
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
					<div className={`rounded-full p-1 ${status.bg}`}>
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
							className="cursor-pointer p-4 transition-colors hover:bg-accent/50"
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
						<CardContent className="px-4 pt-0 pb-4">
							<div className="space-y-4 border-t pt-4">
								{/* Details */}
								<div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
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
										<p className="mt-1 text-muted-foreground text-sm">
											{record.notes}
										</p>
									</div>
								)}

								{/* Photo Evidence */}
								{record.media && record.media.length > 0 && (
									<div>
										<span className="font-medium text-sm">Photo Evidence:</span>
										<div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
											{record.media.map((url, index) => (
												<button
													key={index}
													type="button"
													className="group relative aspect-square overflow-hidden rounded-md border transition-transform hover:scale-105"
													onClick={() => window.open(url, "_blank")}
													aria-label={`View photo evidence ${index + 1} of ${record.media?.length}`}
												>
													<img
														src={url}
														alt={`Evidence ${index + 1}`}
														className="h-full w-full object-cover transition-transform group-hover:scale-110"
														loading="lazy"
													/>
													<div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
												</button>
											))}
										</div>
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
											<Trash2 className="mr-1 h-4 w-4" />
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
											<UserCheck className="mr-1 h-4 w-4" />
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
