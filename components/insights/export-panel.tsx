"use client";

import { Download, FileText, Printer } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export function ExportPanel() {
	const [isExporting, setIsExporting] = useState(false);
	const [selectedAnimalId, setSelectedAnimalId] = useState<string>("all");
	const { animals } = useApp();

	const handleExportCSV = async () => {
		setIsExporting(true);
		try {
			console.log("Exporting compliance CSV");

			// Fire instrumentation event
			window.dispatchEvent(
				new CustomEvent("insights_export_csv", {
					detail: { animalId: selectedAnimalId },
				}),
			);

			// TODO: Replace with tRPC mutation
			// const data = await reports.csv.query({
			//   householdId,
			//   animalId: selectedAnimalId === "all" ? undefined : selectedAnimalId,
			//   from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
			//   to: new Date()
			// })

			// Create mock CSV
			const csvContent = [
				"Date,Animal,Medication,Scheduled Time,Recorded Time,Status,Notes",
				"2024-01-15,Buddy,Rimadyl 75mg,08:00,08:05,On Time,Given with food",
				"2024-01-15,Whiskers,Insulin 2 units,07:00,07:02,On Time,Left shoulder",
				"2024-01-15,Buddy,Rimadyl 75mg,20:00,20:15,Late,",
			].join("\n");

			const blob = new Blob([csvContent], { type: "text/csv" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `compliance-report-${new Date().toISOString().split("T")[0]}.csv`;
			a.click();
			URL.revokeObjectURL(url);

			console.log("CSV exported successfully");
		} catch (error) {
			console.error("Failed to export CSV:", error);
		} finally {
			setIsExporting(false);
		}
	};

	const handlePrintReport = (animalId: string) => {
		// Open print-friendly report page
		const url = `/reports/animal/${animalId}`;
		window.open(url, "_blank");

		// Fire instrumentation event
		window.dispatchEvent(
			new CustomEvent("insights_print_report", {
				detail: { animalId },
			}),
		);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Download className="h-5 w-5" />
					Export Reports
				</CardTitle>
				<CardDescription>
					Generate compliance reports and summaries
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
					<Select value={selectedAnimalId} onValueChange={setSelectedAnimalId}>
						<SelectTrigger className="w-full sm:w-[180px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Animals</SelectItem>
							{animals.map((animal) => (
								<SelectItem key={animal.id} value={animal.id}>
									{animal.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Button
						onClick={handleExportCSV}
						disabled={isExporting}
						className="w-full gap-2 sm:w-auto"
					>
						<FileText className="h-4 w-4" />
						Export CSV
					</Button>
				</div>

				<div className="space-y-2">
					<h4 className="font-medium text-sm">Individual Animal Reports</h4>
					<div className="grid gap-2">
						{animals.map((animal) => (
							<Button
								key={animal.id}
								variant="outline"
								onClick={() => handlePrintReport(animal.id)}
								className="justify-start gap-2"
							>
								<Printer className="h-4 w-4" />
								{animal.name} Report (PDF)
							</Button>
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
