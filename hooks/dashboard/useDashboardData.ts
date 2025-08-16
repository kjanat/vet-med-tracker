"use client";

import { useCallback, useMemo } from "react";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { trpc } from "@/server/trpc/client";

// Export types for reuse in components
export interface DateRange {
  from: Date;
  to: Date;
}

export interface Period {
  label: string;
  value: "7d" | "30d" | "90d" | "12m" | "custom";
  days: number;
}

export const PERIOD_OPTIONS: Period[] = [
  { label: "Last 7 days", value: "7d", days: 7 },
  { label: "Last 30 days", value: "30d", days: 30 },
  { label: "Last 3 months", value: "90d", days: 90 },
  { label: "Last 12 months", value: "12m", days: 365 },
];

export function getDateRangeFromPeriod(period: Period): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - period.days);

  return { from, to };
}

// Hook for compliance data
export function useComplianceData(dateRange: DateRange) {
  const { selectedHousehold } = useApp();

  return trpc.admin.list.useQuery(
    {
      householdId: selectedHousehold?.id || "",
      startDate: dateRange.from.toISOString(),
      endDate: dateRange.to.toISOString(),
    },
    {
      enabled: !!selectedHousehold?.id,
      staleTime: 5 * 60 * 1000, // 5 minutes
      select: (data) => {
        if (!data) return null;

        // Calculate compliance metrics
        const scheduled = data.filter((r) => r.status !== "PRN").length;
        const completed = data.filter(
          (r) =>
            r.status === "ON_TIME" ||
            r.status === "LATE" ||
            r.status === "VERY_LATE",
        ).length;
        const onTime = data.filter((r) => r.status === "ON_TIME").length;
        const late = data.filter((r) => r.status === "LATE").length;
        const veryLate = data.filter((r) => r.status === "VERY_LATE").length;
        const missed = data.filter((r) => r.status === "MISSED").length;

        const complianceRate =
          scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
        const onTimeRate =
          scheduled > 0 ? Math.round((onTime / scheduled) * 100) : 0;

        return {
          scheduled,
          completed,
          onTime,
          late,
          veryLate,
          missed,
          complianceRate,
          onTimeRate,
          rawData: data,
        };
      },
    },
  );
}

// Hook for administration timeline data
export function useAdministrationStats(period: Period) {
  const { selectedHousehold } = useApp();
  const dateRange = useMemo(() => getDateRangeFromPeriod(period), [period]);

  return trpc.admin.list.useQuery(
    {
      householdId: selectedHousehold?.id || "",
      startDate: dateRange.from.toISOString(),
      endDate: dateRange.to.toISOString(),
    },
    {
      enabled: !!selectedHousehold?.id,
      staleTime: 5 * 60 * 1000,
      select: (data) => {
        if (!data) return null;

        // Group by date for timeline chart
        const dailyStats = data.reduce(
          (acc, record) => {
            const date = new Date(record.recordedAt)
              .toISOString()
              .split("T")[0];
            if (!date) return acc;

            if (!acc[date]) {
              acc[date] = {
                date,
                onTime: 0,
                late: 0,
                missed: 0,
                total: 0,
              };
            }

            acc[date].total++;
            switch (record.status) {
              case "ON_TIME":
                acc[date].onTime++;
                break;
              case "LATE":
              case "VERY_LATE":
                acc[date].late++;
                break;
              case "MISSED":
                acc[date].missed++;
                break;
            }

            return acc;
          },
          {} as Record<
            string,
            {
              date: string;
              onTime: number;
              late: number;
              missed: number;
              total: number;
            }
          >,
        );

        return Object.values(dailyStats).sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
      },
    },
  );
}

