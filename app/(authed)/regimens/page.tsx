"use client";

import { Suspense } from "react";
import { RegimenList } from "@/components/regimens/regimen-list";

function RegimensContent() {
	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Regimens</h1>
					<p className="text-muted-foreground">
						Manage medication schedules and treatment plans
					</p>
				</div>
			</div>

			{/* Main content */}
			<RegimenList />
		</div>
	);
}

export default function RegimensPage() {
	return (
		<Suspense
			fallback={<div className="min-h-screen bg-background animate-pulse" />}
		>
			<RegimensContent />
		</Suspense>
	);
}
