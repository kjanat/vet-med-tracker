"use client";

import { useRef, useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import {
	MobileMedicationCard,
	MobileSectionHeader,
} from "@/components/ui/mobile-medication-card";
import {
	MobileRecordHeader,
	MobileRecordStats,
} from "@/components/ui/mobile-record-header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/shared/useMediaQuery";

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
	targetTime?: string;
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

interface MobileRecordLayoutProps {
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

// Custom hook for swipe handling
function useSwipeHandler(
	currentIndex: number,
	maxIndex: number,
	onChange: (index: number) => void,
) {
	const touchStartX = useRef<number>(0);
	const touchEndX = useRef<number>(0);

	const handleTouchStart = (e: React.TouchEvent) => {
		if (e.targetTouches[0]) {
			touchStartX.current = e.targetTouches[0].clientX;
		}
	};

	const handleTouchEnd = (e: React.TouchEvent) => {
		if (e.changedTouches[0]) {
			touchEndX.current = e.changedTouches[0].clientX;
			const swipeThreshold = 50;
			const swipeDistance = touchStartX.current - touchEndX.current;

			if (Math.abs(swipeDistance) > swipeThreshold) {
				if (swipeDistance > 0 && currentIndex < maxIndex) {
					onChange(currentIndex + 1);
				} else if (swipeDistance < 0 && currentIndex > 0) {
					onChange(currentIndex - 1);
				}
			}
		}
	};

	return { handleTouchStart, handleTouchEnd };
}

// Helper to get medication sections
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

// Helper component for non-select steps
function NonSelectStepLayout({
	step,
	selectedRegimen,
	onBack,
	onCancel,
	children,
}: {
	step: "confirm" | "success";
	selectedRegimen: DueRegimen | null;
	onBack?: () => void;
	onCancel?: () => void;
	children?: React.ReactNode;
}) {
	return (
		<>
			<MobileRecordHeader
				step={step}
				selectedAnimalName={selectedRegimen?.animalName}
				selectedMedication={selectedRegimen?.medicationName}
				onBack={onBack}
				onCancel={onCancel}
			/>
			<div className="flex-1 overflow-auto">{children}</div>
		</>
	);
}

export function MobileRecordLayout({
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
}: MobileRecordLayoutProps) {
	// All hooks must be called at the top level, before any early returns
	const isMobile = useMediaQuery("(max-width: 768px)");
	const { animals, selectedHousehold } = useApp();
	const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

	// Group regimens by section for mobile navigation
	const groupedRegimens = dueRegimens
		? getGroupedRegimens(dueRegimens)
		: {
				due: [],
				later: [],
				prn: [],
			};

	const sections = getMedicationSections(groupedRegimens);
	const currentSection = sections[currentSectionIndex];

	// Use swipe handler - must be called before early returns
	const { handleTouchStart, handleTouchEnd } = useSwipeHandler(
		currentSectionIndex,
		sections.length - 1,
		setCurrentSectionIndex,
	);

	// If not mobile, return children as-is (fallback to desktop layout)
	if (!isMobile) {
		return <>{children}</>;
	}

	// Calculate stats for header
	const stats = calculateStats(groupedRegimens, dueRegimens || []);

	if (step !== "select") {
		return (
			<NonSelectStepLayout
				step={step}
				selectedRegimen={selectedRegimen}
				onBack={onBack}
				onCancel={onCancel}
			>
				{children}
			</NonSelectStepLayout>
		);
	}

	return (
		<div className="flex h-full flex-col">
			<MobileRecordHeader step="select" onCancel={onCancel} />

			{(stats.dueCount > 0 || stats.overdueCount > 0) && (
				<MobileRecordStats
					dueCount={stats.dueCount}
					overdueCount={stats.overdueCount}
					complianceRate={stats.complianceRate}
				/>
			)}

			<StatusAlerts isOnline={isOnline} regimensError={regimensError} />

			<div className="flex-1 overflow-hidden">
				{regimensLoading ? (
					<MobileLoadingSkeleton />
				) : !selectedHousehold ? (
					<div className="p-4">
						<Alert>
							<AlertDescription>
								Please select a household to view medications.
							</AlertDescription>
						</Alert>
					</div>
				) : sections.length === 0 ? (
					<EmptyMedicationsState />
				) : (
					<div
						className="flex flex-1 flex-col"
						onTouchStart={handleTouchStart}
						onTouchEnd={handleTouchEnd}
					>
						{/* Section navigation tabs */}
						<SectionNavigationTabs
							sections={sections}
							currentSectionIndex={currentSectionIndex}
							onSectionChange={setCurrentSectionIndex}
						/>

						{/* Current section content */}
						{currentSection && (
							<SectionContent
								section={currentSection}
								animals={animals}
								onRegimenSelect={onRegimenSelect}
							/>
						)}

						{/* Swipe indicator */}
						{sections.length > 1 && (
							<div className="flex justify-center border-t bg-background/95 py-2 backdrop-blur">
								<div className="flex gap-1">
									{sections.map((section, index) => (
										<div
											key={`section-indicator-${section.key}`}
											className={`h-2 w-2 rounded-full transition-colors ${
												index === currentSectionIndex
													? "bg-primary"
													: "bg-muted-foreground/30"
											}`}
										/>
									))}
								</div>
								<div className="sr-only">
									Swipe left or right to navigate between sections
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

function MobileLoadingSkeleton() {
	return (
		<div className="space-y-4 p-4">
			<div className="space-y-2">
				<Skeleton className="h-6 w-32" />
				<Skeleton className="h-4 w-48" />
			</div>
			<div className="space-y-3">
				{[1, 2, 3].map((i) => (
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

function getSectionSubtitle(
	sectionKey: string,
	regimens: DueRegimen[],
): string {
	switch (sectionKey) {
		case "due": {
			const overdueCount = regimens.filter((r) => r.isOverdue).length;
			return overdueCount > 0
				? `${overdueCount} overdue medication${overdueCount === 1 ? "" : "s"}`
				: "Medications ready to administer";
		}

		case "later":
			return "Scheduled for later today";

		case "prn":
			return "Give as needed when symptoms occur";

		default:
			return "";
	}
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

// Helper function to calculate stats
function calculateStats(
	groupedRegimens: ReturnType<typeof getGroupedRegimens>,
	dueRegimens: DueRegimen[],
) {
	return {
		dueCount: groupedRegimens.due.length,
		overdueCount: groupedRegimens.due.filter((r) => r.isOverdue).length,
		complianceRate: calculateComplianceRate(dueRegimens),
	};
}

// Helper component for section navigation tabs
function SectionNavigationTabs({
	sections,
	currentSectionIndex,
	onSectionChange,
}: {
	sections: Array<{
		key: string;
		title: string;
		regimens: DueRegimen[];
		urgent: boolean;
	}>;
	currentSectionIndex: number;
	onSectionChange: (index: number) => void;
}) {
	if (sections.length <= 1) return null;

	return (
		<div className="flex border-b bg-background/95 backdrop-blur">
			{sections.map((section, index) => (
				<button
					type="button"
					key={section.key}
					className={`flex-1 border-b-2 px-3 py-3 font-medium text-sm transition-colors ${
						index === currentSectionIndex
							? "border-primary text-primary"
							: "border-transparent text-muted-foreground hover:text-foreground"
					}`}
					onClick={() => onSectionChange(index)}
					aria-label={`Switch to ${section.title} section`}
				>
					<div className="flex items-center justify-center gap-2">
						<span>{section.title}</span>
						<span
							className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
								section.urgent
									? "bg-red-100 text-red-700"
									: "bg-muted text-muted-foreground"
							}`}
						>
							{section.regimens.length}
						</span>
					</div>
				</button>
			))}
		</div>
	);
}

// Helper component for empty state
function EmptyMedicationsState() {
	return (
		<div className="flex flex-1 items-center justify-center p-8">
			<div className="text-center text-muted-foreground">
				<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted opacity-50">
					💊
				</div>
				<h3 className="mb-2 font-medium text-lg">No medications due</h3>
				<p className="text-sm">
					All caught up! No medications are due at this time.
				</p>
			</div>
		</div>
	);
}

// Helper component for status alerts
function StatusAlerts({
	isOnline,
	regimensError,
}: {
	isOnline: boolean;
	regimensError: Error | null;
}) {
	return (
		<>
			{!isOnline && (
				<Alert className="mx-4 mt-4 border-amber-200 bg-amber-50">
					<AlertDescription className="text-amber-800 text-sm">
						You're offline. Recordings will be saved and synced when connection
						is restored.
					</AlertDescription>
				</Alert>
			)}

			{regimensError && (
				<Alert variant="destructive" className="mx-4 mt-4">
					<AlertDescription>
						Failed to load medications: {regimensError.message}
					</AlertDescription>
				</Alert>
			)}
		</>
	);
}

// Helper component for section content
function SectionContent({
	section,
	animals,
	onRegimenSelect,
}: {
	section: {
		key: string;
		title: string;
		regimens: DueRegimen[];
		urgent: boolean;
	};
	animals: Array<{
		id: string;
		name: string;
		species: string;
		imageUrl?: string | null;
	}>;
	onRegimenSelect: (regimen: DueRegimen) => void;
}) {
	return (
		<ScrollArea className="flex-1">
			<div className="p-4">
				<MobileSectionHeader
					title={section.title}
					count={section.regimens.length}
					subtitle={getSectionSubtitle(section.key, section.regimens)}
					className="mb-4"
				/>

				<div className="space-y-3">
					{section.regimens.map((regimen) => {
						const animal = animals.find((a) => a.id === regimen.animalId);
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
		</ScrollArea>
	);
}
