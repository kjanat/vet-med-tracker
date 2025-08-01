"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { type AnimalFormData, animalFormSchema } from "@/lib/schemas/animal";
import type { Animal } from "@/lib/types";

interface AnimalFormProps {
	animal: Animal | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (data: Partial<Animal>) => Promise<void>;
}

const timezones = [
	{ value: "America/New_York", label: "Eastern Time" },
	{ value: "America/Chicago", label: "Central Time" },
	{ value: "America/Denver", label: "Mountain Time" },
	{ value: "America/Los_Angeles", label: "Pacific Time" },
	{ value: "America/Phoenix", label: "Arizona Time" },
	{ value: "America/Anchorage", label: "Alaska Time" },
	{ value: "Pacific/Honolulu", label: "Hawaii Time" },
];

export function AnimalForm({
	animal,
	open,
	onOpenChange,
	onSave,
}: AnimalFormProps) {
	const [newAllergy, setNewAllergy] = useState("");
	const [newCondition, setNewCondition] = useState("");

	const form = useForm<AnimalFormData>({
		resolver: zodResolver(animalFormSchema),
		defaultValues: {
			name: "",
			species: "",
			breed: undefined,
			sex: undefined,
			neutered: false,
			dob: undefined,
			weightKg: undefined,
			microchipId: undefined,
			color: undefined,
			timezone: "America/New_York",
			vetName: undefined,
			vetPhone: undefined,
			allergies: [],
			conditions: [],
			photoUrl: undefined,
		},
	});

	useEffect(() => {
		if (animal) {
			form.reset({
				name: animal.name,
				species: animal.species,
				breed: animal.breed || "",
				sex: animal.sex,
				neutered: animal.neutered || false,
				dob: animal.dob,
				weightKg: animal.weightKg,
				microchipId: animal.microchipId || "",
				color: animal.color || "",
				timezone: animal.timezone || "America/New_York",
				vetName: animal.vetName || "",
				vetPhone: animal.vetPhone || "",
				allergies: animal.allergies || [],
				conditions: animal.conditions || [],
			});
		} else {
			form.reset();
		}
	}, [animal, form]);

	const onSubmit = async (data: AnimalFormData) => {
		try {
			await onSave(data);
			form.reset();
			onOpenChange(false);
		} catch (error) {
			console.error("Failed to save animal:", error);
		}
	};

	const addAllergy = () => {
		const currentAllergies = form.getValues("allergies");
		if (newAllergy.trim() && !currentAllergies.includes(newAllergy.trim())) {
			form.setValue("allergies", [...currentAllergies, newAllergy.trim()]);
			setNewAllergy("");
		}
	};

	const removeAllergy = (allergy: string) => {
		const currentAllergies = form.getValues("allergies");
		form.setValue(
			"allergies",
			currentAllergies.filter((a) => a !== allergy),
		);
	};

	const addCondition = () => {
		const currentConditions = form.getValues("conditions");
		if (
			newCondition.trim() &&
			!currentConditions.includes(newCondition.trim())
		) {
			form.setValue("conditions", [...currentConditions, newCondition.trim()]);
			setNewCondition("");
		}
	};

	const removeCondition = (condition: string) => {
		const currentConditions = form.getValues("conditions");
		form.setValue(
			"conditions",
			currentConditions.filter((c) => c !== condition),
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[95vw] sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{animal ? "Edit Animal" : "Add Animal"}</DialogTitle>
					<DialogDescription>
						{animal
							? "Update animal profile and medical information"
							: "Create a new animal profile"}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-6 mt-6"
					>
						{/* Basic Info */}
						<div className="space-y-4">
							<h3 className="text-lg font-medium">Basic Information</h3>

							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Name *</FormLabel>
											<FormControl>
												<Input {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="species"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Species *</FormLabel>
											<Select
												onValueChange={field.onChange}
												value={field.value}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select species" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="Dog">Dog</SelectItem>
													<SelectItem value="Cat">Cat</SelectItem>
													<SelectItem value="Bird">Bird</SelectItem>
													<SelectItem value="Rabbit">Rabbit</SelectItem>
													<SelectItem value="Horse">Horse</SelectItem>
													<SelectItem value="Other">Other</SelectItem>
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="breed"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Breed</FormLabel>
											<FormControl>
												<Input {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="color"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Color</FormLabel>
											<FormControl>
												<Input {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-cols-3 gap-4">
								<FormField
									control={form.control}
									name="sex"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Sex</FormLabel>
											<Select
												onValueChange={field.onChange}
												value={field.value}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select sex" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="Male">Male</SelectItem>
													<SelectItem value="Female">Female</SelectItem>
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="dob"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Date of Birth</FormLabel>
											<FormControl>
												<Input
													type="date"
													value={
														field.value
															? field.value.toISOString().split("T")[0]
															: ""
													}
													onChange={(e) =>
														field.onChange(
															e.target.value
																? new Date(e.target.value)
																: undefined,
														)
													}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="weightKg"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Weight (kg)</FormLabel>
											<FormControl>
												<Input
													type="number"
													step="0.1"
													min="0"
													value={field.value || ""}
													onChange={(e) =>
														field.onChange(
															e.target.value
																? Number.parseFloat(e.target.value)
																: undefined,
														)
													}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="neutered"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center space-x-2 space-y-0">
										<FormControl>
											<Checkbox
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
										<FormLabel className="font-normal">
											Spayed/Neutered
										</FormLabel>
									</FormItem>
								)}
							/>

							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="microchipId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Microchip ID</FormLabel>
											<FormControl>
												<Input {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="timezone"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Timezone *</FormLabel>
											<Select
												onValueChange={field.onChange}
												value={field.value}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{timezones.map((tz) => (
														<SelectItem key={tz.value} value={tz.value}>
															{tz.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>

						{/* Veterinary Info */}
						<div className="space-y-4">
							<h3 className="text-lg font-medium">Veterinary Information</h3>

							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="vetName"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Veterinarian Name</FormLabel>
											<FormControl>
												<Input {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="vetPhone"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Veterinarian Phone</FormLabel>
											<FormControl>
												<Input type="tel" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>

						{/* Medical Info */}
						<div className="space-y-4">
							<h3 className="text-lg font-medium">Medical Information</h3>

							<div className="space-y-3">
								<FormField
									control={form.control}
									name="allergies"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Allergies</FormLabel>
											<div className="flex gap-2 mt-1">
												<Input
													placeholder="Add allergy"
													value={newAllergy}
													onChange={(e) => setNewAllergy(e.target.value)}
													onKeyDown={(e) => {
														if (e.key === "Enter") {
															e.preventDefault();
															addAllergy();
														}
													}}
												/>
												<Button type="button" onClick={addAllergy} size="sm">
													Add
												</Button>
											</div>
											<div className="flex flex-wrap gap-1 mt-2">
												{field.value?.map((allergy) => (
													<Badge
														key={allergy}
														variant="destructive"
														className="gap-1"
													>
														{allergy}
														<button
															type="button"
															onClick={() => removeAllergy(allergy)}
														>
															<X className="h-3 w-3" />
														</button>
													</Badge>
												))}
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="conditions"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Medical Conditions</FormLabel>
											<div className="flex gap-2 mt-1">
												<Input
													placeholder="Add condition"
													value={newCondition}
													onChange={(e) => setNewCondition(e.target.value)}
													onKeyDown={(e) => {
														if (e.key === "Enter") {
															e.preventDefault();
															addCondition();
														}
													}}
												/>
												<Button type="button" onClick={addCondition} size="sm">
													Add
												</Button>
											</div>
											<div className="flex flex-wrap gap-1 mt-2">
												{field.value?.map((condition) => (
													<Badge
														key={condition}
														variant="secondary"
														className="gap-1"
													>
														{condition}
														<button
															type="button"
															onClick={() => removeCondition(condition)}
														>
															<X className="h-3 w-3" />
														</button>
													</Badge>
												))}
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>

						{/* Photo Upload */}
						<div className="space-y-2">
							<div className="text-sm font-medium">Photo</div>
							<div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
								<Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
								<p className="text-sm text-muted-foreground">
									Click to upload or drag and drop
								</p>
								<p className="text-xs text-muted-foreground">
									PNG, JPG up to 5MB
								</p>
							</div>
						</div>

						{/* Actions */}
						<div className="flex justify-end gap-2 pt-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={form.formState.isSubmitting}>
								{form.formState.isSubmitting
									? "Saving..."
									: animal
										? "Update Animal"
										: "Create Animal"}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
