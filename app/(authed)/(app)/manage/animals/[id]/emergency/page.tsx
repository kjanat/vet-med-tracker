"use client";

import { AlertTriangle, Loader2, Phone, Pill } from "lucide-react";
import { useParams } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EmergencyCardPage() {
	const params = useParams();
	const _animalId = params.id as string;
	const { selectedHousehold } = useApp();

	// TODO: Fetch animal data once tRPC endpoint exists
	// const { data: animalData, isLoading: animalLoading } =
	//   trpc.animal.getById.useQuery(
	//     { id: animalId, householdId: selectedHousehold?.id || "" },
	//     { enabled: !!animalId && !!selectedHousehold?.id }
	//   );
	const animalData = null;
	const animalLoading = false;

	// TODO: Fetch active regimens once tRPC endpoint exists
	// const { data: regimens = [], isLoading: regimensLoading } =
	//   trpc.regimen.getByAnimal.useQuery(
	//     { animalId, householdId: selectedHousehold?.id || "" },
	//     { enabled: !!animalId && !!selectedHousehold?.id }
	//   );
	const regimens: unknown[] = [];
	const regimensLoading = false;

	const handlePrint = () => {
		window.print();
	};

	const isLoading = animalLoading || regimensLoading;

	// No household selected
	if (!selectedHousehold) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<Card className="max-w-md">
					<CardContent className="pt-6">
						<p className="text-center text-muted-foreground">
							Please select a household to view this emergency card.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Loading state
	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<div className="flex items-center gap-2">
					<Loader2 className="h-6 w-6 animate-spin" />
					<span className="text-lg">Loading emergency card...</span>
				</div>
			</div>
		);
	}

	// No data state
	if (!animalData) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<Card className="max-w-md">
					<CardContent className="pt-6">
						<p className="text-center text-muted-foreground">
							Animal not found or you don't have access to this animal.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Calculate age from DOB
	const calculateAge = (dob: Date | string | null) => {
		if (!dob) return null;
		const birthDate = new Date(dob);
		const age = Math.floor(
			(Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
		);
		return age;
	};

	const age = calculateAge(animalData.dob);

	return (
		<div className="min-h-screen bg-background">
			{/* Print Button - hidden when printing */}
			<div className="no-print border-b p-4">
				<div className="mx-auto flex max-w-4xl items-center justify-between">
					<h1 className="font-bold text-2xl">
						Emergency Card - {animalData.name}
					</h1>
					<Button onClick={handlePrint}>Print Card</Button>
				</div>
			</div>

			{/* Emergency Card Content */}
			<div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 print:p-4">
				<div className="rounded-lg border-2 border-red-500 p-4 sm:p-6 print:border-black">
					{/* Header */}
					<div className="mb-6 text-center">
						<h1 className="mb-2 font-bold text-2xl text-red-600 sm:text-3xl print:text-black">
							EMERGENCY CARD
						</h1>
						<p className="text-base text-muted-foreground sm:text-lg">
							Keep this information accessible at all times
						</p>
					</div>

					{/* Animal Info */}
					<Card className="mb-6">
						<CardHeader>
							<CardTitle className="flex items-center gap-3">
								<AnimalAvatar
									animal={{
										...animalData,
										avatar: animalData.photoUrl || undefined,
										pendingMeds: 0,
									}}
									size="lg"
								/>
								<div>
									<div className="text-xl sm:text-2xl">{animalData.name}</div>
									<div className="text-base text-muted-foreground sm:text-lg">
										{animalData.breed && `${animalData.breed} `}
										{animalData.species}
									</div>
								</div>
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 gap-3 text-sm">
								{animalData.sex && (
									<div>
										<span className="font-medium">Sex:</span> {animalData.sex}
										{animalData.neutered && " (Neutered)"}
									</div>
								)}
								{animalData.weightKg && (
									<div>
										<span className="font-medium">Weight:</span>{" "}
										{animalData.weightKg}kg
									</div>
								)}
								{age !== null && (
									<div>
										<span className="font-medium">Age:</span> {age} year
										{age !== 1 ? "s" : ""}
									</div>
								)}
								{animalData.color && (
									<div>
										<span className="font-medium">Color:</span>{" "}
										{animalData.color}
									</div>
								)}
								{animalData.microchipId && (
									<div className="col-span-2">
										<span className="font-medium">Microchip:</span>{" "}
										{animalData.microchipId}
									</div>
								)}
							</div>
						</CardContent>
					</Card>

					{/* Emergency Contacts */}
					<Card className="mb-6">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Phone className="h-5 w-5" />
								Emergency Contacts
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<div className="rounded-lg border p-3 sm:p-4">
									<div className="font-medium text-base sm:text-lg">
										Primary Veterinarian
									</div>
									<div className="font-bold text-lg sm:text-xl">
										{animalData.vetName || "Not specified"}
									</div>
									<div className="text-base sm:text-lg">
										{animalData.vetPhone || "Not specified"}
									</div>
								</div>
								<div className="rounded-lg border p-3 sm:p-4">
									<div className="font-medium text-base sm:text-lg">Owner</div>
									<div className="font-bold text-lg sm:text-xl">John Smith</div>
									<div className="text-base sm:text-lg">(555) 123-4567</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Medical Alerts */}
					{((animalData.allergies && animalData.allergies.length > 0) ||
						(animalData.conditions && animalData.conditions.length > 0)) && (
						<Card className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 print:bg-gray-100">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400 print:text-black">
									<AlertTriangle className="h-5 w-5" />
									Medical Alerts
								</CardTitle>
							</CardHeader>
							<CardContent>
								{animalData.allergies && animalData.allergies.length > 0 && (
									<div className="mb-4">
										<div className="mb-2 font-medium text-red-700 dark:text-red-400 print:text-black">
											ALLERGIES:
										</div>
										<div className="flex flex-wrap gap-2">
											{animalData.allergies.map((allergy: string) => (
												<Badge
													key={allergy}
													variant="destructive"
													className="text-sm print:bg-gray-300 print:text-black"
												>
													{allergy}
												</Badge>
											))}
										</div>
									</div>
								)}

								{animalData.conditions && animalData.conditions.length > 0 && (
									<div>
										<div className="mb-2 font-medium text-red-700 dark:text-red-400 print:text-black">
											CONDITIONS:
										</div>
										<div className="flex flex-wrap gap-2">
											{animalData.conditions.map((condition: string) => (
												<Badge
													key={condition}
													variant="secondary"
													className="text-sm print:bg-gray-300 print:text-black"
												>
													{condition}
												</Badge>
											))}
										</div>
									</div>
								)}
							</CardContent>
						</Card>
					)}

					{/* Current Medications */}
					<Card className="mb-6">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Pill className="h-5 w-5" />
								Current Medications
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{regimens.length === 0 ? (
									<p className="py-4 text-center text-muted-foreground">
										No active medications
									</p>
								) : (
									regimens.map((regimenData: unknown) => {
										// eslint-disable-next-line @typescript-eslint/no-explicit-any
										const regimen = regimenData as any;
										return (
											<div
												key={regimen.id}
												className="rounded-lg border p-3 sm:p-4"
											>
												<div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
													<div>
														<div className="font-medium text-base sm:text-lg">
															{regimen.medication?.genericName ||
																regimen.medication?.brandName ||
																regimen.name}
														</div>
														<div className="text-muted-foreground">
															{regimen.medication?.strength &&
																`${regimen.medication.strength} • `}
															{regimen.route ||
																regimen.medication?.route ||
																"Oral"}
														</div>
													</div>
													<Badge variant="outline">
														{regimen.scheduleType === "PRN"
															? `PRN - ${regimen.prnReason || "As needed"}`
															: regimen.timesLocal?.join(", ") ||
																"See instructions"}
													</Badge>
												</div>
												{regimen.instructions && (
													<div className="text-muted-foreground text-sm">
														<span className="font-medium">Instructions:</span>{" "}
														{regimen.instructions}
													</div>
												)}
											</div>
										);
									})
								)}
							</div>
						</CardContent>
					</Card>

					{/* Footer */}
					<div className="border-t pt-4 text-center text-muted-foreground text-sm">
						<p>
							Generated on {new Date().toLocaleDateString()} • Keep this card
							updated
						</p>
						<p className="mt-2">
							In case of emergency, contact your veterinarian immediately
						</p>
					</div>
				</div>
			</div>

			<style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            background: white !important;
            color: black !important;
          }
          
          .print\\:bg-gray-100 {
            background-color: #f3f4f6 !important;
          }
          
          .print\\:bg-gray-300 {
            background-color: #d1d5db !important;
          }
          
          .print\\:text-black {
            color: #000000 !important;
          }
          
          .print\\:border-black {
            border-color: #000000 !important;
          }
          
          /* Force light theme colors for print */
          .bg-background {
            background-color: white !important;
          }
          
          .text-muted-foreground {
            color: #6b7280 !important;
          }
          
          .border {
            border-color: #e5e7eb !important;
          }
        }
      `}</style>
		</div>
	);
}
