"use client";

import { Camera, Tag } from "lucide-react";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InventorySourceSelect } from "@/components/ui/inventory-source-select";
import { Label } from "@/components/ui/label";
import { MedConfirmButton } from "@/components/ui/med-confirm-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { InventorySource } from "@/types/inventory";

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
	section: "due" | "later" | "prn";
	isOverdue?: boolean;
	minutesUntilDue?: number;
	instructions?: string | null;
	prnReason?: string | null;
}

interface TabletConfirmLayoutProps {
	selectedRegimen: DueRegimen;
	animals: Array<{
		id: string;
		name: string;
		species: string;
		pendingMeds: number;
		avatar?: string;
	}>;
	inventorySources: InventorySource[];
	inventoryLoading?: boolean;
	isSubmitting?: boolean;
	// Form state
	inventorySourceId: string | null;
	allowOverride: boolean;
	requiresCoSign: boolean;
	notes: string;
	site: string;
	conditionTags: string[];
	// Form handlers
	setInventorySourceId: (id: string | null) => void;
	setAllowOverride: (allow: boolean) => void;
	setRequiresCoSign: (requires: boolean) => void;
	setNotes: (notes: string) => void;
	setSite: (site: string) => void;
	setConditionTags: React.Dispatch<React.SetStateAction<string[]>>;
	// Actions
	onConfirm: () => Promise<void>;
}

