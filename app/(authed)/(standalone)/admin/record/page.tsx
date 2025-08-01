"use client";

import { ArrowLeft, Camera, Tag } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { RecordAdminErrorBoundary } from "@/components/error-boundary-page";
import { useApp } from "@/components/providers/app-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InventorySourceSelect } from "@/components/ui/inventory-source-select";
import { Label } from "@/components/ui/label";
import { MedConfirmButton } from "@/components/ui/med-confirm-button";
import { MobileConfirmLayout } from "@/components/ui/mobile-confirm-layout";
import { MobileRecordLayout } from "@/components/ui/mobile-record-layout";
import { MobileSuccessLayout } from "@/components/ui/mobile-success-layout";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TabletConfirmLayout } from "@/components/ui/tablet-confirm-layout";
import { TabletRecordLayout } from "@/components/ui/tablet-record-layout";
import { TabletSuccessLayout } from "@/components/ui/tablet-success-layout";
import { Textarea } from "@/components/ui/textarea";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { trpc } from "@/server/trpc/client";
import type { InventorySource } from "@/types/inventory";
import { adminKey } from "@/utils/idempotency";
import { formatTimeLocal, localDayISO } from "@/utils/tz";

type RecordStep = "select" | "confirm" | "success";

type RecordState = ReturnType<typeof useRecordState>;

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
	lastAdministration?: {
		id: string;
		recordedAt: Date;
		status: string;
	} | null;
}

function useRecordState() {
	const [step, setStep] = useState<RecordStep>("select");
	const [selectedRegimen, setSelectedRegimen] = useState<DueRegimen | null>(
		null,
	);
	const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);
	const [inventorySourceId, setInventorySourceId] = useState<string | null>(
		null,
	);
	const [allowOverride, setAllowOverride] = useState(false);
	const [requiresCoSign, setRequiresCoSign] = useState(false);
	const [notes, setNotes] = useState("");
	const [site, setSite] = useState("");
	const [conditionTags, setConditionTags] = useState<string[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);

	return {
		step,
		setStep,
		selectedRegimen,
		setSelectedRegimen,
		selectedAnimalId,
		setSelectedAnimalId,
		inventorySourceId,
		setInventorySourceId,
		allowOverride,
		setAllowOverride,
		requiresCoSign,
		setRequiresCoSign,
		notes,
		setNotes,
		site,
		setSite,
		conditionTags,
		setConditionTags,
		isSubmitting,
		setIsSubmitting,
	};
}

// Custom hook to handle data fetching
function useRecordData(
	state: ReturnType<typeof useRecordState>,
	selectedHousehold: { id: string } | null,
) {
	const utils = trpc.useUtils();

	// Fetch due regimens from API
	const {
		data: dueRegimens,
		isLoading: regimensLoading,
		error: regimensError,
	} = trpc.regimen.listDue.useQuery(
		{
			householdId: selectedHousehold?.id,
			animalId: state.selectedAnimalId || undefined,
			includeUpcoming: true,
		},
		{
			enabled: !!selectedHousehold?.id,
			refetchInterval: 60000, // Refresh every minute
		},
	);

	// Create record administration mutation
	const createAdminMutation = trpc.admin.create.useMutation({
		onSuccess: () => {
			// Invalidate due regimens to refresh the list
			utils.regimen.listDue.invalidate();
			state.setStep("success");
		},
		onError: (error) => {
			console.error("Failed to record administration:", error);
			toast.error("Failed to record administration");
		},
	});

	// Inventory update mutation
	const updateInventoryMutation = trpc.inventory.updateQuantity.useMutation({
		onSuccess: () => {
			utils.inventory.getSources.invalidate();
			utils.inventory.getHouseholdInventory.invalidate();
		},
		onError: (error) => {
			console.error("Failed to update inventory:", error);
			toast.error("Failed to update inventory");
		},
	});

	// Fetch inventory sources when a regimen is selected
	const { data: inventorySources, isLoading: inventoryLoading } =
		trpc.inventory.getSources.useQuery(
			{
				householdId: selectedHousehold?.id || "",
				medicationName: state.selectedRegimen?.medicationName || "",
				includeExpired: state.allowOverride,
			},
			{
				enabled: !!state.selectedRegimen && !!selectedHousehold?.id,
			},
		);

	return {
		dueRegimens,
		regimensLoading,
		regimensError,
		createAdminMutation,
		updateInventoryMutation,
		inventorySources,
		inventoryLoading,
	};
}

