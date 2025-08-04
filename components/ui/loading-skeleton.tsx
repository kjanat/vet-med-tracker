import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Reusable loading skeleton for pages
 */
export function PageLoadingSkeleton() {
	return (
		<div className="space-y-6">
			{/* Header skeleton */}
			<div className="space-y-2">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-4 w-96" />
			</div>

			{/* Content skeleton */}
			<div className="space-y-4">
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-40" />
					</CardHeader>
					<CardContent className="space-y-3">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-4 w-1/2" />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

/**
 * Loading skeleton for table views
 */
export function TableLoadingSkeleton({ rows = 5 }: { rows?: number }) {
	return (
		<div className="rounded-md border">
			<div className="border-b p-4">
				<Skeleton className="h-4 w-full max-w-sm" />
			</div>
			<div className="divide-y">
				{Array.from({ length: rows }).map((_, i) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: Loading skeletons are presentational and have no state
						key={`row-skeleton-${i}`}
						className="flex items-center gap-4 p-4"
					>
						<Skeleton className="h-10 w-10 rounded-full" />
						<div className="flex-1 space-y-2">
							<Skeleton className="h-4 w-1/3" />
							<Skeleton className="h-3 w-1/4" />
						</div>
						<Skeleton className="h-8 w-20" />
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * Loading skeleton for card grid views
 */
export function CardGridLoadingSkeleton({ cards = 6 }: { cards?: number }) {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{Array.from({ length: cards }).map((_, i) => (
				<Card
					// biome-ignore lint/suspicious/noArrayIndexKey: Loading skeletons are presentational and have no state
					key={`card-skeleton-${i}`}
				>
					<CardHeader>
						<Skeleton className="h-6 w-3/4" />
					</CardHeader>
					<CardContent className="space-y-2">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-2/3" />
					</CardContent>
				</Card>
			))}
		</div>
	);
}
