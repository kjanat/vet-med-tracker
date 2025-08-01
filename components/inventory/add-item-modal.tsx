"use client";

import { AlertCircle, Camera, Scan } from "lucide-react";
import type React from "react";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";

// import { useOfflineQueue } from "@/hooks/useOfflineQueue"

export interface AddItemData {
	name: string;
	brand?: string;
	route: string;
	form: string;
	strength?: string;
	concentration?: string;
	quantityUnits: number;
	unitsRemaining: number;
	lot?: string;
	expiresOn?: string;
	storage: "FRIDGE" | "ROOM";
	assignedAnimalId?: string;
	barcode?: string;
	setInUse: boolean;
}

interface AddItemModalProps {
	onAdd: (data: AddItemData) => Promise<void>;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function AddItemModal({
	onAdd,
	open = false,
	onOpenChange,
}: AddItemModalProps) {
	const [activeTab, setActiveTab] = useState("scan");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [scannedBarcode, setScannedBarcode] = useState("");
	const [scanError, setScanError] = useState<string | null>(null);
	const [formData, setFormData] = useState<AddItemData>({
		name: "",
		brand: "",
		route: "",
		form: "",
		strength: "",
		concentration: "",
		quantityUnits: 0,
		unitsRemaining: 0,
		lot: "",
		expiresOn: "",
		storage: "ROOM",
		assignedAnimalId: "",
		barcode: "",
		setInUse: false,
	});

	const { animals } = useApp();
	// const { enqueue } = useOfflineQueue()

	const { isScanning, hasPermission, videoRef, startScanning, stopScanning } =
		useBarcodeScanner({
			onScan: (barcode) => {
				setScannedBarcode(barcode);
				setFormData((prev) => ({ ...prev, barcode }));

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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			await onAdd(formData);

			// Fire instrumentation event
			window.dispatchEvent(
				new CustomEvent("inventory_add_manual", {
					detail: {
						name: formData.name,
						hasBarcode: !!formData.barcode,
						assigned: !!formData.assignedAnimalId,
					},
				}),
			);

			// Reset form
			setFormData({
				name: "",
				brand: "",
				route: "",
				form: "",
				strength: "",
				concentration: "",
				quantityUnits: 0,
				unitsRemaining: 0,
				lot: "",
				expiresOn: "",
				storage: "ROOM",
				assignedAnimalId: "",
				barcode: "",
				setInUse: false,
			});
			setScannedBarcode("");
		} catch (error) {
			console.error("Failed to add item:", error);
		} finally {
			setIsSubmitting(false);
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
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Add Inventory Item</DialogTitle>
						<DialogDescription>
							Scan a barcode or manually enter medication details
						</DialogDescription>
					</DialogHeader>

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
										<div className="text-center py-8">
											<Button
												onClick={startScanning}
												size="lg"
												className="gap-2"
											>
												<Camera className="h-5 w-5" />
												Start Scanning
											</Button>
											<p className="text-sm text-muted-foreground mt-2">
												Point your camera at a barcode
											</p>
										</div>
									) : (
										<div className="space-y-4">
											<div className="relative">
												<video
													ref={videoRef}
													className="w-full h-64 bg-black rounded-lg object-cover"
													playsInline
													muted
												/>
												<div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none">
													<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-24 border-2 border-white rounded-lg"></div>
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
												<span className="font-mono bg-muted px-1.5 py-0.5 rounded select-all">
													{scannedBarcode}
												</span>
												<br />
												<span className="text-sm text-muted-foreground">
													Switch to Manual tab to complete the details
												</span>
											</AlertDescription>
										</Alert>
									)}

									{/* Manual barcode input fallback */}
									<div className="space-y-2">
										<Label htmlFor="manual-barcode">
											Or enter barcode manually
										</Label>
										<Input
											id="manual-barcode"
											placeholder="Enter barcode number"
											value={formData.barcode}
											onChange={(e) =>
												setFormData((prev) => ({
													...prev,
													barcode: e.target.value,
												}))
											}
										/>
									</div>
								</div>
							)}
						</TabsContent>