// Component for the selection step
function SelectionStep({
	state,
	dueRegimens,
	regimensLoading,
	regimensError,
	selectedHousehold,
	animals,
	isOnline,
	searchParams,
	router,
	handleRegimenSelect,
}: {
	state: ReturnType<typeof useRecordState>;
	dueRegimens?: DueRegimen[];
	regimensLoading: boolean;
	regimensError: Error | null;
	selectedHousehold: { id: string } | null;
	animals: Array<{
		id: string;
		name: string;
		species: string;
		pendingMeds: number;
		avatar?: string;
	}>;
	isOnline: boolean;
	searchParams: ReturnType<typeof useSearchParams>;
	router: ReturnType<typeof useRouter>;
	handleRegimenSelect: (regimen: DueRegimen) => void;
}) {
	const groupedRegimens = getGroupedRegimens(
		dueRegimens || [],
		state.selectedAnimalId,
	);

	return (
		<div className="max-w-4xl mx-auto space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Record Medication</h1>
					<p className="text-muted-foreground">
						{state.selectedAnimalId
							? `Recording for ${animals.find((a) => a.id === state.selectedAnimalId)?.name}`
							: "Select a medication to record"}
					</p>
				</div>
				{searchParams.get("from") === "home" && (
					<Button variant="ghost" onClick={() => router.push("/")}>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to Home
					</Button>
				)}
			</div>

			{!isOnline && (
				<Card className="border-yellow-200 bg-yellow-50">
					<CardContent className="pt-6">
						<p className="text-sm text-yellow-800">
							You&apos;re offline. Recordings will be saved and synced when
							connection is restored.
						</p>
					</CardContent>
				</Card>
			)}

			{regimensError && (
				<Alert variant="destructive">
					<AlertDescription>
						Failed to load medications: {regimensError.message}
					</AlertDescription>
				</Alert>
			)}

			{regimensLoading ? (
				<Card>
					<CardHeader>
						<Skeleton className="h-8 w-48" />
						<Skeleton className="h-4 w-64" />
					</CardHeader>
					<CardContent className="space-y-3">
						<Skeleton className="h-20 w-full" />
						<Skeleton className="h-20 w-full" />
						<Skeleton className="h-20 w-full" />
					</CardContent>
				</Card>
			) : !selectedHousehold ? (
				<Alert>
					<AlertDescription>
						Please select a household to view medications.
					</AlertDescription>
				</Alert>
			) : (
				<MedicationSections
					groupedRegimens={groupedRegimens}
					dueRegimens={dueRegimens}
					handleRegimenSelect={handleRegimenSelect}
				/>
			)}
		</div>
	);
}

