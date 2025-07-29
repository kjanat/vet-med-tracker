"use client";

import { format } from "date-fns";
import { Plus, Search, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useApp } from "@/components/providers/app-provider";
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
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Regimen } from "./regimen-list";

interface RegimenFormProps {
	regimen: Regimen | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (data: Partial<Regimen>) => Promise<void>;
}

interface MedicationOption {
	id: string;
	generic: string;
	brand?: string;
	route: string;
	form: string;
	strength?: string;
}

// Mock medication catalog - replace with tRPC
// Helper functions
function getInitialFormData(): Partial<Regimen> {
	return {
		animalId: "",
		medicationId: "",
		medicationName: "",
		route: "",
		form: "",
		strength: "",
		scheduleType: "FIXED",
		timesLocal: [],
		startDate: undefined,
		endDate: undefined,
		cutoffMins: 60,
		highRisk: false,
	};
}

function checkFormValidity(formData: Partial<Regimen>): boolean {
	const hasBasicInfo = !!(formData.animalId && formData.medicationName);
	const hasValidSchedule =
		formData.scheduleType === "PRN" ||
		(formData.scheduleType === "FIXED" &&
			formData.timesLocal &&
			formData.timesLocal.length > 0);

	return !!(hasBasicInfo && hasValidSchedule);
}

const mockMedications: MedicationOption[] = [
	{
		id: "rimadyl-75mg",
		generic: "Carprofen",
		brand: "Rimadyl",
		route: "Oral",
		form: "Tablet",
		strength: "75mg",
	},
	{
		id: "insulin-40iu",
		generic: "Insulin",
		brand: "Vetsulin",
		route: "Subcutaneous",
		form: "Injection",
		strength: "40 IU/ml",
	},
	{
		id: "amoxicillin-250mg",
		generic: "Amoxicillin",
		route: "Oral",
		form: "Capsule",
		strength: "250mg",
	},
	{
		id: "pain-relief-5ml",
		generic: "Tramadol",
		route: "Oral",
		form: "Liquid",
		strength: "5ml",
	},
];