export function TabletConfirmLayout({
	selectedRegimen,
	animals,
	inventorySources,
	inventoryLoading,
	isSubmitting,
	inventorySourceId,
	allowOverride,
	requiresCoSign,
	notes,
	site,
	conditionTags,
	setInventorySourceId,
	setAllowOverride,
	setRequiresCoSign,
	setNotes,
	setSite,
	setConditionTags,
	onConfirm,
}: TabletConfirmLayoutProps) {
	const animal = animals.find((a) => a.id === selectedRegimen.animalId);
	const relevantSources = inventorySources.filter((s) =>
		s.name
			.toLowerCase()
			.includes(selectedRegimen.medicationName.toLowerCase() || ""),
	);

	const isDisabled =
		isSubmitting ||
		(relevantSources.some(
			(s) => s.id === inventorySourceId && (s.isExpired || s.isWrongMed),
		) &&
			!allowOverride);

	return (
		<div className="flex h-full">
			{/* Left column - Form */}
			<div className="flex-1 overflow-hidden">
				<ScrollArea className="h-full">
					<div className="p-6 max-w-2xl">
						<div className="space-y-8">
							{/* Medication Summary - Compact for tablet */}
							<Card>
								<CardHeader className="pb-4">
									<CardTitle className="flex items-center gap-3 text-xl">
										{animal && <AnimalAvatar animal={animal} size="md" />}
										<div className="min-w-0 flex-1">
											<div className="font-semibold text-xl truncate">
												{animal?.name} - {selectedRegimen.medicationName}
											</div>
											<div className="text-base font-normal text-muted-foreground">
												{selectedRegimen.strength} • {selectedRegimen.route} •{" "}
												{selectedRegimen.form}
											</div>
										</div>
										{selectedRegimen.isHighRisk && (
											<Badge variant="destructive" className="shrink-0">
												High Risk
											</Badge>
										)}
									</CardTitle>
								</CardHeader>
							</Card>

							{/* Two-column form layout */}
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
								{/* Left form column */}
								<div className="space-y-6">
									{/* Inventory Source */}
									<div>
										<Label className="text-base font-medium">
											Inventory Source
										</Label>
										<div className="mt-3">
											{inventoryLoading ? (
												<Skeleton className="h-12 w-full" />
											) : (
												<InventorySourceSelect
													sources={relevantSources}
													selectedId={inventorySourceId ?? undefined}
													onSelect={setInventorySourceId}
													allowOverride={true}
													onOverrideChange={setAllowOverride}
												/>
											)}
										</div>
									</div>

									{/* Site and Media */}
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<div>
											<Label
												htmlFor="tablet-site"
												className="text-base font-medium"
											>
												Site/Side (Optional)
											</Label>
											<Input
												id="tablet-site"
												placeholder="Left ear, right leg..."
												value={site}
												onChange={(e) => setSite(e.target.value)}
												className="mt-2 h-11"
											/>
										</div>
										<div>
											<Label className="text-base font-medium">
												Photo/Video
											</Label>
											<Button
												variant="outline"
												className="w-full mt-2 h-11 bg-transparent"
												type="button"
											>
												<Camera className="mr-2 h-4 w-4" />
												Add Media
											</Button>
										</div>
									</div>

									{/* Notes */}
									<div>
										<Label
											htmlFor="tablet-notes"
											className="text-base font-medium"
										>
											Notes (Optional)
										</Label>
										<Textarea
											id="tablet-notes"
											placeholder="Any observations or notes..."
											value={notes}
											onChange={(e) => setNotes(e.target.value)}
											className="mt-2 min-h-[100px]"
										/>
									</div>
								</div>

								{/* Right form column */}
								<div className="space-y-6">
									{/* Condition Tags */}
									<TabletConditionTagSelector
										conditionTags={conditionTags}
										setConditionTags={setConditionTags}
									/>

									{/* Co-sign Requirement */}
									{selectedRegimen.isHighRisk && (
										<Card className="border-orange-200 bg-orange-50">
											<CardContent className="p-4">
												<div className="space-y-3">
													<div className="flex items-start space-x-3">
														<Checkbox
															id="tablet-cosign"
															checked={requiresCoSign}
															onCheckedChange={(checked) =>
																setRequiresCoSign(checked === true)
															}
															className="mt-0.5"
														/>
														<div className="space-y-1">
															<Label
																htmlFor="tablet-cosign"
																className="text-sm font-medium"
															>
																Requires co-sign (high-risk medication)
															</Label>
															<p className="text-xs text-muted-foreground">
																Another caregiver must co-sign this
																administration within 10 minutes.
															</p>
														</div>
													</div>
													{requiresCoSign && (
														<div className="text-xs text-orange-700 bg-orange-100 p-3 rounded-md">
															Co-sign will be required after confirmation. Make
															sure another authorized caregiver is available.
														</div>
													)}
												</div>
											</CardContent>
										</Card>
									)}

									{/* Instructions Preview */}
									{selectedRegimen.instructions && (
										<Card className="bg-muted/30">
											<CardContent className="p-4">
												<h4 className="font-medium text-sm mb-2">
													Instructions
												</h4>
												<p className="text-sm text-muted-foreground">
													{selectedRegimen.instructions}
												</p>
											</CardContent>
										</Card>
									)}
								</div>
							</div>
						</div>
					</div>
				</ScrollArea>
			</div>

			{/* Right column - Action panel */}
			<div className="w-80 shrink-0 border-l bg-muted/30">
				<div className="p-6 h-full flex flex-col">
					<div className="mb-6">
						<h3 className="font-semibold text-lg mb-2">Ready to Record?</h3>
						<p className="text-sm text-muted-foreground">
							Review your selections and hold the button below to confirm the
							administration.
						</p>
					</div>

					<div className="flex-1" />

					<MedConfirmButton
						onConfirm={onConfirm}
						disabled={isDisabled}
						requiresCoSign={requiresCoSign}
						className="w-full h-14 text-base"
					>
						{isSubmitting ? "Recording..." : "Hold to Confirm (3s)"}
					</MedConfirmButton>
				</div>
			</div>
		</div>
	);
}

function TabletConditionTagSelector({
	conditionTags,
	setConditionTags,
}: {
	conditionTags: string[];
	setConditionTags: React.Dispatch<React.SetStateAction<string[]>>;
}) {
	const tags = ["Normal", "Improved", "No Change", "Worse", "Side Effects"];

	return (
		<div>
			<Label className="text-base font-medium">Condition Tags</Label>
			<div className="grid grid-cols-2 gap-2 mt-3">
				{tags.map((tag) => (
					<Button
						key={tag}
						variant={conditionTags.includes(tag) ? "default" : "outline"}
						size="sm"
						className="h-10 px-3 justify-start"
						onClick={() => {
							setConditionTags((prev) =>
								prev.includes(tag)
									? prev.filter((t) => t !== tag)
									: [...prev, tag],
							);
						}}
						type="button"
					>
						<Tag className="mr-2 h-3 w-3" />
						{tag}
					</Button>
				))}
			</div>
		</div>
	);
}
