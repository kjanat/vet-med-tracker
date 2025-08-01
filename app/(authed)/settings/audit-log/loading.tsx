import { Skeleton } from "@/components/ui/skeleton";

export default function AuditLogLoading() {
	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<Skeleton className="h-8 w-32 mb-2" />
				<Skeleton className="h-4 w-96" />
			</div>

			{/* Filters */}
			<div className="flex gap-4">
				<Skeleton className="h-10 w-48" />
				<Skeleton className="h-10 w-48" />
				<Skeleton className="h-10 w-32" />
			</div>

			{/* Table */}
			<div className="border rounded-lg">
				{/* Table Header */}
				<div className="border-b p-4 grid grid-cols-5 gap-4">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-4 w-24" />
				</div>

				{/* Table Rows */}
				{Array.from({ length: 10 }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loader
					<div key={i} className="border-b p-4 grid grid-cols-5 gap-4">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-4 w-full max-w-xs" />
						<Skeleton className="h-4 w-16" />
					</div>
				))}
			</div>

			{/* Pagination */}
			<div className="flex justify-between items-center">
				<Skeleton className="h-4 w-48" />
				<div className="flex gap-2">
					<Skeleton className="h-8 w-8" />
					<Skeleton className="h-8 w-8" />
					<Skeleton className="h-8 w-8" />
				</div>
			</div>
		</div>
	);
}
