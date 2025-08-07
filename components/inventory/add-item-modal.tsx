"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Camera, Scan } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { MedicationSearch } from "@/components/medication/medication-search";
import { useApp } from "@/components/providers/app-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DateInput } from "@/components/ui/date-input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBarcodeScanner } from "@/hooks/inventory/useBarcodeScanner";
import {
	type InventoryFormData,
	inventoryFormSchema,
} from "@/lib/schemas/inventory";

// import { useOfflineQueue } from "@/hooks/offline/useOfflineQueue"

interface AddItemModalProps {
	onAdd: (data: InventoryFormData) => Promise<void>;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function AddItemModal({
	onAdd,
	open = false,
	onOpenChange,
}: AddItemModalProps) {
	const [activeTab, setActiveTab] = useState("scan");
	const [scannedBarcode, setScannedBarcode] = useState("");
	const [scanError, setScanError] = useState<string | null>(null);

	const { animals, selectedHousehold } = useApp();
	// const { enqueue } = useOfflineQueue()

	const form = useForm<InventoryFormData>({
		resolver: zodResolver(inventoryFormSchema),
		defaultValues: {
			medicationId: "",
			name: "",
			brand: undefined,
			route: "",
			form: "",
			strength: undefined,
			concentration: undefined,
			quantityUnits: 1,
			unitsRemaining: 1,
			lot: undefined,
			expiresOn: new Date(),
			storage: "ROOM",
			assignedAnimalId: undefined,
			barcode: undefined,
			setInUse: false,
		},
	});

	const { isScanning, hasPermission, videoRef, startScanning, stopScanning } =
		useBarcodeScanner({
			onScan: (barcode) => {
				setScannedBarcode(barcode);
				form.setValue("barcode", barcode);

				// Fire instrumentation event
				window.dispatchEvent(
					new CustomEvent("inventory_add_scan", {
						detail: { barcode },
					}),
				);

				// TODO: Call server to resolve catalog info
				console.log("Scanned barcode:", barcode);
			},
			onError: (error) => {
				console.error("Barcode scan error:", error);
				setScanError(error);
			},
		});

	const onSubmit = async (data: InventoryFormData) => {
		try {
			await onAdd(data);

			// Fire instrumentation event
			window.dispatchEvent(
				new CustomEvent("inventory_add_manual", {
					detail: {
						name: data.name,
						hasBarcode: !!data.barcode,
						assigned: !!data.assignedAnimalId,
					},
				}),
			);

			// Reset form
			form.reset();
			setScannedBarcode("");
			onOpenChange?.(false);
		} catch (error) {
			console.error("Failed to add item:", error);
		}
	};

	const handleOpenChange = (newOpen: boolean) => {
		onOpenChange?.(newOpen);
		if (!newOpen) {
			stopScanning();
			setScannedBarcode("");
		}
	};

	return (
		<>
			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Add Inventory Item</DialogTitle>
						<DialogDescription>
							Scan a barcode or manually enter medication details
						</DialogDescription>
					</DialogHeader>

					<Form {...form}>
						<Tabs value={activeTab} onValueChange={setActiveTab}>
							<TabsList className="grid w-full grid-cols-2">
								<TabsTrigger value="scan" className="gap-2">
									<Scan className="h-4 w-4" />
									Scan
								</TabsTrigger>
								<TabsTrigger value="manual" className="gap-2">
									Manual
								</TabsTrigger>
							</TabsList>

							<TabsContent value="scan" className="space-y-4">
								{hasPermission === false ? (
									<Alert>
										<Camera className="h-4 w-4" />
										<AlertDescription>
											Camera access denied. Please use manual entry or enable
											camera permissions.
										</AlertDescription>
									</Alert>
								) : (
									<div className="space-y-4">
										{!isScanning ? (
											<div className="py-8 text-center">
												<Button
													onClick={startScanning}
													size="lg"
													className="gap-2"
												>
													<Camera className="h-5 w-5" />
													Start Scanning
												</Button>
												<p className="mt-2 text-muted-foreground text-sm">
													Point your camera at a barcode
												</p>
											</div>
										) : (
											<div className="space-y-4">
												<div className="relative">
													<video
														ref={videoRef}
														className="h-64 w-full rounded-lg bg-black object-cover"
														playsInline
														muted
													/>
													<div className="pointer-events-none absolute inset-0 rounded-lg border-2 border-primary">
														<div className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 h-24 w-48 transform rounded-lg border-2 border-white"></div>
													</div>
												</div>

												<div className="flex justify-center">
													<Button variant="outline" onClick={stopScanning}>
														Stop Scanning
													</Button>
												</div>
											</div>
										)}

										{scannedBarcode && (
											<Alert>
												<AlertDescription>
													Scanned:{" "}
													<span className="select-all rounded bg-muted px-1.5 py-0.5 font-mono">
														{scannedBarcode}
													</span>
													<br />
													<span className="text-muted-foreground text-sm">
														Switch to Manual tab to complete the details
													</span>
												</AlertDescription>
											</Alert>
										)}

										{/* Manual barcode input fallback */}
										<FormField
											control={form.control}
											name="barcode"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Or enter barcode manually</FormLabel>
													<FormControl>
														<Input
															placeholder="Enter barcode number"
															{...field}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>
								)}
							</TabsContent>

							<TabsContent value="manual">
								<form
									onSubmit={form.handleSubmit(onSubmit)}
									className="space-y-4"
								>
									{/* Medication Selection */}
									<Controller
										control={form.control}
										name="medicationId"
										rules={{ required: "Please select a medication" }}
										render={({ field }) => (
											<FormItem>
												<FormLabel>Medication *</FormLabel>
												<FormControl>
													<MedicationSearch
														value={field.value}
														onChange={(id, medication) => {
															field.onChange(id);
															// Auto-fill form fields from medication data
															form.setValue("name", medication.genericName);
															if (medication.brandName) {
																form.setValue("brand", medication.brandName);
															}
															form.setValue("form", medication.form);
															form.setValue("route", medication.route);
															if (medication.strength) {
																form.setValue("strength", medication.strength);
															}
															// If it's a controlled substance, set storage appropriately
															if (medication.controlledSubstance) {
																form.setValue("storage", "CONTROLLED");
															}
														}}
														required
														householdId={selectedHousehold?.id}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<div className="grid grid-cols-2 gap-4">
										<FormField
											control={form.control}
											name="name"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Generic Name</FormLabel>
													<FormControl>
														<Input {...field} readOnly disabled />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="brand"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Brand Name</FormLabel>
													<FormControl>
														<Input
															{...field}
															placeholder="Override if different"
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<FormField
											control={form.control}
											name="route"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Route *</FormLabel>
													<Select
														onValueChange={field.onChange}
														value={field.value}
													>
														<FormControl>
															<SelectTrigger>
																<SelectValue placeholder="Select route" />
															</SelectTrigger>
														</FormControl>
														<SelectContent>
															<SelectItem value="Oral">Oral</SelectItem>
															<SelectItem value="Subcutaneous">
																Subcutaneous
															</SelectItem>
															<SelectItem value="Intramuscular">
																Intramuscular
															</SelectItem>
															<SelectItem value="Topical">Topical</SelectItem>
															<SelectItem value="Ophthalmic">
																Ophthalmic
															</SelectItem>
															<SelectItem value="Otic">Otic</SelectItem>
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="form"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Form *</FormLabel>
													<Select
														onValueChange={field.onChange}
														value={field.value}
													>
														<FormControl>
															<SelectTrigger>
																<SelectValue placeholder="Select form" />
															</SelectTrigger>
														</FormControl>
														<SelectContent>
															<SelectItem value="Tablet">Tablet</SelectItem>
															<SelectItem value="Capsule">Capsule</SelectItem>
															<SelectItem value="Liquid">Liquid</SelectItem>
															<SelectItem value="Injection">
																Injection
															</SelectItem>
															<SelectItem value="Topical">Topical</SelectItem>
															<SelectItem value="Drops">Drops</SelectItem>
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
											name="strength"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Strength</FormLabel>
													<FormControl>
														<Input placeholder="e.g., 75mg, 5ml" {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="concentration"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Concentration</FormLabel>
													<FormControl>
														<Input placeholder="e.g., 10mg/ml" {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>

									<div className="grid grid-cols-3 gap-4">
										<FormField
											control={form.control}
											name="quantityUnits"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Total Quantity *</FormLabel>
													<FormControl>
														<Input
															type="number"
															min="1"
															{...field}
															onChange={(e) => {
																const value =
																	Number.parseInt(e.target.value) || 0;
																field.onChange(value);
																// Also update remaining if it's currently 0 or greater than new total
																const currentRemaining =
																	form.getValues("unitsRemaining");
																if (
																	currentRemaining === 0 ||
																	currentRemaining > value
																) {
																	form.setValue("unitsRemaining", value);
																}
															}}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="unitsRemaining"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Units Remaining *</FormLabel>
													<FormControl>
														<Input
															type="number"
															min="0"
															max={form.watch("quantityUnits")}
															{...field}
															onChange={(e) =>
																field.onChange(
																	Number.parseInt(e.target.value) || 0,
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
											name="lot"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Lot Number</FormLabel>
													<FormControl>
														<Input {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<FormField
											control={form.control}
											name="expiresOn"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Expires On *</FormLabel>
													<FormControl>
														<DateInput
															id="expires"
															value={field.value}
															onChange={field.onChange}
															placeholder="Select expiry date"
															fromDate={
																new Date(new Date().setHours(0, 0, 0, 0))
															}
															toDate={new Date(2030, 11, 31)} // Allow dates up to end of 2030
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="storage"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Storage *</FormLabel>
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
															<SelectItem value="ROOM">
																Room Temperature
															</SelectItem>
															<SelectItem value="FRIDGE">
																Refrigerated
															</SelectItem>
															<SelectItem value="FREEZER">Freezer</SelectItem>
															<SelectItem value="CONTROLLED">
																Controlled Substance
															</SelectItem>
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>

									<FormField
										control={form.control}
										name="assignedAnimalId"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Assign to Animal</FormLabel>
												<Select
													onValueChange={(value) =>
														field.onChange(value === "unassigned" ? "" : value)
													}
													value={field.value}
												>
													<FormControl>
														<SelectTrigger>
															<SelectValue placeholder="Select animal or leave unassigned" />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														<SelectItem value="unassigned">
															Unassigned
														</SelectItem>
														{animals.map((animal) => (
															<SelectItem key={animal.id} value={animal.id}>
																{animal.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>

									{form.watch("assignedAnimalId") && (
										<FormField
											control={form.control}
											name="setInUse"
											render={({ field }) => (
												<FormItem className="flex flex-row items-center space-x-2 space-y-0">
													<FormControl>
														<Checkbox
															checked={field.value}
															onCheckedChange={field.onChange}
														/>
													</FormControl>
													<FormLabel className="font-normal text-sm">
														Set as &quot;In Use&quot; for this animal
													</FormLabel>
												</FormItem>
											)}
										/>
									)}

									{form.watch("barcode") && (
										<div className="space-y-2">
											<div className="font-medium text-sm">Barcode</div>
											<div className="select-all rounded bg-muted p-2 font-mono text-sm">
												{form.watch("barcode")}
											</div>
										</div>
									)}

									<div className="flex justify-end gap-2 pt-4">
										<Button
											type="button"
											variant="outline"
											onClick={() => onOpenChange?.(false)}
										>
											Cancel
										</Button>
										<Button
											type="submit"
											disabled={form.formState.isSubmitting}
										>
											{form.formState.isSubmitting ? "Adding..." : "Add Item"}
										</Button>
									</div>
								</form>
							</TabsContent>
						</Tabs>
					</Form>
				</DialogContent>
			</Dialog>

			{/* Error Dialog */}
			<AlertDialog open={!!scanError} onOpenChange={() => setScanError(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Scanning Error</AlertDialogTitle>
						<AlertDialogDescription>
							<span className="flex items-center gap-2">
								<AlertCircle className="h-4 w-4" />
								{scanError}
							</span>
						</AlertDialogDescription>
						<p className="mt-2 text-muted-foreground text-sm">
							You can still add the item manually using the Manual tab.
						</p>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogAction onClick={() => setScanError(null)}>
							OK
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
