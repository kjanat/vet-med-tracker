"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Camera, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { MedConfirmButton } from "@/components/ui/med-confirm-button";
import { InventorySourceSelect } from "@/components/ui/inventory-source-select";
import { useApp } from "@/components/providers/app-provider";
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

export default function RecordPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { animals } = useApp();
	const { isOnline, enqueue } = useOfflineQueue();

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
			setSelectedAnimalId(animalId);
		}

		if (regimenId) {
			const regimen = dueRegimens.find((r) => r.id === regimenId);
			if (regimen) {
				setSelectedRegimen(regimen);
				setSelectedAnimalId(regimen.animalId);
				setStep("confirm");
			}
		}
	}, [searchParams, dueRegimens]);

	const handleRegimenSelect = (regimen: DueRegimen) => {
		setSelectedRegimen(regimen);
		setSelectedAnimalId(regimen.animalId);
		setRequiresCoSign(regimen.isHighRisk);
		setStep("confirm");
	};

	const handleConfirm = async () => {
		if (!selectedRegimen) return;

		setIsSubmitting(true);

		// const animal = animals.find((a) => a.id === selectedAnimalId)
		const now = new Date();
		const localDay = localDayISO(now, "America/New_York"); // Use animal's timezone
		const idempotencyKey = adminKey(
			selectedRegimen.animalId,
			selectedRegimen.id,
			localDay,
			selectedRegimen.isPRN ? undefined : 0,
		);

		const payload = {
			idempotencyKey,
			animalId: selectedRegimen.animalId,
			regimenId: selectedRegimen.id,
			medicationName: selectedRegimen.medicationName,
			administeredAt: now.toISOString(),
			inventorySourceId,
			notes,
			site,
			conditionTags,
			requiresCoSign,
			allowOverride,
		};

		try {
			if (!isOnline) {
				await enqueue(payload, idempotencyKey);
			} else {
				// In real app: await createAdmin.mutateAsync(payload)
				console.log("Recording administration:", payload);
				await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
			}

			setStep("success");
		} catch (error) {
			console.error("Failed to record administration:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const filteredRegimens = selectedAnimalId
		? dueRegimens.filter((r) => r.animalId === selectedAnimalId)
		: dueRegimens;

	const groupedRegimens = {
		due: filteredRegimens.filter((r) => r.section === "due"),
		later: filteredRegimens.filter((r) => r.section === "later"),
		prn: filteredRegimens.filter((r) => r.section === "prn"),
	};

	if (step === "success") {
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
							Recorded at {formatTimeLocal(new Date(), "America/New_York")} by
							You
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

	if (step === "confirm" && selectedRegimen) {
		const animal = animals.find((a) => a.id === selectedAnimalId);
		const relevantSources = inventorySources.filter((s) =>
			s.name
				.toLowerCase()
				.includes(selectedRegimen.medicationName.toLowerCase()),
		);

		return (
			<div className="max-w-2xl mx-auto space-y-6">
				<div className="flex items-center gap-4">
					<Button variant="ghost" size="icon" onClick={() => setStep("select")}>
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
									{animal?.name} - {selectedRegimen.medicationName}
								</div>
								<div className="text-sm font-normal text-muted-foreground">
									{selectedRegimen.strength} • {selectedRegimen.route} •{" "}
									{selectedRegimen.form}
								</div>
							</div>
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						<div>
							<Label>Inventory Source</Label>
							<InventorySourceSelect
								sources={relevantSources}
								selectedId={inventorySourceId}
								onSelect={setInventorySourceId}
								allowOverride={true}
								onOverrideChange={setAllowOverride}
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="site">Site/Side (Optional)</Label>
								<Input
									id="site"
									placeholder="Left ear, right leg..."
									value={site}
									onChange={(e) => setSite(e.target.value)}
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
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
							/>
						</div>

						<div>
							<Label>Condition Tags</Label>
							<div className="flex flex-wrap gap-2 mt-2">
								{[
									"Normal",
									"Improved",
									"No Change",
									"Worse",
									"Side Effects",
								].map((tag) => (
									<Button
										key={tag}
										variant={
											conditionTags.includes(tag) ? "default" : "outline-solid"
										}
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

						{selectedRegimen.isHighRisk && (
							<div className="flex items-center space-x-2 p-4 bg-orange-50 rounded-lg border border-orange-200">
								<Checkbox
									id="cosign"
									checked={requiresCoSign}
									onCheckedChange={setRequiresCoSign}
								/>
								<Label htmlFor="cosign" className="text-sm">
									Requires co-sign (high-risk medication)
								</Label>
							</div>
						)}

						<Separator />

						<MedConfirmButton
							onConfirm={handleConfirm}
							disabled={
								isSubmitting ||
								(relevantSources.some(
									(s) =>
										s.id === inventorySourceId && (s.isExpired || s.isWrongMed),
								) &&
									!allowOverride)
							}
							requiresCoSign={requiresCoSign}
							className="w-full"
						>
							{isSubmitting ? "Recording..." : "Hold to Confirm (3s)"}
						</MedConfirmButton>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="max-w-4xl mx-auto space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Record Medication</h1>
					<p className="text-muted-foreground">
						{selectedAnimalId
							? `Recording for ${animals.find((a) => a.id === selectedAnimalId)?.name}`
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
		<div
			className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
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
		</div>
	);
}
