"use client";

import { ArrowLeft, Camera, Tag } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/providers/app-provider";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { adminKey } from "@/utils/idempotency";
import { formatTimeLocal, localDayISO } from "@/utils/tz";

type RecordStep = "select" | "confirm" | "success";

interface DueRegimen {
	id: string;
	animalId: string;
	animalName: string;
	medicationName: string;
	route: string;
	form: string;
	strength: string;
	targetTime?: Date;
	isPRN: boolean;
	isHighRisk: boolean;
	compliance: number;
	section: "due" | "later" | "prn";
}

interface InventorySource {
	id: string;
	name: string;
	lot: string;
	expiresOn: Date;
	unitsRemaining: number;
	isExpired: boolean;
	isWrongMed: boolean;
	inUse: boolean;
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

function RecordContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { animals } = useApp();
	const { isOnline, enqueue } = useOfflineQueue();
	const state = useRecordState();

	// Mock data - replace with tRPC queries
	const dueRegimens = useMemo<DueRegimen[]>(
		() => [
			{
				id: "1",
				animalId: "1",
				animalName: "Buddy",
				medicationName: "Rimadyl",
				route: "Oral",
				form: "Tablet",
				strength: "75mg",
				targetTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
				isPRN: false,
				isHighRisk: false,
				compliance: 85,
				section: "due",
			},
			{
				id: "2",
				animalId: "2",
				animalName: "Whiskers",
				medicationName: "Insulin",
				route: "Subcutaneous",
				form: "Injection",
				strength: "2 units",
				targetTime: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago (overdue)
				isPRN: false,
				isHighRisk: true,
				compliance: 92,
				section: "due",
			},
			{
				id: "3",
				animalId: "3",
				animalName: "Charlie",
				medicationName: "Pain Relief",
				route: "Oral",
				form: "Liquid",
				strength: "5ml",
				isPRN: true,
				isHighRisk: false,
				compliance: 78,
				section: "prn",
			},
		],
		[],
	);

	const inventorySources: InventorySource[] = [
		{
			id: "1",
			name: "Rimadyl 75mg",
			lot: "ABC123",
			expiresOn: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
			unitsRemaining: 45,
			isExpired: false,
			isWrongMed: false,
			inUse: true,
		},
		{
			id: "2",
			name: "Insulin Pen",
			lot: "INS456",
			expiresOn: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Expired
			unitsRemaining: 12,
			isExpired: true,
			isWrongMed: false,
			inUse: true,
		},
	];

	// Handle URL params for pre-filling
	useEffect(() => {
		const animalId = searchParams.get("animalId");
		const regimenId = searchParams.get("regimenId");

		if (animalId) {
			state.setSelectedAnimalId(animalId);
		}

		if (regimenId) {
			const regimen = dueRegimens.find((r) => r.id === regimenId);
			if (regimen) {
				state.setSelectedRegimen(regimen);
				state.setSelectedAnimalId(regimen.animalId);
				state.setStep("confirm");
			}
		}
	}, [searchParams, dueRegimens, state]);

	const handleRegimenSelect = (regimen: DueRegimen) => {
		state.setSelectedRegimen(regimen);
		state.setSelectedAnimalId(regimen.animalId);
		state.setRequiresCoSign(regimen.isHighRisk);
		state.setStep("confirm");
	};

	const handleConfirm = async () => {
		if (!state.selectedRegimen) return;

		state.setIsSubmitting(true);

		try {
			const payload = createAdminPayload(state);

			if (!isOnline) {
				await enqueue(payload, payload.idempotencyKey);
			} else {
				// In real app: await createAdmin.mutateAsync(payload)
				console.log("Recording administration:", payload);
				await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
			}

			state.setStep("success");
		} catch (error) {
			console.error("Failed to record administration:", error);
		} finally {
			state.setIsSubmitting(false);
		}
	};

	const groupedRegimens = getGroupedRegimens(
		dueRegimens,
		state.selectedAnimalId,
	);

	if (state.step === "success") {
		return <SuccessStep isOnline={isOnline} router={router} />;
	}

	if (state.step === "confirm" && state.selectedRegimen) {
		return (
			<ConfirmStep
				state={state}
				animals={animals}
				inventorySources={inventorySources}
				handleConfirm={handleConfirm}
			/>
		);
	}

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

			<div className="space-y-6">
				{groupedRegimens.due.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								Due Now
								<Badge variant="destructive">
									{groupedRegimens.due.length}
								</Badge>
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
								<Badge variant="secondary">
									{groupedRegimens.later.length}
								</Badge>
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
			</div>
		</div>
	);
}

function RegimenCard({
	regimen,
	onSelect,
}: {
	regimen: DueRegimen;
	onSelect: (regimen: DueRegimen) => void;
}) {
	const { animals } = useApp();
	const animal = animals.find((a) => a.id === regimen.animalId);

	const isOverdue = regimen.targetTime && regimen.targetTime < new Date();
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
				{animal && <AnimalAvatar animal={animal} size="md" />}
				<div>
					<div className="font-medium">
						{regimen.animalName} - {regimen.medicationName} {regimen.strength}
					</div>
					<div className="text-sm text-muted-foreground">
						{regimen.route} • {regimen.form} • {timeDisplay}
					</div>
					<div className="text-xs text-muted-foreground">
						{regimen.compliance}% compliance
						{regimen.isHighRisk && " • High-risk medication"}
					</div>
				</div>
			</div>

			<div className="flex items-center gap-2">
				{isOverdue && <Badge variant="destructive">Overdue</Badge>}
				{regimen.isPRN && <Badge variant="outline">PRN</Badge>}
				{regimen.isHighRisk && <Badge variant="secondary">High-risk</Badge>}
			</div>
		</button>
	);
}

// Helper functions to reduce complexity
function createAdminPayload(state: ReturnType<typeof useRecordState>) {
	if (!state.selectedRegimen) throw new Error("No regimen selected");

	const now = new Date();
	const localDay = localDayISO(now, "America/New_York"); // Use animal's timezone
	const idempotencyKey = adminKey(
		state.selectedRegimen.animalId,
		state.selectedRegimen.id,
		localDay,
		state.selectedRegimen.isPRN ? undefined : 0,
	);

	return {
		idempotencyKey,
		animalId: state.selectedRegimen.animalId,
		regimenId: state.selectedRegimen.id,
		medicationName: state.selectedRegimen.medicationName,
		administeredAt: now.toISOString(),
		inventorySourceId: state.inventorySourceId,
		notes: state.notes,
		site: state.site,
		conditionTags: state.conditionTags,
		requiresCoSign: state.requiresCoSign,
		allowOverride: state.allowOverride,
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
	handleConfirm,
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
	handleConfirm: () => Promise<void>;
}) {
	const animal = animals.find((a) => a.id === state.selectedAnimalId);
	const relevantSources = inventorySources.filter((s) =>
		s.name
			.toLowerCase()
			.includes(state.selectedRegimen?.medicationName.toLowerCase() || ""),
	);

	const isDisabled =
		state.isSubmitting ||
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
						<InventorySourceSelect
							sources={relevantSources}
							selectedId={state.inventorySourceId ?? undefined}
							onSelect={state.setInventorySourceId}
							allowOverride={true}
							onOverrideChange={state.setAllowOverride}
						/>
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
						{state.isSubmitting ? "Recording..." : "Hold to Confirm (3s)"}
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

export default function RecordPage() {
	return (
		<Suspense fallback={<div className="min-h-screen bg-background animate-pulse" />}>
			<RecordContent />
		</Suspense>
	);
}
