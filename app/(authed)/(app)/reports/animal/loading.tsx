import { Loader2 } from "lucide-react";

export default function AnimalReportsLoading() {
	return (
		<div className="container mx-auto px-4 py-8">
			<div className="mx-auto max-w-4xl">
				{/* Header skeleton */}
				<div className="mb-8">
					<div className="mb-2 h-10 w-48 animate-pulse rounded-lg bg-muted" />
					<div className="h-6 w-96 animate-pulse rounded-lg bg-muted" />
				</div>

				{/* Loading indicator */}
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					<span className="ml-2 text-lg text-muted-foreground">
						Loading animals...
					</span>
				</div>
			</div>
		</div>
	);
}
