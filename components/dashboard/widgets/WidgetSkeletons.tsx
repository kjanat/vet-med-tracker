"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface WidgetSkeletonProps {
  title?: string;
  description?: string;
  className?: string;
}

// Base skeleton for all widgets
export function BaseWidgetSkeleton({
  title = "Loading...",
  description,
  className,
  children,
}: WidgetSkeletonProps & { children?: React.ReactNode }) {
  return (
    <Card className={className}>
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center justify-between">
          <span className="font-medium text-lg">{title}</span>
          <Skeleton className="h-4 w-4 rounded" />
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// Chart skeleton with loading animation
export function ChartWidgetSkeleton({
  title,
  description,
  className,
}: WidgetSkeletonProps) {
  return (
    <BaseWidgetSkeleton
      title={title}
      description={description}
      className={className}
    >
      <div className="space-y-4">
        {/* Chart area */}
        <div className="relative h-64 w-full overflow-hidden rounded-lg bg-muted">
          <div className="-translate-x-full absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          {/* Mock chart bars */}
          <div className="flex h-full items-end justify-around p-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton
                key={i}
                className="w-8 bg-muted-foreground/20"
                style={{ height: `${((i * 13) % 60) + 20}%` }}
              />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </BaseWidgetSkeleton>
  );
}

// Metric card skeleton (for KPI widgets)
export function MetricWidgetSkeleton({
  title,
  description,
  className,
}: WidgetSkeletonProps) {
  return (
    <BaseWidgetSkeleton
      title={title}
      description={description}
      className={className}
    >
      <div className="space-y-4">
        {/* Main metric */}
        <div className="text-center">
          <Skeleton className="mx-auto h-12 w-20 rounded-lg" />
          <Skeleton className="mx-auto mt-2 h-4 w-32" />
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="mx-auto h-6 w-12" />
              <Skeleton className="mx-auto mt-1 h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </BaseWidgetSkeleton>
  );
}

// List widget skeleton (for leaderboards, activity feeds)
export function ListWidgetSkeleton({
  title,
  description,
  className,
}: WidgetSkeletonProps) {
  return (
    <BaseWidgetSkeleton
      title={title}
      description={description}
      className={className}
    >
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border p-3"
          >
            {/* Avatar/Icon */}
            <Skeleton className="h-8 w-8 rounded-full" />

            {/* Content */}
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>

            {/* Status/Badge */}
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
        ))}
      </div>
    </BaseWidgetSkeleton>
  );
}

// Heatmap skeleton
export function HeatmapWidgetSkeleton({
  title,
  description,
  className,
}: WidgetSkeletonProps) {
  return (
    <BaseWidgetSkeleton
      title={title}
      description={description}
      className={className}
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-md" />
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="space-y-2">
          {/* Hour labels */}
          <div className="grid grid-cols-25 gap-1 text-xs">
            <div className="w-10" />
            {/* Empty corner */}
            {Array.from({ length: 24 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-4" />
            ))}
          </div>

          {/* Days */}
          {Array.from({ length: 7 }).map((_, day) => (
            <div key={day} className="grid grid-cols-25 gap-1">
              <Skeleton className="h-4 w-8" />
              {Array.from({ length: 24 }).map((_, hour) => (
                <Skeleton
                  key={hour}
                  className="aspect-square w-full rounded"
                  style={{
                    opacity: Math.random() * 0.5 + 0.2,
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-1">
                <Skeleton className="h-3 w-3 rounded" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </BaseWidgetSkeleton>
  );
}

// Calendar skeleton
export function CalendarWidgetSkeleton({
  title,
  description,
  className,
}: WidgetSkeletonProps) {
  return (
    <BaseWidgetSkeleton
      title={title}
      description={description}
      className={className}
    >
      <div className="space-y-4">
        {/* Calendar header */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded" />
          ))}

          {/* Calendar days */}
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square">
              <Skeleton
                className="h-full w-full rounded"
                style={{
                  opacity: i < 7 || i > 28 ? 0.3 : 0.6 + Math.random() * 0.4,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </BaseWidgetSkeleton>
  );
}

// Gauge/Progress widget skeleton
export function GaugeWidgetSkeleton({
  title,
  description,
  className,
}: WidgetSkeletonProps) {
  return (
    <BaseWidgetSkeleton
      title={title}
      description={description}
      className={className}
    >
      <div className="space-y-4">
        {/* Gauge circle */}
        <div className="relative mx-auto h-32 w-32">
          <Skeleton className="h-full w-full rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Skeleton className="mx-auto h-6 w-12" />
              <Skeleton className="mx-auto mt-1 h-3 w-8" />
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="mx-auto h-4 w-8" />
              <Skeleton className="mx-auto mt-1 h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    </BaseWidgetSkeleton>
  );
}

// Suggestions/Actions widget skeleton
export function SuggestionsWidgetSkeleton({
  title,
  description,
  className,
}: WidgetSkeletonProps) {
  return (
    <BaseWidgetSkeleton
      title={title}
      description={description}
      className={className}
    >
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>

            {/* Content */}
            <div className="mt-2 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>

            {/* Actions */}
            <div className="mt-3 flex gap-2">
              <Skeleton className="h-8 w-16 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </BaseWidgetSkeleton>
  );
}

// Export all skeletons for easy import
export const WidgetSkeletons = {
  Base: BaseWidgetSkeleton,
  Chart: ChartWidgetSkeleton,
  Metric: MetricWidgetSkeleton,
  List: ListWidgetSkeleton,
  Heatmap: HeatmapWidgetSkeleton,
  Calendar: CalendarWidgetSkeleton,
  Gauge: GaugeWidgetSkeleton,
  Suggestions: SuggestionsWidgetSkeleton,
};