// Component for medication sections
function MedicationSections({
	groupedRegimens,
	dueRegimens,
	handleRegimenSelect,
}: {
	groupedRegimens: ReturnType<typeof getGroupedRegimens>;
	dueRegimens?: DueRegimen[];
	handleRegimenSelect: (regimen: DueRegimen) => void;
}) {
	return (
		<div className="space-y-6">
			{groupedRegimens.due.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							Due Now
							<Badge variant="destructive">{groupedRegimens.due.length}</Badge>
						</CardTitle>
						<CardDescription>
							Medications that are due or overdue
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{groupedRegimens.due.map((regimen) => (
							<RegimenCard
								key={regimen.id}
								regimen={regimen}
								onSelect={handleRegimenSelect}
							/>
						))}
					</CardContent>
				</Card>
			)}

			{groupedRegimens.later.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							Later Today
							<Badge variant="secondary">{groupedRegimens.later.length}</Badge>
						</CardTitle>
						<CardDescription>
							Upcoming medications scheduled for today
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{groupedRegimens.later.map((regimen) => (
							<RegimenCard
								key={regimen.id}
								regimen={regimen}
								onSelect={handleRegimenSelect}
							/>
						))}
					</CardContent>
				</Card>
			)}

			{groupedRegimens.prn.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							PRN (As Needed)
							<Badge variant="outline">{groupedRegimens.prn.length}</Badge>
						</CardTitle>
						<CardDescription>
							Medications that can be given as needed
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{groupedRegimens.prn.map((regimen) => (
							<RegimenCard
								key={regimen.id}
								regimen={regimen}
								onSelect={handleRegimenSelect}
							/>
						))}
					</CardContent>
				</Card>
			)}

			{dueRegimens && dueRegimens.length === 0 && (
				<Card>
					<CardContent className="pt-6">
						<p className="text-center text-muted-foreground">
							No medications are due at this time.
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

// Helper function to handle URL parameters
function useURLParams(
	state: RecordState,
	dueRegimens: DueRegimen[] | undefined,
) {
	const searchParams = useSearchParams();

	useEffect(() => {
		const animalId = searchParams.get("animalId");
		const regimenId = searchParams.get("regimenId");

		if (animalId) {
			state.setSelectedAnimalId(animalId);
		}

		if (regimenId && dueRegimens) {
			const regimen = dueRegimens.find((r) => r.id === regimenId);
			if (regimen) {
				state.setSelectedRegimen(regimen);
				state.setSelectedAnimalId(regimen.animalId);
				state.setStep("confirm");
			}
		}
	}, [searchParams, dueRegimens, state]);
}

// Helper function to handle offline administration
async function handleOfflineAdministration(
	state: RecordState,
	selectedHousehold: { id: string } | null,
	enqueue: (
		type: "admin.create" | "inventory.update" | "inventory.markAsInUse",
		payload: unknown,
		key: string,
	) => Promise<string>,
) {
	if (!state.selectedRegimen || !selectedHousehold) return;

	const payload = createAdminPayload(state, selectedHousehold.id);
	await enqueue("admin.create", payload, payload.idempotencyKey);

	if (state.inventorySourceId) {
		const inventoryPayload = {
			id: state.inventorySourceId,
			householdId: selectedHousehold.id,
			quantityChange: -1,
			reason: `Administration for ${state.selectedRegimen.animalName}`,
		};
		await enqueue(
			"inventory.update",
			inventoryPayload,
			`inventory-${state.inventorySourceId}-${Date.now()}`,
		);
	}

	state.setStep("success");
}

// Helper function to handle online administration
async function handleOnlineAdministration(
	state: RecordState,
	selectedHousehold: { id: string } | null,
	createAdminMutation: ReturnType<typeof trpc.admin.create.useMutation>,
	updateInventoryMutation: ReturnType<
		typeof trpc.inventory.updateQuantity.useMutation
	>,
) {
	if (!state.selectedRegimen || !selectedHousehold) return;

	const payload = createAdminPayload(state, selectedHousehold.id);
	await createAdminMutation.mutateAsync(payload);

	if (state.inventorySourceId) {
		await updateInventoryMutation.mutateAsync({
			id: state.inventorySourceId,
			householdId: selectedHousehold.id,
			quantityChange: -1,
			reason: `Administration for ${state.selectedRegimen.animalName}`,
		});
	}
}

// Helper function to reset the state
function resetRecordState(state: RecordState) {
	state.setStep("select");
	state.setSelectedRegimen(null);
	state.setSelectedAnimalId(null);
	state.setInventorySourceId(null);
	state.setNotes("");
	state.setSite("");
	state.setConditionTags([]);
}

function RecordContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { animals, selectedHousehold } = useApp();
	const { isOnline, enqueue } = useOfflineQueue();
	const state = useRecordState();
	const isMobile = useMediaQuery("(max-width: 768px)");
	const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)");

	const {
		dueRegimens,
		regimensLoading,
		regimensError,
		createAdminMutation,
		updateInventoryMutation,
		inventorySources,
		inventoryLoading,
	} = useRecordData(state, selectedHousehold);

	// Handle URL params for pre-filling
	useURLParams(state, dueRegimens);

	const handleRegimenSelect = (regimen: DueRegimen) => {
		state.setSelectedRegimen(regimen);
		state.setSelectedAnimalId(regimen.animalId);
		state.setRequiresCoSign(regimen.isHighRisk);
		state.setStep("confirm");
	};

	const handleConfirm = async () => {
		if (!state.selectedRegimen || !selectedHousehold) return;

		state.setIsSubmitting(true);

		try {
			if (!isOnline) {
				await handleOfflineAdministration(state, selectedHousehold, enqueue);
			} else {
				await handleOnlineAdministration(
					state,
					selectedHousehold,
					createAdminMutation,
					updateInventoryMutation,
				);
			}
		} catch (error) {
			console.error("Failed to record administration:", error);
			toast.error("Failed to record administration");
		} finally {
			state.setIsSubmitting(false);
		}
	};

	const isSubmitting =
		state.isSubmitting ||
		createAdminMutation.isPending ||
		updateInventoryMutation.isPending;

	// Use mobile layout on mobile devices
	if (isMobile) {
		return (
			<RenderMobileLayout
				state={state}
				animals={animals}
				dueRegimens={dueRegimens}
				regimensLoading={regimensLoading}
				regimensError={regimensError}
				isOnline={isOnline}
				inventorySources={inventorySources || []}
				inventoryLoading={inventoryLoading}
				isSubmitting={isSubmitting}
				handleRegimenSelect={handleRegimenSelect}
				handleConfirm={handleConfirm}
				router={router}
				resetRecordState={resetRecordState}
			/>
		);
	}

	// Use tablet layout on tablet devices
	if (isTablet) {
		return (
			<RenderTabletLayout
				state={state}
				animals={animals}
				dueRegimens={dueRegimens}
				regimensLoading={regimensLoading}
				regimensError={regimensError}
				isOnline={isOnline}
				inventorySources={inventorySources || []}
				inventoryLoading={inventoryLoading}
				isSubmitting={isSubmitting}
				handleRegimenSelect={handleRegimenSelect}
				handleConfirm={handleConfirm}
				router={router}
				resetRecordState={resetRecordState}
			/>
		);
	}

	// Desktop layout (original)
	if (state.step === "success") {
		return <SuccessStep isOnline={isOnline} router={router} />;
	}

	if (state.step === "confirm" && state.selectedRegimen) {
		return (
			<ConfirmStep
				state={state}
				animals={animals}
				inventorySources={inventorySources || []}
				inventoryLoading={inventoryLoading}
				handleConfirm={handleConfirm}
				isSubmitting={isSubmitting}
			/>
		);
	}

	return (
		<SelectionStep
			state={state}
			dueRegimens={dueRegimens}
			regimensLoading={regimensLoading}
			regimensError={regimensError ? new Error(regimensError.message) : null}
			selectedHousehold={selectedHousehold}
			animals={animals}
			isOnline={isOnline}
			searchParams={searchParams}
			router={router}
			handleRegimenSelect={handleRegimenSelect}
		/>
	);
}

