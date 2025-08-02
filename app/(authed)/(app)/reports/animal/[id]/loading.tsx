import { Skeleton } from "@/components/ui/skeleton";

export default function AnimalReportLoading() {
	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto py-8 px-4">
				{/* Header */}
				<div className="mb-8 space-y-2">
					<Skeleton className="h-10 w-64" />
					<Skeleton className="h-6 w-96" />
				</div>

				{/* Animal Info Card */}
				<div className="mb-8 rounded-lg border p-6 space-y-4">
					<div className="flex items-center gap-4">
						<Skeleton className="h-16 w-16 rounded-full" />
						<div className="space-y-2">
							<Skeleton className="h-6 w-32" />
							<Skeleton className="h-4 w-48" />
						</div>
					</div>
				</div>

				{/* Stats Grid */}
				<div className="grid gap-4 mb-8 md:grid-cols-2 lg:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loader
						<Skeleton key={i} className="h-32" />
					))}
				</div>

				{/* Compliance Chart */}
				<div className="mb-8">
					<Skeleton className="h-6 w-48 mb-4" />
					<Skeleton className="h-64 w-full" />
				</div>

				{/* Recent Administrations */}
				<div>
					<Skeleton className="h-6 w-48 mb-4" />
					<div className="space-y-2">
						{Array.from({ length: 5 }).map((_, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loader
							<Skeleton key={i} className="h-16 w-full" />
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
