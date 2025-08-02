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
export function lazyLoad<T extends ComponentType<any>>(
	importFunc: () => Promise<{ default: T }>,
	loadingComponent?: ComponentType,
) {
	return dynamic(importFunc, {
		loading: () => {
			const Loader = loadingComponent || GenericLoader;
			return <Loader />;
		},
	});
}

// Pre-configured lazy loaders for common components
export const LazyChart = lazyLoad(
	() =>
		import("@/components/insights/compliance-heatmap").then((mod) => ({
			default: mod.ComplianceHeatmap,
		})),
	ChartSkeleton,
);

export const LazyMedicationSearch = lazyLoad(
	() =>
		import("@/components/medication/medication-search").then((mod) => ({
			default: mod.MedicationSearch,
		})),
	() => <FormSkeleton fields={1} />,
);

export const LazyRegimenForm = lazyLoad(
	() =>
		import("@/components/regimens/regimen-form").then((mod) => ({
			default: mod.RegimenForm,
		})),
	() => <FormSkeleton fields={5} />,
);

export const LazyInventoryForm = lazyLoad(
	() =>
		import("@/components/inventory/add-item-modal").then((mod) => ({
			default: mod.AddItemModal,
		})),
	() => <FormSkeleton fields={4} />,
);

export const LazyAnimalForm = lazyLoad(
	() =>
		import("@/components/settings/animals/animal-form").then((mod) => ({
			default: mod.AnimalForm,
		})),
	() => <FormSkeleton fields={5} />,
);

// Heavy list components
export const LazyHistoryList = lazyLoad(
	() =>
		import("@/components/history/history-list").then((mod) => ({
			default: mod.HistoryList,
		})),
	() => <ListSkeleton count={5} />,
);

// Note: inventory-grid doesn't exist, using inventory-card instead
export const LazyInventoryGrid = lazyLoad(
	() =>
		import("@/components/inventory/inventory-card").then((mod) => ({
			default: mod.InventoryCard,
		})),
	() => (
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
);

// Export utility for creating lazy loaded modals
export function createLazyModal<P = Record<string, unknown>>(
	importPath: () => Promise<{ default: ComponentType<P> }>,
	loadingHeight = "400px",
) {
	return dynamic(importPath, {
		loading: () => (
			<div className="p-6">
				<Skeleton className="h-8 w-48 mb-4" />
				<div style={{ height: loadingHeight }}>
					<FormSkeleton fields={4} />
				</div>
			</div>
		),
		ssr: false, // Modals typically don't need SSR
	});
}