function RegimenCard({
	regimen,
	onSelect,
}: {
	regimen: DueRegimen;
	onSelect: (regimen: DueRegimen) => void;
}) {
	const animal = {
		id: regimen.animalId,
		name: regimen.animalName,
		species: regimen.animalSpecies || "Unknown",
		avatar: regimen.animalPhotoUrl ?? undefined,
		pendingMeds: 0,
	};

	const timeDisplay = regimen.targetTime
		? formatTimeLocal(regimen.targetTime, "America/New_York")
		: "As needed";

	return (
		<button
			type="button"
			className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors w-full text-left"
			onClick={() => onSelect(regimen)}
		>
			<div className="flex items-center gap-3">
				<AnimalAvatar animal={animal} size="md" />
				<div>
					<div className="font-medium">
						{regimen.animalName} - {regimen.medicationName} {regimen.strength}
					</div>
					<div className="text-sm text-muted-foreground">
						{regimen.route} • {regimen.form} • {timeDisplay}
						{regimen.dose && ` • ${regimen.dose}`}
					</div>
					<div className="text-xs text-muted-foreground">
						{regimen.compliance}% compliance
						{regimen.isHighRisk && " • High-risk medication"}
					</div>
				</div>
			</div>

			<div className="flex items-center gap-2">
				{regimen.isOverdue && <Badge variant="destructive">Overdue</Badge>}
				{regimen.isPRN && <Badge variant="outline">PRN</Badge>}
				{regimen.isHighRisk && <Badge variant="secondary">High-risk</Badge>}
			</div>
		</button>
	);
}

