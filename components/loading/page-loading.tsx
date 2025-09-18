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
    <div className="container mx-auto space-y-6 px-4 py-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          "home-action-1",
          "home-action-2",
          "home-action-3",
          "home-action-4",
        ].map((key) => (
          <SummaryCardSkeleton key={key} />
        ))}
      </div>

      {/* Pending medications */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {["pending-med-1", "pending-med-2", "pending-med-3"].map((key) => (
            <MedicationCardSkeleton key={key} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Record administration page loading
export function RecordPageLoading() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="mx-auto max-w-2xl">
        <FormSkeleton fields={4} />
      </div>
    </div>
  );
}

// History page loading
export function HistoryPageLoading() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
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
        {["history-1", "history-2", "history-3", "history-4", "history-5"].map(
          (key) => (
            <div className="rounded-lg border p-4" key={key}>
              <ListSkeleton count={1} />
            </div>
          ),
        )}
      </div>
    </div>
  );
}

// Inventory page loading
export function InventoryPageLoading() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {["inv-stat-1", "inv-stat-2", "inv-stat-3"].map((key) => (
          <SummaryCardSkeleton key={key} />
        ))}
      </div>

      {/* Inventory grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {["inv-1", "inv-2", "inv-3", "inv-4", "inv-5", "inv-6"].map((key) => (
          <InventoryItemSkeleton key={key} />
        ))}
      </div>
    </div>
  );
}

// Insights page loading
export function InsightsPageLoading() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {["insight-1", "insight-2", "insight-3", "insight-4"].map((key) => (
          <SummaryCardSkeleton key={key} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Additional insights */}
      <div className="grid gap-4">
        <div className="rounded-lg border p-6">
          <Skeleton className="mb-4 h-6 w-40" />
          <ListSkeleton count={3} />
        </div>
      </div>
    </div>
  );
}

// Animals page loading
export function AnimalsPageLoading() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Animal grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[
          "animal-1",
          "animal-2",
          "animal-3",
          "animal-4",
          "animal-5",
          "animal-6",
        ].map((key) => (
          <AnimalCardSkeleton key={key} />
        ))}
      </div>
    </div>
  );
}

// Settings page loading
export function SettingsPageLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Settings sections */}
      <div className="space-y-8">
        {["setting-1", "setting-2", "setting-3"].map((key) => (
          <div className="space-y-4 rounded-lg border p-6" key={key}>
            <Skeleton className="h-6 w-32" />
            <FormSkeleton fields={2} />
          </div>
        ))}
      </div>
    </div>
  );
}
