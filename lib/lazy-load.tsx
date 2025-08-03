"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
	ChartSkeleton,
	FormSkeleton,
	ListSkeleton,
} from "@/components/ui/skeleton-variants";

// Generic loading component
const GenericLoader = () => (
	<div className="space-y-4">
		<Skeleton className="h-8 w-48" />
		<Skeleton className="h-4 w-full" />
		<Skeleton className="h-4 w-3/4" />
	</div>
);

// Lazy load with custom loading component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyLoad<P = any>(
	importFunc: () => Promise<{ default: ComponentType<P> }>,
	loadingComponent?: ComponentType,
): ComponentType<P> {
	return dynamic(importFunc, {
		loading: () => {
			const Loader = loadingComponent || GenericLoader;
			return <Loader />;
		},
	});
}

// Pre-configured lazy loaders for common components
export const LazyChart = dynamic(
	() =>
		import("@/components/insights/compliance-heatmap").then(
			(mod) => mod.ComplianceHeatmap,
		),
	{
		loading: () => <ChartSkeleton />,
	},
);

export const LazyMedicationSearch = dynamic(
	() =>
		import("@/components/medication/medication-search").then(
			(mod) => mod.MedicationSearch,
		),
	{
		loading: () => <FormSkeleton fields={1} />,
	},
);

export const LazyRegimenForm = dynamic(
	() =>
		import("@/components/regimens/regimen-form").then((mod) => mod.RegimenForm),
	{
		loading: () => <FormSkeleton fields={5} />,
	},
);

export const LazyInventoryForm = dynamic(
	() =>
		import("@/components/inventory/add-item-modal").then(
			(mod) => mod.AddItemModal,
		),
	{
		loading: () => <FormSkeleton fields={4} />,
	},
);

export const LazyAnimalForm = dynamic(
	() =>
		import("@/components/settings/animals/animal-form").then(
			(mod) => mod.AnimalForm,
		),
	{
		loading: () => <FormSkeleton fields={5} />,
	},
);

// Heavy list components
export const LazyHistoryList = dynamic(
	() =>
		import("@/components/history/history-list").then((mod) => mod.HistoryList),
	{
		loading: () => <ListSkeleton count={5} />,
	},
);

// Note: inventory-grid doesn't exist, using inventory-card instead
export const LazyInventoryGrid = dynamic(
	() =>
		import("@/components/inventory/inventory-card").then(
			(mod) => mod.InventoryCard,
		),
	{
		loading: () => (
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 6 }, (_, i) => (
					<Skeleton
						// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loader
						key={i}
						className="h-32"
					/>
				))}
			</div>
		),
	},
);

// Export utility for creating lazy loaded modals
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createLazyModal<P = any>(
	importPath: () => Promise<{ default: ComponentType<P> }>,
	loadingHeight = "400px",
) {
	return dynamic(importPath, {
		loading: () => (
			<div className="p-6">
				<Skeleton className="mb-4 h-8 w-48" />
				<div style={{ height: loadingHeight }}>
					<FormSkeleton fields={4} />
				</div>
			</div>
		),
		ssr: false, // Modals typically don't need SSR
	});
}