// Helper functions to reduce complexity
function createAdminPayload(
	state: ReturnType<typeof useRecordState>,
	householdId: string,
) {
	if (!state.selectedRegimen) throw new Error("No regimen selected");

	const now = new Date();
	const localDay = localDayISO(now, "America/New_York"); // TODO: Use animal's timezone
	const idempotencyKey = adminKey(
		state.selectedRegimen.animalId,
		state.selectedRegimen.id,
		localDay,
		state.selectedRegimen.isPRN ? undefined : 0,
	);

	return {
		idempotencyKey,
		householdId,
		animalId: state.selectedRegimen.animalId,
		regimenId: state.selectedRegimen.id,
		administeredAt: now.toISOString(),
		inventorySourceId: state.inventorySourceId || undefined,
		notes: state.notes || undefined,
		site: state.site || undefined,
		conditionTags:
			state.conditionTags.length > 0 ? state.conditionTags : undefined,
		requiresCoSign: state.requiresCoSign,
		allowOverride: state.allowOverride,
		// Optional fields for proper status calculation
		dose: state.selectedRegimen.dose,
		status: state.selectedRegimen.isPRN ? ("PRN" as const) : undefined,
	};
}

function getGroupedRegimens(
	regimens: DueRegimen[],
	selectedAnimalId: string | null,
) {
	const filteredRegimens = selectedAnimalId
		? regimens.filter((r) => r.animalId === selectedAnimalId)
		: regimens;

	return {
		due: filteredRegimens.filter((r) => r.section === "due"),
		later: filteredRegimens.filter((r) => r.section === "later"),
		prn: filteredRegimens.filter((r) => r.section === "prn"),
	};
}

// Success Step Component
function SuccessStep({
	isOnline,
	router,
}: {
	isOnline: boolean;
	router: ReturnType<typeof useRouter>;
}) {
	return (
		<div className="max-w-md mx-auto space-y-6">
			<div className="text-center space-y-4">
				<div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
					<div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
						✓
					</div>
				</div>

				<div>
					<h1 className="text-2xl font-bold text-green-700">
						Recorded Successfully
					</h1>
					<p className="text-muted-foreground">
						Recorded at {formatTimeLocal(new Date(), "America/New_York")} by You
						{!isOnline && " (will sync when online)"}
					</p>
				</div>
			</div>

			<div className="space-y-3">
				<Button
					variant="outline"
					className="w-full bg-transparent"
					onClick={() => {
						// TODO: Open reminder adjustment sheet
						console.log("Adjust reminder");
					}}
				>
					Adjust Reminder
				</Button>

				<Button className="w-full" onClick={() => router.push("/")}>
					Back to Home
				</Button>
			</div>
		</div>
	);
}

