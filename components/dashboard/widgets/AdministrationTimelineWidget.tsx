"use client";

import { format } from "date-fns";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  type Period,
  useAdministrationStats,
} from "@/hooks/dashboard/useDashboardData";
import { WidgetErrorBoundary } from "./WidgetErrorBoundary";
import { WidgetSkeletons } from "./WidgetSkeletons";

interface AdministrationTimelineWidgetProps {
  period: Period;
  isFullscreen?: boolean;
  className?: string;
}

const chartConfig = {
  late: {
    color: "hsl(var(--chart-2))",
    label: "Late",
  },
  missed: {
    color: "hsl(var(--chart-3))",
    label: "Missed",
  },
  onTime: {
    color: "hsl(var(--chart-1))",
    label: "On Time",
  },
} satisfies ChartConfig;

function AdministrationTimelineWidgetContent({
  period,
  isFullscreen = false,
}: AdministrationTimelineWidgetProps) {
  const {
    data: timelineData,
    isLoading,
    error,
  } = useAdministrationStats(period);

  // Process data for better visualization
  const chartData = useMemo(() => {
    if (!timelineData) return [];

    return timelineData.map((day) => ({
      ...day,
      dateFormatted: format(new Date(day.date), "MMM d"),
    }));
  }, [timelineData]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!timelineData) return null;

    return timelineData.reduce(
      (acc, day) => {
        const dayTotal = day.total ?? day.onTime + day.late + day.missed;
        return {
          activeDays: acc.activeDays + (dayTotal > 0 ? 1 : 0),
          totalDoses: acc.totalDoses + dayTotal,
          totalLate: acc.totalLate + day.late,
          totalMissed: acc.totalMissed + day.missed,
          totalOnTime: acc.totalOnTime + day.onTime,
        };
      },
      {
        activeDays: 0,
        totalDoses: 0,
        totalLate: 0,
        totalMissed: 0,
        totalOnTime: 0,
      },
    );
  }, [timelineData]);

  if (isLoading) {
    return <WidgetSkeletons.Chart title="Administration Timeline" />;
  }

  if (error || !timelineData) {
    throw new Error(error?.message || "Failed to load administration timeline");
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      {summaryStats && (
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950/20">
            <div className="font-bold text-green-600 text-xl">
              {summaryStats.totalOnTime}
            </div>
            <p className="text-muted-foreground text-sm">On Time</p>
          </div>
          <div className="rounded-lg bg-orange-50 p-3 dark:bg-orange-950/20">
            <div className="font-bold text-orange-600 text-xl">
              {summaryStats.totalLate}
            </div>
            <p className="text-muted-foreground text-sm">Late</p>
          </div>
          <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/20">
            <div className="font-bold text-red-600 text-xl">
              {summaryStats.totalMissed}
            </div>
            <p className="text-muted-foreground text-sm">Missed</p>
          </div>
        </div>
      )}

      {/* Timeline Chart */}
      <div className={isFullscreen ? "h-96" : "h-64"}>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer height="100%" width="100%">
            <BarChart
              data={chartData}
              margin={{ bottom: 5, left: 5, right: 5, top: 5 }}
            >
              <XAxis
                axisLine={false}
                dataKey="dateFormatted"
                fontSize={12}
                tickLine={false}
              />
              <YAxis axisLine={false} fontSize={12} tickLine={false} />
              <Tooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="onTime"
                fill="var(--color-onTime)"
                radius={[0, 0, 0, 0]}
                stackId="doses"
              />
              <Bar
                dataKey="late"
                fill="var(--color-late)"
                radius={[0, 0, 0, 0]}
                stackId="doses"
              />
              <Bar
                dataKey="missed"
                fill="var(--color-missed)"
                radius={[2, 2, 0, 0]}
                stackId="doses"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Period Summary */}
      {summaryStats && (
        <div className="rounded-lg bg-muted/30 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {period.label} • {summaryStats.activeDays} active days
            </span>
            <span className="font-medium">
              {summaryStats.totalDoses > 0
                ? `${Math.round((summaryStats.totalOnTime / summaryStats.totalDoses) * 100)}% on time`
                : "No doses recorded"}
            </span>
          </div>
          {summaryStats.totalDoses > 0 && (
            <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="bg-green-500"
                style={{
                  width: `${(summaryStats.totalOnTime / summaryStats.totalDoses) * 100}%`,
                }}
              />
              <div
                className="bg-orange-500"
                style={{
                  width: `${(summaryStats.totalLate / summaryStats.totalDoses) * 100}%`,
                }}
              />
              <div
                className="bg-red-500"
                style={{
                  width: `${(summaryStats.totalMissed / summaryStats.totalDoses) * 100}%`,
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AdministrationTimelineWidget(
  props: AdministrationTimelineWidgetProps,
) {
  return (
    <WidgetErrorBoundary widgetName="Administration Timeline">
      <AdministrationTimelineWidgetContent {...props} />
    </WidgetErrorBoundary>
  );
}