export function RegimenForm({
	regimen,
	open,
	onOpenChange,
	onSave,
}: RegimenFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [medicationSearch, setMedicationSearch] = useState("");
	const [medicationOpen, setMedicationOpen] = useState(false);
	const [newTime, setNewTime] = useState("");
	const [formData, setFormData] = useState<Partial<Regimen>>(
		getInitialFormData(),
	);

	const { animals } = useApp();

	useEffect(() => {
		setFormData(regimen ? { ...regimen } : getInitialFormData());
	}, [regimen]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			await onSave(formData);
		} catch (error) {
			console.error("Failed to save regimen:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleMedicationSelect = (medication: MedicationOption) => {
		setFormData((prev) => ({
			...prev,
			medicationId: medication.id,
			medicationName: medication.brand || medication.generic,
			route: medication.route,
			form: medication.form,
			strength: medication.strength,
		}));
		setMedicationOpen(false);
	};

	const addTime = () => {
		if (newTime && !formData.timesLocal?.includes(newTime)) {
			setFormData((prev) => ({
				...prev,
				timesLocal: [...(prev.timesLocal || []), newTime].sort(),
			}));
			setNewTime("");
		}
	};

	const removeTime = (time: string) => {
		setFormData((prev) => ({
			...prev,
			timesLocal: prev.timesLocal?.filter((t) => t !== time) || [],
		}));
	};

	const filteredMedications = mockMedications.filter(
		(med) =>
			med.generic.toLowerCase().includes(medicationSearch.toLowerCase()) ||
			med.brand?.toLowerCase().includes(medicationSearch.toLowerCase()),
	);

	const handleCreateCustomMedication = () => {
		const customName = medicationSearch.trim();
		if (customName) {
			setFormData((prev) => ({
				...prev,
				medicationId: `custom-${Date.now()}`,
				medicationName: customName,
				route: "",
				form: "",
				strength: "",
			}));
			setMedicationOpen(false);
		}
	};

	const isFormValid = checkFormValidity(formData);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[95vw] sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{regimen ? "Edit Regimen" : "Add Regimen"}</DialogTitle>
					<DialogDescription>
						{regimen
							? "Update medication schedule and dosing"
							: "Create a new medication regimen"}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-6 mt-6">
					{/* Animal Selection */}
					<AnimalSelector
						animals={animals}
						value={formData.animalId}
						onChange={(value) =>
							setFormData((prev) => ({ ...prev, animalId: value }))
						}
					/>

					{/* Medication Selection */}
					<div className="space-y-2">
						<Label>Medication *</Label>
						<Popover open={medicationOpen} onOpenChange={setMedicationOpen}>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									className="w-full justify-between bg-transparent"
								>
									{formData.medicationName || "Select medication"}
									<Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-full p-0">
								<Command>
									<CommandInput
										placeholder="Search medications..."
										value={medicationSearch}
										onValueChange={setMedicationSearch}
									/>
									<CommandList>
										<CommandEmpty>
											<MedicationEmpty
												medicationSearch={medicationSearch}
												onCreateCustom={handleCreateCustomMedication}
											/>
										</CommandEmpty>
										<CommandGroup>
											{filteredMedications.map((medication) => (
												<MedicationItem
													key={medication.id}
													medication={medication}
													onSelect={handleMedicationSelect}
												/>
											))}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>

						{formData.medicationName && (
							<div className="text-sm text-muted-foreground">
								{formData.strength} • {formData.route} • {formData.form}
							</div>
						)}
					</div>

					{/* Schedule Type */}
					<ScheduleTypeSelector
						value={formData.scheduleType}
						onChange={(value) =>
							setFormData((prev) => ({ ...prev, scheduleType: value }))
						}
					/>

					{/* Fixed Schedule Times */}
					{formData.scheduleType === "FIXED" && (
						<FixedScheduleTimes
							timesLocal={formData.timesLocal}
							newTime={newTime}
							setNewTime={setNewTime}
							addTime={addTime}
							removeTime={removeTime}
						/>
					)}

					{/* Course Dates */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="startDate">Start Date</Label>
							<Input
								id="startDate"
								type="date"
								value={
									formData.startDate
										? formData.startDate.toISOString().split("T")[0]
										: ""
								}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										startDate: e.target.value
											? new Date(e.target.value)
											: undefined,
									}))
								}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="endDate">End Date</Label>
							<Input
								id="endDate"
								type="date"
								value={
									formData.endDate
										? formData.endDate.toISOString().split("T")[0]
										: ""
								}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										endDate: e.target.value
											? new Date(e.target.value)
											: undefined,
									}))
								}
							/>
						</div>
					</div>

					{/* Settings */}
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="cutoff">Cutoff Minutes</Label>
							<Select
								value={formData.cutoffMins?.toString()}
								onValueChange={(value) =>
									setFormData((prev) => ({
										...prev,
										cutoffMins: Number.parseInt(value),
									}))
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="30">30 minutes</SelectItem>
									<SelectItem value="60">1 hour</SelectItem>
									<SelectItem value="120">2 hours</SelectItem>
									<SelectItem value="240">4 hours</SelectItem>
									<SelectItem value="480">8 hours</SelectItem>
									<SelectItem value="720">12 hours</SelectItem>
								</SelectContent>
							</Select>
							<p className="text-xs text-muted-foreground">
								Time after scheduled dose when it&apos;s marked as
								&quot;missed&quot;
							</p>
						</div>

						<div className="flex items-center space-x-2">
							<Checkbox
								id="highRisk"
								checked={formData.highRisk}
								onCheckedChange={(checked) =>
									setFormData((prev) => ({
										...prev,
										highRisk: checked as boolean,
									}))
								}
							/>
							<Label htmlFor="highRisk" className="text-sm">
								High-risk medication (requires co-signature)
							</Label>
						</div>
					</div>

					{/* Preview */}
					{formData.scheduleType === "FIXED" && formData.timesLocal?.length ? (
						<SchedulePreview timesLocal={formData.timesLocal} />
					) : null}

					{/* Actions */}
					<div className="flex justify-end gap-2 pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting || !isFormValid}>
							{isSubmitting
								? "Saving..."
								: regimen
									? "Update Regimen"
									: "Create Regimen"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// Helper components
function MedicationEmpty({
	medicationSearch,
	onCreateCustom,
}: {
	medicationSearch: string;
	onCreateCustom: () => void;
}) {
	return (
		<div className="p-4 text-center">
			<p className="text-sm text-muted-foreground mb-2">No medication found</p>
			<Button size="sm" onClick={onCreateCustom}>
				Create &quot;{medicationSearch}&quot;
			</Button>
		</div>
	);
}

function MedicationItem({
	medication,
	onSelect,
}: {
	medication: MedicationOption;
	onSelect: (medication: MedicationOption) => void;
}) {
	return (
		<CommandItem onSelect={() => onSelect(medication)}>
			<div>
				<div className="font-medium">
					{medication.brand || medication.generic}
					{medication.brand && medication.brand !== medication.generic && (
						<span className="text-muted-foreground font-normal">
							{" "}
							({medication.generic})
						</span>
					)}
				</div>
				<div className="text-sm text-muted-foreground">
					{medication.strength} • {medication.route} • {medication.form}
				</div>
			</div>
		</CommandItem>
	);
}

function SchedulePreview({ timesLocal }: { timesLocal: string[] }) {
	return (
		<Card className="mt-4">
			<CardHeader className="pb-3">
				<CardTitle className="text-sm">Today&apos;s Schedule Preview</CardTitle>
				<CardDescription>Times shown in animal&apos;s timezone</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex flex-wrap gap-2">
					{timesLocal.map((time) => (
						<Badge key={time} variant="outline">
							{format(new Date(`2000-01-01T${time}`), "h:mm a")}
						</Badge>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

// Animal Selector Component
function AnimalSelector({
	animals,
	value,
	onChange,
}: {
	animals: Array<{ id: string; name: string; species: string }>;
	value: string | undefined;
	onChange: (value: string) => void;
}) {
	return (
		<div className="space-y-2">
			<Label htmlFor="animal">Animal *</Label>
			<Select value={value || ""} onValueChange={onChange}>
				<SelectTrigger>
					<SelectValue placeholder="Select animal" />
				</SelectTrigger>
				<SelectContent>
					{animals.map((animal) => (
						<SelectItem key={animal.id} value={animal.id}>
							{animal.name} ({animal.species})
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

// Schedule Type Selector Component
function ScheduleTypeSelector({
	value,
	onChange,
}: {
	value: "FIXED" | "PRN" | undefined;
	onChange: (value: "FIXED" | "PRN") => void;
}) {
	return (
		<div className="space-y-3">
			<Label>Schedule Type *</Label>
			<div className="grid grid-cols-2 gap-4">
				<Card
					className={`cursor-pointer transition-colors ${
						value === "FIXED" ? "ring-2 ring-primary" : "hover:bg-accent"
					}`}
					onClick={() => onChange("FIXED")}
				>
					<CardContent className="p-4">
						<div className="font-medium">Fixed Schedule</div>
						<div className="text-sm text-muted-foreground">
							Regular times each day
						</div>
					</CardContent>
				</Card>

				<Card
					className={`cursor-pointer transition-colors ${
						value === "PRN" ? "ring-2 ring-primary" : "hover:bg-accent"
					}`}
					onClick={() => onChange("PRN")}
				>
					<CardContent className="p-4">
						<div className="font-medium">PRN (As Needed)</div>
						<div className="text-sm text-muted-foreground">
							Given when required
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

// Fixed Schedule Times Component
function FixedScheduleTimes({
	timesLocal,
	newTime,
	setNewTime,
	addTime,
	removeTime,
}: {
	timesLocal?: string[];
	newTime: string;
	setNewTime: (time: string) => void;
	addTime: () => void;
	removeTime: (time: string) => void;
}) {
	return (
		<div className="space-y-3">
			<Label>Daily Times *</Label>
			<div className="flex gap-2">
				<Input
					type="time"
					value={newTime}
					onChange={(e) => setNewTime(e.target.value)}
					placeholder="Add time"
				/>
				<Button type="button" onClick={addTime} size="sm">
					<Plus className="h-4 w-4" />
				</Button>
			</div>

			<div className="flex flex-wrap gap-2">
				{timesLocal?.map((time) => (
					<Badge key={time} variant="secondary" className="gap-1">
						{format(new Date(`2000-01-01T${time}`), "h:mm a")}
						<button type="button" onClick={() => removeTime(time)}>
							<X className="h-3 w-3" />
						</button>
					</Badge>
				))}
			</div>

			{timesLocal?.length === 0 && (
				<p className="text-sm text-muted-foreground">
					Add at least one daily time
				</p>
			)}
		</div>
	);
}
