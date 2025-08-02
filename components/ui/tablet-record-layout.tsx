"use client";

import { ArrowLeft, X } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MobileMedicationCard } from "@/components/ui/mobile-medication-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface DueRegimen {
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
	compliance: number;
	section: "due" | "later" | "prn";
	isOverdue?: boolean;
	minutesUntilDue?: number;
	instructions?: string | null;
	prnReason?: string | null;
}

interface TabletRecordLayoutProps {
	step: "select" | "confirm" | "success";
	selectedRegimen: DueRegimen | null;
	dueRegimens?: DueRegimen[];
	regimensLoading: boolean;
	regimensError: Error | null;
	isOnline: boolean;
	onRegimenSelect: (regimen: DueRegimen) => void;
	onBack?: () => void;
	onCancel?: () => void;
	children?: React.ReactNode;
}

// Helper to get medication sections (shared with mobile layout)
function getMedicationSections(
	groupedRegimens: ReturnType<typeof getGroupedRegimens>,
) {
	return [
		{
			key: "due",
			title: "Due Now",
			regimens: groupedRegimens.due,
			urgent: true,
		},
		{
			key: "later",
			title: "Later Today",
			regimens: groupedRegimens.later,
			urgent: false,
		},
		{
			key: "prn",
			title: "PRN (As Needed)",
			regimens: groupedRegimens.prn,
			urgent: false,
		},
	].filter((section) => section.regimens.length > 0);
}

export function TabletRecordLayout({
	step,
	selectedRegimen,
	dueRegimens,
	regimensLoading,
	regimensError,
	isOnline,
	onRegimenSelect,
	onBack,
	onCancel,
	children,
}: TabletRecordLayoutProps) {
	const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)");
	const { animals, selectedHousehold } = useApp();

	// If not tablet, return children as-is (fallback to other layouts)
	if (!isTablet) {
		return <>{children}</>;
	}

	// Group regimens by section for tablet navigation
	const groupedRegimens = dueRegimens
		? getGroupedRegimens(dueRegimens)
		: {
				due: [],
				later: [],
				prn: [],
			};

	const sections = getMedicationSections(groupedRegimens);

	// Calculate stats for header
	const stats = {
		dueCount: groupedRegimens.due.length,
		overdueCount: groupedRegimens.due.filter((r) => r.isOverdue).length,
		complianceRate: calculateComplianceRate(dueRegimens || []),
	};

	if (step !== "select") {
		// For confirm and success steps, show single-column layout with sidebar context
		return (
			<div className="flex h-full">
				<SidebarContext
					step={step}
					selectedRegimen={selectedRegimen}
					animals={animals}
					onBack={onBack}
					onCancel={onCancel}
				/>
				{/* Main content area */}
				<div className="flex-1 overflow-hidden">{children}</div>
			</div>
		);
	}

	// Two-column layout for selection step
	return (
		<div className="flex h-full">
			{/* Left column - Header and stats */}
			<div className="w-80 shrink-0 border-r bg-muted/30">
				<div className="p-6">
					<div className="flex items-center justify-between mb-4">
						<h1 className="text-2xl font-bold">Record Medication</h1>
						<Button
							variant="ghost"
							size="sm"
							onClick={onCancel}
							className="h-8 w-8 p-0"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>

					<div className="text-muted-foreground mb-6">
						Select a medication to record administration
					</div>

					{/* Quick stats */}
					<StatsDisplay stats={stats} />

					{!isOnline && (
						<Alert className="mb-4">
							<AlertDescription className="text-sm">
								You&apos;re offline. Recordings will be saved and synced when
								connection is restored.
							</AlertDescription>
						</Alert>
					)}

					{regimensError && (
						<Alert variant="destructive" className="mb-4">
							<AlertDescription className="text-sm">
								Failed to load medications: {regimensError.message}
							</AlertDescription>
						</Alert>
					)}
				</div>
			</div>

			{/* Right column - Medication list */}
			<div className="flex-1 overflow-hidden">
				{regimensLoading ? (
					<TabletLoadingSkeleton />
				) : !selectedHousehold ? (
					<div className="flex-1 flex items-center justify-center p-8">
						<Alert>
							<AlertDescription>
								Please select a household to view medications.
							</AlertDescription>
						</Alert>
					</div>
				) : sections.length === 0 ? (
					<EmptyMedicationsState />
				) : (
					<ScrollArea className="h-full">
						<div className="p-6 space-y-6">
							{sections.map((section) => (
								<div key={section.key} className="space-y-4">
									<div className="flex items-center justify-between">
										<h2 className="font-semibold text-xl">{section.title}</h2>
										<Badge
											variant={section.urgent ? "destructive" : "secondary"}
											className="text-sm"
										>
											{section.regimens.length}
										</Badge>
									</div>

									<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
										{section.regimens.map((regimen) => {
											const animal = animals.find(
												(a) => a.id === regimen.animalId,
											);
											return (
												<MobileMedicationCard
													key={regimen.id}
													regimen={regimen}
													animal={animal}
													onClick={() => onRegimenSelect(regimen)}
												/>
											);
										})}
									</div>
								</div>
							))}
						</div>
					</ScrollArea>
				)}
			</div>
		</div>
	);
}

