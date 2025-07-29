"use client";

// import { useParams } from "next/navigation"
import { AlertTriangle, Phone, Pill } from "lucide-react";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Mock data - replace with tRPC
const mockAnimal = {
	id: "1",
	name: "Buddy",
	species: "Dog",
	breed: "Golden Retriever",
	sex: "Male",
	neutered: true,
	dob: new Date("2020-03-15"),
	weightKg: 32,
	microchipId: "123456789012345",
	color: "Golden",
	vetName: "Dr. Smith",
	vetPhone: "(555) 123-4567",
	allergies: ["Chicken", "Beef"],
	conditions: ["Hip Dysplasia"],
	avatar: undefined,
	pendingMeds: 2,
};

const mockRegimens = [
	{
		medicationName: "Rimadyl",
		strength: "75mg",
		route: "Oral",
		schedule: "8:00 AM, 8:00 PM",
		notes: "Give with food",
	},
	{
		medicationName: "Joint Supplement",
		strength: "1 tablet",
		route: "Oral",
		schedule: "Daily with breakfast",
		notes: "Glucosamine/Chondroitin",
	},
];

export default function EmergencyCardPage() {
	// const params = useParams()
	// const animalId = params.id as string

	const handlePrint = () => {
		window.print();
	};

	return (
		<div className="min-h-screen bg-white">
			{/* Print Button - hidden when printing */}
			<div className="no-print p-4 border-b">
				<div className="flex items-center justify-between max-w-4xl mx-auto">
					<h1 className="text-2xl font-bold">
						Emergency Card - {mockAnimal.name}
					</h1>
					<Button onClick={handlePrint}>Print Card</Button>
				</div>
			</div>

			{/* Emergency Card Content */}
			<div className="max-w-4xl mx-auto p-8 print:p-4">
				<div className="border-2 border-red-500 rounded-lg p-6 print:border-black">
					{/* Header */}
					<div className="text-center mb-6">
						<h1 className="text-3xl font-bold text-red-600 print:text-black mb-2">
							EMERGENCY CARD
						</h1>
						<p className="text-lg text-muted-foreground">
							Keep this information accessible at all times
						</p>
					</div>

					{/* Animal Info */}
					<Card className="mb-6">
						<CardHeader>
							<CardTitle className="flex items-center gap-3">
								<AnimalAvatar animal={mockAnimal} size="lg" />
								<div>
									<div className="text-2xl">{mockAnimal.name}</div>
									<div className="text-lg text-muted-foreground">
										{mockAnimal.breed} {mockAnimal.species}
									</div>
								</div>
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
								<div>
									<span className="font-medium">Sex:</span> {mockAnimal.sex}
									{mockAnimal.neutered && " (Neutered)"}
								</div>
								<div>
									<span className="font-medium">Weight:</span>{" "}
									{mockAnimal.weightKg}kg
								</div>
								<div>
									<span className="font-medium">Age:</span>{" "}
									{Math.floor(
										(Date.now() - mockAnimal.dob.getTime()) /
											(365.25 * 24 * 60 * 60 * 1000),
									)}{" "}
									years
								</div>
								<div>
									<span className="font-medium">Color:</span> {mockAnimal.color}
								</div>
								{mockAnimal.microchipId && (
									<div className="md:col-span-2">
										<span className="font-medium">Microchip:</span>{" "}
										{mockAnimal.microchipId}
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
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="p-4 border rounded-lg">
									<div className="font-medium text-lg">
										Primary Veterinarian
									</div>
									<div className="text-xl font-bold">{mockAnimal.vetName}</div>
									<div className="text-lg">{mockAnimal.vetPhone}</div>
								</div>
								<div className="p-4 border rounded-lg">
									<div className="font-medium text-lg">Owner</div>
									<div className="text-xl font-bold">John Smith</div>
									<div className="text-lg">(555) 123-4567</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Medical Alerts */}
					{(mockAnimal.allergies.length > 0 ||
						mockAnimal.conditions.length > 0) && (
						<Card className="mb-6 border-red-200 bg-red-50 print:bg-gray-100">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-red-700 print:text-black">
									<AlertTriangle className="h-5 w-5" />
									Medical Alerts
								</CardTitle>
							</CardHeader>
							<CardContent>
								{mockAnimal.allergies.length > 0 && (
									<div className="mb-4">
										<div className="font-medium text-red-700 print:text-black mb-2">
											ALLERGIES:
										</div>
										<div className="flex flex-wrap gap-2">
											{mockAnimal.allergies.map((allergy) => (
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

								{mockAnimal.conditions.length > 0 && (
									<div>
										<div className="font-medium text-red-700 print:text-black mb-2">
											CONDITIONS:
										</div>
										<div className="flex flex-wrap gap-2">
											{mockAnimal.conditions.map((condition) => (
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
								{mockRegimens.map((regimen, index) => (
									<div key={index} className="p-4 border rounded-lg">
										<div className="flex justify-between items-start mb-2">
											<div>
												<div className="font-medium text-lg">
													{regimen.medicationName}
												</div>
												<div className="text-muted-foreground">
													{regimen.strength} • {regimen.route}
												</div>
											</div>
											<Badge variant="outline">{regimen.schedule}</Badge>
										</div>
										{regimen.notes && (
											<div className="text-sm text-muted-foreground">
												<span className="font-medium">Notes:</span>{" "}
												{regimen.notes}
											</div>
										)}
									</div>
								))}
							</div>
						</CardContent>
					</Card>

					{/* Footer */}
					<div className="text-center text-sm text-muted-foreground border-t pt-4">
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
        }
      `}</style>
		</div>
	);
}
