"use client";

import { format, subDays } from "date-fns";
// import { useParams } from "next/navigation"
import {
	AlertTriangle,
	Calendar,
	Pill,
	Printer,
	TrendingUp,
} from "lucide-react";
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
	weightKg: 32,
	avatar: undefined,
	pendingMeds: 0,
};

const mockComplianceData = {
	adherencePct: 92,
	scheduled: 60,
	completed: 55,
	missed: 3,
	late: 2,
	veryLate: 0,
	streak: 5, // days without missed doses
};

const mockRegimens = [
	{
		id: "regimen-1",
		medicationName: "Rimadyl",
		strength: "75mg",
		route: "Oral",
		schedule: "8:00 AM, 8:00 PM",
		adherence: 95,
		notes: "Give with food",
	},
	{
		id: "regimen-2",
		medicationName: "Joint Supplement",
		strength: "1 tablet",
		route: "Oral",
		schedule: "Daily with breakfast",
		adherence: 88,
		notes: "Glucosamine/Chondroitin",
	},
];

const mockNotableEvents = [
	{
		id: "event-1",
		date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
		medication: "Rimadyl",
		note: "Took with food as recommended",
		tags: ["Normal"],
	},
	{
		id: "event-2",
		date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
		medication: "Joint Supplement",
		note: "Slight improvement in mobility",
		tags: ["Improved"],
	},
];

export default function AnimalReportPage() {
	// const params = useParams()
	// const animalId = params.id as string

	const handlePrint = () => {
		window.print();
	};

	const reportDate = new Date();
	const reportPeriod = {
		from: subDays(reportDate, 30),
		to: reportDate,
	};

	return (
		<div className="min-h-screen bg-white">
			{/* Print Button - hidden when printing */}
			<div className="no-print border-b p-4">
				<div className="mx-auto flex max-w-4xl items-center justify-between">
					<h1 className="font-bold text-2xl">
						Compliance Report - {mockAnimal.name}
					</h1>
					<Button onClick={handlePrint} className="gap-2">
						<Printer className="h-4 w-4" />
						Print Report
					</Button>
				</div>
			</div>

			{/* Report Content */}
			<div className="mx-auto max-w-4xl p-8 print:p-4">
				{/* Header */}
				<div className="mb-8 text-center">
					<h1 className="mb-2 font-bold text-3xl">
						Medication Compliance Report
					</h1>
					<p className="text-lg text-muted-foreground">
						{format(reportPeriod.from, "MMMM d")} -{" "}
						{format(reportPeriod.to, "MMMM d, yyyy")}
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
									{mockAnimal.breed} {mockAnimal.species} •{" "}
									{mockAnimal.weightKg}kg
								</div>
							</div>
						</CardTitle>
					</CardHeader>
				</Card>

				{/* Compliance Summary */}
				<div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="flex items-center gap-2 font-medium text-sm">
								<TrendingUp className="h-4 w-4" />
								Overall Adherence
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="font-bold text-3xl">
								{mockComplianceData.adherencePct}%
							</div>
							<p className="text-muted-foreground text-sm">
								{mockComplianceData.completed} of {mockComplianceData.scheduled}{" "}
								doses
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="flex items-center gap-2 font-medium text-sm">
								<Calendar className="h-4 w-4" />
								Current Streak
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="font-bold text-3xl">
								{mockComplianceData.streak}
							</div>
							<p className="text-muted-foreground text-sm">
								days without missed doses
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="font-medium text-sm">Late Doses</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="font-bold text-3xl">
								{mockComplianceData.late}
							</div>
							<p className="text-muted-foreground text-sm">
								within cutoff window
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="flex items-center gap-2 font-medium text-sm">
								<AlertTriangle className="h-4 w-4" />
								Missed Doses
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="font-bold text-3xl">
								{mockComplianceData.missed}
							</div>
							<p className="text-muted-foreground text-sm">
								beyond cutoff window
							</p>
						</CardContent>
					</Card>
				</div>

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
							{mockRegimens.map((regimen) => (
								<div
									key={regimen.id}
									className="flex items-center justify-between rounded-lg border p-4"
								>
									<div className="flex-1">
										<div className="font-medium text-lg">
											{regimen.medicationName}
										</div>
										<div className="text-muted-foreground">
											{regimen.strength} • {regimen.route} • {regimen.schedule}
										</div>
										{regimen.notes && (
											<div className="mt-1 text-muted-foreground text-sm">
												<span className="font-medium">Notes:</span>{" "}
												{regimen.notes}
											</div>
										)}
									</div>
									<div className="text-right">
										<div className="font-bold text-2xl">
											{regimen.adherence}%
										</div>
										<div className="text-muted-foreground text-sm">
											adherence
										</div>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Notable Events */}
				<Card className="mb-6">
					<CardHeader>
						<CardTitle>Notable Events</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{mockNotableEvents.map((event) => (
								<div key={event.id} className="rounded-lg border p-3">
									<div className="mb-2 flex items-center justify-between">
										<div className="font-medium">{event.medication}</div>
										<div className="text-muted-foreground text-sm">
											{format(event.date, "MMM d, yyyy")}
										</div>
									</div>
									<div className="mb-2 text-muted-foreground text-sm">
										{event.note}
									</div>
									<div className="flex gap-1">
										{event.tags.map((tag) => (
											<Badge key={tag} variant="secondary" className="text-xs">
												{tag}
											</Badge>
										))}
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Footer */}
				<div className="border-t pt-4 text-center text-muted-foreground text-sm">
					<p>
						Report generated on {format(reportDate, "MMMM d, yyyy 'at' h:mm a")}
					</p>
					<p className="mt-2">
						This report covers the period from{" "}
						{format(reportPeriod.from, "MMMM d")} to{" "}
						{format(reportPeriod.to, "MMMM d, yyyy")}
					</p>
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
          
          @page {
            margin: 0.5in;
          }
        }
      `}</style>
		</div>
	);
}
