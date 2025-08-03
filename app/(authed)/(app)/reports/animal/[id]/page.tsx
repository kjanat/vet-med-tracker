"use client";

import { format, subDays } from "date-fns";
import {
	AlertCircle,
	AlertTriangle,
	Calendar,
	Loader2,
	Pill,
	Printer,
	TrendingUp,
} from "lucide-react";
import { useParams } from "next/navigation";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";

export default function AnimalReportPage() {
	const params = useParams();
	const animalId = params.id as string;

	// Get selected household from localStorage (this would typically come from context)
	const selectedHouseholdId =
		typeof window !== "undefined"
			? localStorage.getItem("selectedHouseholdId") || ""
			: "";

	const reportDate = new Date();
	const reportPeriod = {
		from: subDays(reportDate, 30),
		to: reportDate,
	};

	// Query the report data
	const {
		data: reportData,
		isLoading,
		error,
	} = trpc.reports.animalReport.useQuery(
		{
			animalId,
			householdId: selectedHouseholdId,
			startDate: reportPeriod.from.toISOString(),
			endDate: reportPeriod.to.toISOString(),
		},
		{
			enabled: !!animalId && !!selectedHouseholdId,
		},
	);

	const handlePrint = () => {
		window.print();
	};

	// Loading state
	if (isLoading) {
		return (
			<div className="min-h-screen bg-white">
				<div className="no-print border-b p-4">
					<div className="mx-auto flex max-w-4xl items-center justify-between">
						<h1 className="font-bold text-2xl">Loading Report...</h1>
					</div>
				</div>
				<div className="mx-auto max-w-4xl p-8">
					<div className="flex items-center justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						<span className="ml-2 text-lg text-muted-foreground">
							Loading report data...
						</span>
					</div>
				</div>
			</div>
		);
	}

	// Error state
	if (error || !reportData) {
		return (
			<div className="min-h-screen bg-white">
				<div className="no-print border-b p-4">
					<div className="mx-auto flex max-w-4xl items-center justify-between">
						<h1 className="font-bold text-2xl">Report Error</h1>
					</div>
				</div>
				<div className="mx-auto max-w-4xl p-8">
					<div className="flex items-center justify-center py-12">
						<Card className="w-full max-w-md">
							<CardContent className="pt-6">
								<div className="flex items-center gap-3 text-center">
									<AlertCircle className="h-8 w-8 text-destructive" />
									<div>
										<h3 className="font-semibold text-lg">
											Unable to Load Report
										</h3>
										<p className="text-muted-foreground text-sm">
											{error?.message || "Animal not found or access denied"}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		);
	}

	const { animal, compliance, regimens, notableEvents } = reportData;

	return (
		<div className="min-h-screen bg-white">
			{/* Print Button - hidden when printing */}
			<div className="no-print border-b p-4">
				<div className="mx-auto flex max-w-4xl items-center justify-between">
					<h1 className="font-bold text-2xl">
						Compliance Report - {animal.name}
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
							<AnimalAvatar
								animal={{
									...animal,
									avatar: animal.photoUrl || undefined,
									pendingMeds: animal.pendingMeds || 0,
								}}
								size="lg"
							/>
							<div>
								<div className="text-2xl">{animal.name}</div>
								<div className="text-lg text-muted-foreground">
									{animal.breed && `${animal.breed} `}
									{animal.species}
									{animal.weightKg && ` • ${animal.weightKg}kg`}
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
								{compliance.adherencePct}%
							</div>
							<p className="text-muted-foreground text-sm">
								{compliance.completed} of {compliance.scheduled} doses
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
							<div className="font-bold text-3xl">{compliance.streak}</div>
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
							<div className="font-bold text-3xl">{compliance.late}</div>
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
							<div className="font-bold text-3xl">{compliance.missed}</div>
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
							{regimens.length === 0 ? (
								<p className="py-4 text-center text-muted-foreground">
									No active medications found for this period.
								</p>
							) : (
								regimens.map((regimen) => (
									<div
										key={regimen.id}
										className="flex items-center justify-between rounded-lg border p-4"
									>
										<div className="flex-1">
											<div className="font-medium text-lg">
												{regimen.medicationName}
											</div>
											<div className="text-muted-foreground">
												{regimen.strength && `${regimen.strength} • `}
												{regimen.route} • {regimen.schedule}
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
								))
							)}
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
							{notableEvents.length === 0 ? (
								<p className="py-4 text-center text-muted-foreground">
									No notable events found for this period.
								</p>
							) : (
								notableEvents.map((event) => (
									<div key={event.id} className="rounded-lg border p-3">
										<div className="mb-2 flex items-center justify-between">
											<div className="font-medium">{event.medication}</div>
											<div className="text-muted-foreground text-sm">
												{format(new Date(event.date), "MMM d, yyyy")}
											</div>
										</div>
										<div className="mb-2 text-muted-foreground text-sm">
											{event.note}
										</div>
										<div className="flex gap-1">
											{event.tags.map((tag) => (
												<Badge
													key={tag}
													variant="secondary"
													className="text-xs"
												>
													{tag}
												</Badge>
											))}
										</div>
									</div>
								))
							)}
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
