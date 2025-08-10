import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DosageCalculatorLoading() {
	return (
		<div className="container mx-auto max-w-6xl p-4">
			{/* Header */}
			<div className="mb-6">
				<div className="mb-2 flex items-center gap-2">
					<Skeleton className="h-6 w-6" />
					<Skeleton className="h-8 w-48" />
				</div>
				<Skeleton className="h-5 w-96" />
			</div>

			{/* Tabs */}
			<div className="mb-6">
				<Skeleton className="h-10 w-48" />
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				{/* Input Form */}
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-48" />
							<Skeleton className="h-4 w-64" />
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Form fields */}
							{Array.from({ length: 6 }).map((_, i) => (
								<div key={i} className="space-y-2">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-10 w-full" />
								</div>
							))}

							{/* Textarea */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-20 w-full" />
							</div>
						</CardContent>
					</Card>

					{/* Action buttons */}
					<div className="flex gap-3">
						<Skeleton className="h-9 w-20" />
						<Skeleton className="h-9 w-20" />
						<Skeleton className="h-9 w-20" />
					</div>
				</div>

				{/* Results */}
				<div className="space-y-6">
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-12">
							<Skeleton className="mb-4 h-12 w-12" />
							<Skeleton className="mb-2 h-6 w-48" />
							<Skeleton className="h-4 w-80" />
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
