"use client";

import { FileChartColumn, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function AnimalReportsPage() {
	const router = useRouter();
	const { animals, selectedHousehold, selectedAnimal } = useApp();

	// If no household is selected, show a message
	if (!selectedHousehold) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="mx-auto max-w-4xl">
					<Card>
						<CardContent className="pt-6">
							<div className="text-center">
								<FileChartColumn className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
								<h3 className="mb-2 font-semibold text-lg">
									No Household Selected
								</h3>
								<p className="text-muted-foreground">
									Please select a household to view animal reports.
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	// If there's a selected animal, redirect to its report
	if (selectedAnimal) {
		router.push(`/reports/animal/${selectedAnimal.id}`);
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="flex items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					<span className="ml-2 text-lg text-muted-foreground">
						Loading report for {selectedAnimal.name}...
					</span>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="mx-auto max-w-4xl">
				{/* Animal Grid */}
				{animals.length === 0 ? (
					<Card>
						<CardContent className="pt-6">
							<div className="text-center">
								<FileChartColumn className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
								<h3 className="mb-2 font-semibold text-lg">No Animals Found</h3>
								<p className="text-muted-foreground">
									Add animals to your household to generate reports.
								</p>
							</div>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{animals.map((animal) => (
							<Link
								key={animal.id}
								href={`/reports/animal/${animal.id}`}
								className="group"
							>
								<Card className="h-full transition-all duration-200 hover:border-primary hover:shadow-lg">
									<CardHeader className="pb-4">
										<div className="flex items-center gap-4">
											<AnimalAvatar animal={animal} size="lg" />
											<div className="flex-1">
												<CardTitle className="line-clamp-1">
													{animal.name}
												</CardTitle>
												<p className="text-muted-foreground text-sm">
													{animal.species}
												</p>
											</div>
										</div>
									</CardHeader>
									<CardContent>
										<div
											className={cn(
												"flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2",
												"transition-colors group-hover:bg-primary/10",
											)}
										>
											<span className="text-sm">View Report</span>
											<FileChartColumn className="h-4 w-4 text-muted-foreground" />
										</div>
										{animal.pendingMeds > 0 && (
											<div className="mt-2 flex items-center gap-2 text-sm">
												<span
													className="inline-block h-2 w-2 rounded-full bg-amber-500"
													aria-hidden="true"
												/>
												<span className="text-muted-foreground">
													{animal.pendingMeds} pending medication
													{animal.pendingMeds !== 1 ? "s" : ""}
												</span>
											</div>
										)}
									</CardContent>
								</Card>
							</Link>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