// Confirm Step Component
function ConfirmStep({
	state,
	animals,
	inventorySources,
	inventoryLoading,
	handleConfirm,
	isSubmitting,
}: {
	state: ReturnType<typeof useRecordState>;
	animals: Array<{
		id: string;
		name: string;
		species: string;
		pendingMeds: number;
		avatar?: string;
	}>;
	inventorySources: InventorySource[];
	inventoryLoading?: boolean;
	handleConfirm: () => Promise<void>;
	isSubmitting?: boolean;
}) {
	const animal = animals.find((a) => a.id === state.selectedAnimalId);
	const relevantSources = inventorySources.filter((s) =>
		s.name
			.toLowerCase()
			.includes(state.selectedRegimen?.medicationName.toLowerCase() || ""),
	);

	const isDisabled =
		isSubmitting ||
		(relevantSources.some(
			(s) => s.id === state.inventorySourceId && (s.isExpired || s.isWrongMed),
		) &&
			!state.allowOverride);

	return (
		<div className="max-w-2xl mx-auto space-y-6">
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => state.setStep("select")}
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<h1 className="text-2xl font-bold">Confirm Administration</h1>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-3">
						{animal && <AnimalAvatar animal={animal} size="md" />}
						<div>
							<div>
								{animal?.name} - {state.selectedRegimen?.medicationName}
							</div>
							<div className="text-sm font-normal text-muted-foreground">
								{state.selectedRegimen?.strength} •{" "}
								{state.selectedRegimen?.route} • {state.selectedRegimen?.form}
							</div>
						</div>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div>
						<Label>Inventory Source</Label>
						{inventoryLoading ? (
							<Skeleton className="h-10 w-full" />
						) : (
							<InventorySourceSelect
								sources={relevantSources}
								selectedId={state.inventorySourceId ?? undefined}
								onSelect={state.setInventorySourceId}
								allowOverride={true}
								onOverrideChange={state.setAllowOverride}
							/>
						)}
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="site">Site/Side (Optional)</Label>
							<Input
								id="site"
								placeholder="Left ear, right leg..."
								value={state.site}
								onChange={(e) => state.setSite(e.target.value)}
							/>
						</div>
						<div>
							<Label>Photo/Video</Label>
							<Button variant="outline" className="w-full bg-transparent">
								<Camera className="mr-2 h-4 w-4" />
								Add Media
							</Button>
						</div>
					</div>

					<div>
						<Label htmlFor="notes">Notes (Optional)</Label>
						<Textarea
							id="notes"
							placeholder="Any observations or notes..."
							value={state.notes}
							onChange={(e) => state.setNotes(e.target.value)}
						/>
					</div>

					<ConditionTagSelector
						conditionTags={state.conditionTags}
						setConditionTags={state.setConditionTags}
					/>

					{state.selectedRegimen?.isHighRisk && (
						<div className="flex items-center space-x-2 p-4 bg-orange-50 rounded-lg border border-orange-200">
							<Checkbox
								id="cosign"
								checked={state.requiresCoSign}
								onCheckedChange={(checked) =>
									state.setRequiresCoSign(checked === true)
								}
							/>
							<Label htmlFor="cosign" className="text-sm">
								Requires co-sign (high-risk medication)
							</Label>
						</div>
					)}

					<Separator />

					<MedConfirmButton
						onConfirm={handleConfirm}
						disabled={isDisabled}
						requiresCoSign={state.requiresCoSign}
						className="w-full"
					>
						{isSubmitting ? "Recording..." : "Hold to Confirm (3s)"}
					</MedConfirmButton>
				</CardContent>
			</Card>
		</div>
	);
}

// Condition Tag Selector Component
function ConditionTagSelector({
	conditionTags,
	setConditionTags,
}: {
	conditionTags: string[];
	setConditionTags: React.Dispatch<React.SetStateAction<string[]>>;
}) {
	const tags = ["Normal", "Improved", "No Change", "Worse", "Side Effects"];

	return (
		<div>
			<Label>Condition Tags</Label>
			<div className="flex flex-wrap gap-2 mt-2">
				{tags.map((tag) => (
					<Button
						key={tag}
						variant={conditionTags.includes(tag) ? "default" : "outline"}
						size="sm"
						onClick={() => {
							setConditionTags((prev) =>
								prev.includes(tag)
									? prev.filter((t) => t !== tag)
									: [...prev, tag],
							);
						}}
					>
						<Tag className="mr-1 h-3 w-3" />
						{tag}
					</Button>
				))}
			</div>
		</div>
	);
}

// Helper component for mobile layout rendering
function RenderMobileLayout({
	state,
	animals,
	dueRegimens,
	regimensLoading,
	regimensError,
	isOnline,
	inventorySources,
	inventoryLoading,
	isSubmitting,
	handleRegimenSelect,
	handleConfirm,
	router,
	resetRecordState,
}: {
	state: ReturnType<typeof useRecordState>;
	animals: Array<{
		id: string;
		name: string;
		species: string;
		pendingMeds: number;
		avatar?: string;
	}>;
	dueRegimens?: DueRegimen[];
	regimensLoading: boolean;
	regimensError: Error | null;
	isOnline: boolean;
	inventorySources: InventorySource[];
	inventoryLoading: boolean;
	isSubmitting: boolean;
	handleRegimenSelect: (regimen: DueRegimen) => void;
	handleConfirm: () => Promise<void>;
	router: ReturnType<typeof useRouter>;
	resetRecordState: (state: RecordState) => void;
}) {
	return (
		<MobileRecordLayout
			step={state.step}
			selectedRegimen={state.selectedRegimen}
			dueRegimens={dueRegimens}
			regimensLoading={regimensLoading}
			regimensError={regimensError ? new Error(regimensError.message) : null}
			isOnline={isOnline}
			onRegimenSelect={handleRegimenSelect}
			onBack={() => {
				if (state.step === "confirm") {
					state.setStep("select");
				}
			}}
			onCancel={() => router.push("/")}
		>
			{state.step === "success" && (
				<MobileSuccessLayout
					isOnline={isOnline}
					onReturnHome={() => router.push("/")}
					onRecordAnother={() => resetRecordState(state)}
					recordedAt={new Date()}
					animalName={state.selectedRegimen?.animalName}
					medicationName={state.selectedRegimen?.medicationName}
				/>
			)}
			{state.step === "confirm" && state.selectedRegimen && (
				<MobileConfirmLayout
					selectedRegimen={state.selectedRegimen}
					animals={animals}
					inventorySources={inventorySources}
					inventoryLoading={inventoryLoading}
					isSubmitting={isSubmitting}
					inventorySourceId={state.inventorySourceId}
					allowOverride={state.allowOverride}
					requiresCoSign={state.requiresCoSign}
					notes={state.notes}
					site={state.site}
					conditionTags={state.conditionTags}
					setInventorySourceId={state.setInventorySourceId}
					setAllowOverride={state.setAllowOverride}
					setRequiresCoSign={state.setRequiresCoSign}
					setNotes={state.setNotes}
					setSite={state.setSite}
					setConditionTags={state.setConditionTags}
					onConfirm={handleConfirm}
				/>
			)}
		</MobileRecordLayout>
	);
}