						<TabsContent value="manual">
							<form onSubmit={handleSubmit} className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="name">Medication Name *</Label>
										<Input
											id="name"
											required
											value={formData.name}
											onChange={(e) =>
												setFormData((prev) => ({
													...prev,
													name: e.target.value,
												}))
											}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="brand">Brand Name</Label>
										<Input
											id="brand"
											value={formData.brand}
											onChange={(e) =>
												setFormData((prev) => ({
													...prev,
													brand: e.target.value,
												}))
											}
										/>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="route">Route *</Label>
										<Select
											value={formData.route}
											onValueChange={(value) =>
												setFormData((prev) => ({ ...prev, route: value }))
											}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select route" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="Oral">Oral</SelectItem>
												<SelectItem value="Subcutaneous">
													Subcutaneous
												</SelectItem>
												<SelectItem value="Intramuscular">
													Intramuscular
												</SelectItem>
												<SelectItem value="Topical">Topical</SelectItem>
												<SelectItem value="Ophthalmic">Ophthalmic</SelectItem>
												<SelectItem value="Otic">Otic</SelectItem>
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-2">
										<Label htmlFor="form">Form *</Label>
										<Select
											value={formData.form}
											onValueChange={(value) =>
												setFormData((prev) => ({ ...prev, form: value }))
											}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select form" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="Tablet">Tablet</SelectItem>
												<SelectItem value="Capsule">Capsule</SelectItem>
												<SelectItem value="Liquid">Liquid</SelectItem>
												<SelectItem value="Injection">Injection</SelectItem>
												<SelectItem value="Topical">Topical</SelectItem>
												<SelectItem value="Drops">Drops</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="strength">Strength</Label>
										<Input
											id="strength"
											placeholder="e.g., 75mg, 5ml"
											value={formData.strength}
											onChange={(e) =>
												setFormData((prev) => ({
													...prev,
													strength: e.target.value,
												}))
											}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="concentration">Concentration</Label>
										<Input
											id="concentration"
											placeholder="e.g., 10mg/ml"
											value={formData.concentration}
											onChange={(e) =>
												setFormData((prev) => ({
													...prev,
													concentration: e.target.value,
												}))
											}
										/>
									</div>
								</div>

								<div className="grid grid-cols-3 gap-4">
									<div className="space-y-2">
										<Label htmlFor="quantity">Total Quantity *</Label>
										<Input
											id="quantity"
											type="number"
											required
											min="1"
											value={formData.quantityUnits}
											onChange={(e) =>
												setFormData((prev) => ({
													...prev,
													quantityUnits: Number.parseInt(e.target.value) || 0,
													unitsRemaining: Number.parseInt(e.target.value) || 0, // Default remaining to total
												}))
											}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="remaining">Units Remaining *</Label>
										<Input
											id="remaining"
											type="number"
											required
											min="0"
											max={formData.quantityUnits}
											value={formData.unitsRemaining}
											onChange={(e) =>
												setFormData((prev) => ({
													...prev,
													unitsRemaining: Number.parseInt(e.target.value) || 0,
												}))
											}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="lot">Lot Number</Label>
										<Input
											id="lot"
											value={formData.lot}
											onChange={(e) =>
												setFormData((prev) => ({
													...prev,
													lot: e.target.value,
												}))
											}
										/>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<DateInput
										label="Expires On"
										id="expires"
										required
										value={
											formData.expiresOn
												? new Date(formData.expiresOn)
												: undefined
										}
										onChange={(date) => {
											const expiresOn = date
												? date.toISOString().split("T")[0]
												: "";
											setFormData((prev) => ({
												...prev,
												expiresOn,
											}));
										}}
										placeholder="Select expiry date"
										fromDate={new Date(new Date().setHours(0, 0, 0, 0))}
									/>

									<div className="space-y-2">
										<Label htmlFor="storage">Storage</Label>
										<Select
											value={formData.storage}
											onValueChange={(value: "FRIDGE" | "ROOM") =>
												setFormData((prev) => ({ ...prev, storage: value }))
											}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="ROOM">Room Temperature</SelectItem>
												<SelectItem value="FRIDGE">Refrigerated</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="assign">Assign to Animal</Label>
									<Select
										value={formData.assignedAnimalId}
										onValueChange={(value) =>
											setFormData((prev) => ({
												...prev,
												assignedAnimalId: value === "unassigned" ? "" : value,
											}))
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select animal or leave unassigned" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="unassigned">Unassigned</SelectItem>
											{animals.map((animal) => (
												<SelectItem key={animal.id} value={animal.id}>
													{animal.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{formData.assignedAnimalId && (
									<div className="flex items-center space-x-2">
										<Checkbox
											id="setInUse"
											checked={formData.setInUse}
											onCheckedChange={(checked) =>
												setFormData((prev) => ({
													...prev,
													setInUse: checked as boolean,
												}))
											}
										/>
										<Label htmlFor="setInUse" className="text-sm">
											Set as &quot;In Use&quot; for this animal
										</Label>
									</div>
								)}

								{formData.barcode && (
									<div className="space-y-2">
										<Label>Barcode</Label>
										<div className="text-sm font-mono bg-muted p-2 rounded select-all">
											{formData.barcode}
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
									<Button type="submit" disabled={isSubmitting}>
										{isSubmitting ? "Adding..." : "Add Item"}
									</Button>
								</div>
							</form>
						</TabsContent>
					</Tabs>
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
						<p className="text-sm text-muted-foreground mt-2">
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
