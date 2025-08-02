"use client";

import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCardAnimation, PRIORITY_ANIMATIONS } from "@/lib/animation-config";
import { getMedicationStatus, getStatusConfig } from "@/lib/status-config";
import { formatTimeLocal } from "@/utils/tz";

interface MobileMedicationCardProps {
	regimen: {
		id: string;
		animalId: string;
		animalName: string;
		animalSpecies?: string;
		animalPhotoUrl?: string | null;
		medicationName: string;
		brandName?: string | null;
		route: string;
		form: string;
		strength: string;
		dose?: string;
		targetTime?: Date;
		isPRN: boolean;
		isHighRisk: boolean;
		requiresCoSign: boolean;
		section: "due" | "later" | "prn";
		isOverdue?: boolean;
		minutesUntilDue?: number;
		instructions?: string | null;
		prnReason?: string | null;
	};
	animal?: {
		id: string;
		name: string;
		species: string;
		avatar?: string;
	};
	onClick: () => void;
	isSelected?: boolean;
}

/**
 * Mobile-optimized medication card with large touch targets
 * Designed for easy thumb navigation and clear visual hierarchy
 */
export function MobileMedicationCard({
	regimen,
	animal,
	onClick,
	isSelected = false,
}: MobileMedicationCardProps) {
	const getStatusInfo = () => {
		const statusType = getMedicationStatus(regimen);
		const config = getStatusConfig(statusType);

		if (regimen.isPRN) {
			return {
				icon: CheckCircle,
				config,
				label: "PRN",
				priority: "normal" as const,
			};
		}

		if (regimen.isOverdue) {
			return {
				icon: AlertTriangle,
				config,
				label: "Overdue",
				priority: "urgent" as const,
			};
		}

		if (regimen.section === "due") {
			return {
				icon: Clock,
				config,
				label: "Due Now",
				priority: "high" as const,
			};
		}

		return {
			icon: Clock,
			config,
			label: "Later",
			priority: "normal" as const,
		};
	};

	const statusInfo = getStatusInfo();
	const StatusIcon = statusInfo.icon;

	const getTimeDisplay = () => {
		if (regimen.isPRN) {
			return "As needed";
		}

		if (regimen.targetTime) {
			const timeStr = formatTimeLocal(regimen.targetTime, "America/New_York");
			if (regimen.isOverdue && regimen.minutesUntilDue) {
				const overdueMins = Math.abs(regimen.minutesUntilDue);
				return `${timeStr} (${overdueMins}m overdue)`;
			}
			if (regimen.section === "due" && regimen.minutesUntilDue) {
				return `${timeStr} (${regimen.minutesUntilDue}m)`;
			}
			return timeStr;
		}

		return "No time set";
	};

	return (
		<Card
			className={`
        ${getCardAnimation(isSelected)}
        ${statusInfo.config.bg} ${statusInfo.config.border}
      `}
			onClick={onClick}
			tabIndex={0}
			aria-label={`Select ${regimen.medicationName} for ${regimen.animalName}`}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onClick();
				}
			}}
		>
			<CardContent className="p-4">
				{/* Priority indicator */}
				{statusInfo.priority === "urgent" && (
					<output
						className={`absolute top-2 right-2 h-3 w-3 bg-red-500 rounded-full ${PRIORITY_ANIMATIONS.urgent}`}
						aria-label="Urgent medication"
					/>
				)}

				<div className="flex items-start gap-3">
					{/* Animal avatar */}
					{animal && (
						<div className="shrink-0">
							<AnimalAvatar animal={animal} size="md" showBadge={false} />
						</div>
					)}

					{/* Main content */}
					<div className="flex-1 min-w-0">
						{/* Status and time */}
						<div className="flex items-center justify-between mb-2">
							<div className="flex items-center gap-2">
								<StatusIcon
									className={`h-4 w-4 ${statusInfo.config.icon}`}
									aria-hidden="true"
								/>
								<Badge
									variant={
										statusInfo.config.badge as
											| "default"
											| "secondary"
											| "destructive"
											| "outline"
											| "success"
											| "warning"
											| "info"
									}
									className="text-xs"
								>
									{statusInfo.label}
								</Badge>
							</div>

							<div className="text-sm text-muted-foreground font-mono">
								{getTimeDisplay()}
							</div>
						</div>

						{/* Animal name */}
						<div className="font-medium text-base mb-1 truncate">
							{regimen.animalName}
						</div>

						{/* Medication details */}
						<div className="space-y-1">
							<div className="font-semibold text-lg truncate">
								{regimen.medicationName}
								{regimen.brandName &&
									regimen.brandName !== regimen.medicationName && (
										<span className="text-muted-foreground font-normal text-base ml-1">
											({regimen.brandName})
										</span>
									)}
							</div>

							<div className="text-sm text-muted-foreground">
								{regimen.strength} • {regimen.route}
								{regimen.dose && ` • ${regimen.dose}`}
							</div>
						</div>

						{/* Special indicators */}
						<div className="flex items-center gap-2 mt-2">
							{regimen.isHighRisk && (
								<Badge variant="destructive" className="text-xs">
									High Risk
								</Badge>
							)}

							{regimen.requiresCoSign && (
								<Badge variant="outline" className="text-xs">
									Co-sign Required
								</Badge>
							)}

							{regimen.isPRN && regimen.prnReason && (
								<Badge variant="secondary" className="text-xs">
									{regimen.prnReason}
								</Badge>
							)}
						</div>

						{/* Instructions preview */}
						{regimen.instructions && (
							<div className="mt-2 text-sm text-muted-foreground line-clamp-2">
								{regimen.instructions}
							</div>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

/**
 * Mobile-optimized section header for grouping medications
 */
export function MobileSectionHeader({
	title,
	count,
	subtitle,
	className = "",
}: {
	title: string;
	count?: number;
	subtitle?: string;
	className?: string;
}) {
	return (
		<div className={`px-4 py-3 bg-muted/30 border-y ${className}`}>
			<div className="flex items-center justify-between">
				<div>
					<h2 className="font-semibold text-lg">
						{title}
						{count !== undefined && (
							<span className="ml-2 text-muted-foreground font-normal">
								({count})
							</span>
						)}
					</h2>
					{subtitle && (
						<p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
					)}
				</div>
			</div>
		</div>
	);
}