// Helper component for tablet layout rendering
function RenderTabletLayout({
	state,
	animals,
	dueRegimens,
	regimensLoading,
	regimensError,
	isOnline,
	inventorySources,
	inventoryLoading,
	isSubmitting,
	handleRegimenSelect,
	handleConfirm,
	router,
	resetRecordState,
}: {
	state: ReturnType<typeof useRecordState>;
	animals: Array<{
		id: string;
		name: string;
		species: string;
		pendingMeds: number;
		avatar?: string;
	}>;
	dueRegimens?: DueRegimen[];
	regimensLoading: boolean;
	regimensError: Error | null;
	isOnline: boolean;
	inventorySources: InventorySource[];
	inventoryLoading: boolean;
	isSubmitting: boolean;
	handleRegimenSelect: (regimen: DueRegimen) => void;
	handleConfirm: () => Promise<void>;
	router: ReturnType<typeof useRouter>;
	resetRecordState: (state: RecordState) => void;
}) {
	return (
		<TabletRecordLayout
			step={state.step}
			selectedRegimen={state.selectedRegimen}
			dueRegimens={dueRegimens}
			regimensLoading={regimensLoading}
			regimensError={regimensError ? new Error(regimensError.message) : null}
			isOnline={isOnline}
			onRegimenSelect={handleRegimenSelect}
			onBack={() => {
				if (state.step === "confirm") {
					state.setStep("select");
				}
			}}
			onCancel={() => router.push("/")}
		>
			{state.step === "success" && (
				<TabletSuccessLayout
					isOnline={isOnline}
					onReturnHome={() => router.push("/")}
					onRecordAnother={() => resetRecordState(state)}
					recordedAt={new Date()}
					animalName={state.selectedRegimen?.animalName}
					medicationName={state.selectedRegimen?.medicationName}
				/>
			)}
			{state.step === "confirm" && state.selectedRegimen && (
				<TabletConfirmLayout
					selectedRegimen={state.selectedRegimen}
					animals={animals}
					inventorySources={inventorySources}
					inventoryLoading={inventoryLoading}
					isSubmitting={isSubmitting}
					inventorySourceId={state.inventorySourceId}
					allowOverride={state.allowOverride}
					requiresCoSign={state.requiresCoSign}
					notes={state.notes}
					site={state.site}
					conditionTags={state.conditionTags}
					setInventorySourceId={state.setInventorySourceId}
					setAllowOverride={state.setAllowOverride}
					setRequiresCoSign={state.setRequiresCoSign}
					setNotes={state.setNotes}
					setSite={state.setSite}
					setConditionTags={state.setConditionTags}
					onConfirm={handleConfirm}
				/>
			)}
		</TabletRecordLayout>
	);
}

export default function RecordPage() {
	return (
		<RecordAdminErrorBoundary>
			<Suspense
				fallback={<div className="min-h-screen bg-background animate-pulse" />}
			>
				<RecordContent />
			</Suspense>
		</RecordAdminErrorBoundary>
	);
}