// Hook for medication distribution data
export function useMedicationDistribution() {
  const { selectedHousehold } = useApp();

  return trpc.regimen.list.useQuery(
    {
      householdId: selectedHousehold?.id || "",
    },
    {
      enabled: !!selectedHousehold?.id,
      staleTime: 10 * 60 * 1000, // 10 minutes - regimens change less frequently
      select: (data) => {
        if (!data) return null;

        // Group by medication
        const medicationCounts = data.reduce(
          (acc, regimen) => {
            const medName = regimen.medication?.genericName || "Unknown";
            acc[medName] = (acc[medName] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );

        return Object.entries(medicationCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
      },
    },
  );
}

// Hook for animal activity data
export function useAnimalActivityData(dateRange: DateRange) {
  const { selectedHousehold, animals } = useApp();

  return trpc.admin.list.useQuery(
    {
      householdId: selectedHousehold?.id || "",
      startDate: dateRange.from.toISOString(),
      endDate: dateRange.to.toISOString(),
    },
    {
      enabled: !!selectedHousehold?.id,
      staleTime: 5 * 60 * 1000,
      select: (data) => {
        if (!data || !animals.length) return null;

        return animals
          .map((animal) => {
            const animalRecords = data.filter((r) => r.animalId === animal.id);
            const scheduled = animalRecords.filter(
              (r) => r.status !== "PRN",
            ).length;
            const completed = animalRecords.filter(
              (r) =>
                r.status === "ON_TIME" ||
                r.status === "LATE" ||
                r.status === "VERY_LATE",
            ).length;
            const complianceRate =
              scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;

            return {
              id: animal.id,
              name: animal.name,
              species: animal.species,
              avatar: animal.avatar,
              scheduled,
              completed,
              complianceRate,
            };
          })
          .sort((a, b) => b.complianceRate - a.complianceRate);
      },
    },
  );
}

// Hook for inventory metrics
export function useInventoryMetrics() {
  const { selectedHousehold } = useApp();

  return trpc.inventory.list.useQuery(
    {
      householdId: selectedHousehold?.id || "",
    },
    {
      enabled: !!selectedHousehold?.id,
      staleTime: 15 * 60 * 1000, // 15 minutes - inventory changes less frequently
      select: (data) => {
        if (!data) return null;

        const totalItems = data.length;
        const activeItems = data.filter((item) => item.inUse).length;
        const lowStockItems = data.filter((item) => {
          if (!item.inUse) return false;
          const remaining = item.unitsRemaining || 0;
          const total = item.unitsTotal || 1;
          return remaining / total <= 0.2; // 20% threshold
        }).length;
        const expiringSoonItems = data.filter((item) => {
          if (!item.expiresOn || !item.inUse) return false;
          const daysUntilExpiry = Math.ceil(
            (new Date(item.expiresOn).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          );
          return daysUntilExpiry <= 30; // 30 days threshold
        }).length;

        return {
          totalItems,
          activeItems,
          lowStockItems,
          expiringSoonItems,
          lowStockPercentage:
            activeItems > 0
              ? Math.round((lowStockItems / activeItems) * 100)
              : 0,
          rawData: data,
        };
      },
    },
  );
}

// Hook for upcoming doses (next 7 days)
export function useUpcomingDoses() {
  const { selectedHousehold } = useApp();

  // Calculate next 7 days range
  const _dateRange = useMemo(() => {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 7);
    return { from, to };
  }, []);

  return trpc.regimen.list.useQuery(
    {
      householdId: selectedHousehold?.id || "",
    },
    {
      enabled: !!selectedHousehold?.id,
      staleTime: 5 * 60 * 1000,
      select: (data) => {
        if (!data) return null;

        // Calculate upcoming doses for active regimens
        const upcomingDoses = data
          .filter((item) => item.regimen.active)
          .reduce(
            (acc, item) => {
              // Simplified calculation - in real app you'd calculate based on schedule
              const dailyDoses = item.regimen.timesLocal?.length || 1;
              const weeklyDoses = dailyDoses * 7;

              acc.push({
                regimenId: item.regimen.id,
                animalName: item.animal.name || "Unknown",
                medicationName: item.medication.genericName || "Unknown",
                dosesThisWeek: weeklyDoses,
                scheduleType: item.regimen.scheduleType,
              });

              return acc;
            },
            [] as Array<{
              regimenId: string;
              animalName: string;
              medicationName: string;
              dosesThisWeek: number;
              scheduleType: string;
            }>,
          );

        const totalUpcomingDoses = upcomingDoses.reduce(
          (sum, item) => sum + item.dosesThisWeek,
          0,
        );

        return {
          upcomingDoses,
          totalUpcomingDoses,
          activeRegimens: data.filter((item) => item.regimen.active).length,
        };
      },
    },
  );
}

// Hook for suggestions data
export function useSuggestionsData(limit = 5) {
  const { selectedHousehold } = useApp();

  return trpc.insights.getSuggestions.useQuery(
    {
      householdId: selectedHousehold?.id || "",
      limit,
    },
    {
      enabled: !!selectedHousehold?.id,
      staleTime: 10 * 60 * 1000, // 10 minutes
    },
  );
}

// Hook for compliance heatmap data
export function useComplianceHeatmapData(
  dateRange: DateRange,
  animalId?: string,
  regimenId?: string,
) {
  const { selectedHousehold } = useApp();

  return trpc.insights.getComplianceHeatmap.useQuery(
    {
      householdId: selectedHousehold?.id || "",
      animalId,
      regimenId,
      range: {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      },
    },
    {
      enabled: !!selectedHousehold?.id,
      staleTime: 5 * 60 * 1000,
    },
  );
}

// Utility hook to refresh all dashboard data
export function useDashboardRefresh() {
  const utils = trpc.useUtils();

  return useCallback(() => {
    // Invalidate all related queries
    utils.admin.list.invalidate();
    utils.regimen.list.invalidate();
    utils.inventory.list.invalidate();
    utils.insights.getSuggestions.invalidate();
    utils.insights.getComplianceHeatmap.invalidate();
  }, [utils]);
}
