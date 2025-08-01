"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
	AnimalCardSkeleton,
	ChartSkeleton,
	FormSkeleton,
	InventoryItemSkeleton,
	ListSkeleton,
	MedicationCardSkeleton,
	SummaryCardSkeleton,
} from "@/components/ui/skeleton-variants";

// Home page loading state
export function HomePageLoading() {
	return (
		<div className="container mx-auto px-4 py-6 space-y-6">
			{/* Header */}
			<div className="space-y-2">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-4 w-64" />
			</div>

			{/* Action cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{Array.from({ length: 4 }, (_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loader
					<SummaryCardSkeleton key={i} />
				))}
			</div>

			{/* Pending medications */}
			<div className="space-y-4">
				<Skeleton className="h-6 w-40" />
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 3 }, (_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loader
						<MedicationCardSkeleton key={i} />
					))}
				</div>
			</div>
		</div>
	);
}

// Record administration page loading
export function RecordPageLoading() {
	return (
		<div className="container mx-auto px-4 py-6 space-y-6">
			<div className="space-y-2">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-4 w-64" />
			</div>

			<div className="max-w-2xl mx-auto">
				<FormSkeleton fields={4} />
			</div>
		</div>
	);
}

// History page loading
export function HistoryPageLoading() {
	return (
		<div className="container mx-auto px-4 py-6 space-y-6">
			<div className="space-y-2">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-4 w-64" />
			</div>

			{/* Filters */}
			<div className="flex gap-4">
				<Skeleton className="h-10 w-40" />
				<Skeleton className="h-10 w-40" />
				<Skeleton className="h-10 w-40" />
			</div>

			{/* History list */}
			<div className="space-y-2">
				{Array.from({ length: 5 }, (_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loader
					<div key={i} className="border rounded-lg p-4">
						<ListSkeleton count={1} />
					</div>
				))}
			</div>
		</div>
	);
}

// Inventory page loading
export function InventoryPageLoading() {
	return (
		<div className="container mx-auto px-4 py-6 space-y-6">
			<div className="flex items-center justify-between">
				<div className="space-y-2">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-4 w-64" />
				</div>
				<Skeleton className="h-10 w-32" />
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{Array.from({ length: 3 }, (_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loader
					<SummaryCardSkeleton key={i} />
				))}
			</div>

			{/* Inventory grid */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 6 }, (_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loader
					<InventoryItemSkeleton key={i} />
				))}
			</div>
		</div>
	);
}

// Insights page loading
export function InsightsPageLoading() {
	return (
		<div className="container mx-auto px-4 py-6 space-y-6">
			<div className="space-y-2">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-4 w-64" />
			</div>

			{/* Summary cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				{Array.from({ length: 4 }, (_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loader
					<SummaryCardSkeleton key={i} />
				))}
			</div>

			{/* Charts */}
			<div className="grid gap-6 md:grid-cols-2">
				<ChartSkeleton />
				<ChartSkeleton />
			</div>

			{/* Additional insights */}
			<div className="grid gap-4">
				<div className="border rounded-lg p-6">
					<Skeleton className="h-6 w-40 mb-4" />
					<ListSkeleton count={3} />
				</div>
			</div>
		</div>
	);
}

// Animals page loading
export function AnimalsPageLoading() {
	return (
		<div className="container mx-auto px-4 py-6 space-y-6">
			<div className="flex items-center justify-between">
				<div className="space-y-2">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-4 w-64" />
				</div>
				<Skeleton className="h-10 w-32" />
			</div>

			{/* Animal grid */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 6 }, (_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loader
					<AnimalCardSkeleton key={i} />
				))}
			</div>
		</div>
	);
}

// Settings page loading
export function SettingsPageLoading() {
	return (
		<div className="container mx-auto px-4 py-6 max-w-4xl">
			<div className="space-y-2 mb-8">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-4 w-64" />
			</div>

			{/* Settings sections */}
			<div className="space-y-8">
				{Array.from({ length: 3 }, (_, i) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loader
						key={i}
						className="border rounded-lg p-6 space-y-4"
					>
						<Skeleton className="h-6 w-32" />
						<FormSkeleton fields={2} />
					</div>
				))}
			</div>
		</div>
	);
}
