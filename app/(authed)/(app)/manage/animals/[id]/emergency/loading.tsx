import { Skeleton } from "@/components/ui/skeleton";

export default function EmergencyCardLoading() {
	return (
		<div className="min-h-screen bg-background p-4">
			<div className="max-w-2xl mx-auto">
				{/* Header */}
				<div className="mb-6 text-center">
					<Skeleton className="h-10 w-64 mx-auto mb-2" />
					<Skeleton className="h-6 w-48 mx-auto" />
				</div>

				{/* Emergency Contact */}
				<div className="mb-6 p-4 border-2 border-destructive rounded-lg">
					<Skeleton className="h-6 w-48 mb-2" />
					<Skeleton className="h-8 w-64" />
				</div>

				{/* Animal Info */}
				<div className="bg-card rounded-lg p-6 mb-6 space-y-4">
					<div className="flex items-center gap-4">
						<Skeleton className="h-20 w-20 rounded-full" />
						<div className="space-y-2">
							<Skeleton className="h-8 w-32" />
							<Skeleton className="h-4 w-48" />
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Skeleton className="h-4 w-16 mb-1" />
							<Skeleton className="h-6 w-24" />
						</div>
						<div>
							<Skeleton className="h-4 w-16 mb-1" />
							<Skeleton className="h-6 w-32" />
						</div>
					</div>
				</div>

				{/* Medical Info */}
				<div className="space-y-4">
					<div className="bg-card rounded-lg p-4">
						<Skeleton className="h-6 w-32 mb-2" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-3/4 mt-1" />
					</div>

					<div className="bg-card rounded-lg p-4">
						<Skeleton className="h-6 w-48 mb-2" />
						<div className="space-y-2">
							{Array.from({ length: 3 }).map((_, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loader
								<Skeleton key={i} className="h-4 w-full" />
							))}
						</div>
					</div>
				</div>

				{/* Actions */}
				<div className="mt-6 flex gap-4 justify-center">
					<Skeleton className="h-10 w-24" />
					<Skeleton className="h-10 w-24" />
				</div>
			</div>
		</div>
	);
}