function TabletLoadingSkeleton() {
	return (
		<div className="p-6 space-y-6">
			<div className="space-y-2">
				<Skeleton className="h-6 w-32" />
				<Skeleton className="h-4 w-48" />
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				{[1, 2, 3, 4].map((i) => (
					<Card key={i}>
						<CardContent className="p-4">
							<div className="flex items-start gap-3">
								<Skeleton className="h-12 w-12 rounded-full" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-4 w-full" />
									<Skeleton className="h-3 w-3/4" />
									<div className="flex gap-2">
										<Skeleton className="h-5 w-16" />
										<Skeleton className="h-5 w-20" />
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}

function getGroupedRegimens(regimens: DueRegimen[]) {
	return {
		due: regimens.filter((r) => r.section === "due"),
		later: regimens.filter((r) => r.section === "later"),
		prn: regimens.filter((r) => r.section === "prn"),
	};
}

function calculateComplianceRate(regimens: DueRegimen[]): number {
	if (regimens.length === 0) return 100;

	// Simple calculation - in a real app this would be more sophisticated
	const scheduledRegimens = regimens.filter((r) => !r.isPRN);
	if (scheduledRegimens.length === 0) return 100;

	const onTimeCount = scheduledRegimens.filter(
		(r) => r.section === "due" && !r.isOverdue,
	).length;

	return Math.round((onTimeCount / scheduledRegimens.length) * 100);
}

// Helper component for left sidebar context in confirm/success steps
function SidebarContext({
	step,
	selectedRegimen,
	animals,
	onBack,
	onCancel,
}: {
	step: "confirm" | "success";
	selectedRegimen: DueRegimen | null;
	animals: Array<{
		id: string;
		name: string;
		species: string;
		imageUrl?: string | null;
	}>;
	onBack?: () => void;
	onCancel?: () => void;
}) {
	return (
		<div className="w-80 shrink-0 border-r bg-muted/30">
			<div className="p-4 border-b">
				<div className="flex items-center justify-between">
					<h2 className="font-semibold text-lg">Record Medication</h2>
					<Button
						variant="ghost"
						size="sm"
						onClick={onCancel}
						className="h-8 w-8 p-0"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
				<div className="mt-2 text-sm text-muted-foreground">
					Step {step === "confirm" ? "2" : "3"} of 3
				</div>
			</div>

			{selectedRegimen && (
				<div className="p-4">
					<Card>
						<CardContent className="p-4">
							<div className="flex items-start gap-3">
								{(() => {
									const animal = animals.find(
										(a) => a.id === selectedRegimen.animalId,
									);
									return animal ? (
										<AnimalAvatar animal={animal} size="md" />
									) : null;
								})()}
								<div className="min-w-0 flex-1">
									<div className="font-medium text-base">
										{selectedRegimen.animalName}
									</div>
									<div className="font-semibold text-lg text-primary">
										{selectedRegimen.medicationName}
									</div>
									<div className="text-sm text-muted-foreground space-y-1">
										<div>{selectedRegimen.strength}</div>
										<div>
											{selectedRegimen.route} • {selectedRegimen.form}
										</div>
										{selectedRegimen.dose && (
											<div>Dose: {selectedRegimen.dose}</div>
										)}
										{selectedRegimen.isHighRisk && (
											<Badge variant="destructive" className="text-xs">
												High Risk
											</Badge>
										)}
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{step === "confirm" && (
				<div className="p-4 pt-0">
					<Button variant="outline" className="w-full" onClick={onBack}>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to Selection
					</Button>
				</div>
			)}
		</div>
	);
}

// Helper component for stats display
function StatsDisplay({
	stats,
}: {
	stats: { dueCount: number; overdueCount: number; complianceRate: number };
}) {
	return (
		<div className="space-y-3 mb-6">
			<div className="flex items-center justify-between text-sm">
				<span className="text-muted-foreground">Due Now</span>
				<div className="flex items-center gap-2">
					<div className="h-2 w-2 bg-green-600 rounded-full" />
					<span className="font-medium">{stats.dueCount}</span>
				</div>
			</div>

			{stats.overdueCount > 0 && (
				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">Overdue</span>
					<div className="flex items-center gap-2">
						<div className="h-2 w-2 bg-red-600 rounded-full" />
						<span className="font-medium text-red-600">
							{stats.overdueCount}
						</span>
					</div>
				</div>
			)}

			<div className="flex items-center justify-between text-sm">
				<span className="text-muted-foreground">Compliance</span>
				<span className="font-medium">{stats.complianceRate}%</span>
			</div>
		</div>
	);
}

// Helper component for empty state
function EmptyMedicationsState() {
	return (
		<div className="flex-1 flex items-center justify-center p-8">
			<div className="text-center text-muted-foreground">
				<div className="w-16 h-16 mx-auto mb-4 opacity-50 rounded-full bg-muted flex items-center justify-center">
					💊
				</div>
				<h3 className="text-lg font-medium mb-2">No medications due</h3>
				<p className="text-sm">
					All caught up! No medications are due at this time.
				</p>
			</div>
		</div>
	);
}
