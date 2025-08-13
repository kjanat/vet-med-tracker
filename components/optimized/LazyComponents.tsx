"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Loading fallbacks
const ChartSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-4 w-[200px]" />
      <Skeleton className="h-3 w-[150px]" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-[200px] w-full" />
    </CardContent>
  </Card>
);

const DashboardSkeleton = () => (
  <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <ChartSkeleton />
      <ChartSkeleton />
      <ChartSkeleton />
    </div>
  </div>
);

const PhotoUploaderSkeleton = () => (
  <Skeleton className="h-32 w-full rounded-lg" />
);

const BulkFormSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-10 w-[120px]" />
  </div>
);

// Dynamic imports with loading states
export const LazyReportingDashboard = dynamic(
  () => import("@/components/dashboard/ReportingDashboard"),
  {
    loading: () => <DashboardSkeleton />,
    ssr: false, // Charts don't work well with SSR
  },
);

export const LazyComplianceHeatmap = dynamic(
  () =>
    import("@/components/insights/compliance-heatmap").then((mod) => ({
      default: mod.ComplianceHeatmap,
    })),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  },
);

export const LazyMedicationDistributionWidget = dynamic(
  () =>
    import("@/components/dashboard/widgets/MedicationDistributionWidget").then(
      (mod) => ({ default: mod.MedicationDistributionWidget }),
    ),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  },
);

export const LazyAdministrationTimelineWidget = dynamic(
  () =>
    import("@/components/dashboard/widgets/AdministrationTimelineWidget").then(
      (mod) => ({ default: mod.AdministrationTimelineWidget }),
    ),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  },
);

export const LazyComplianceRateWidget = dynamic(
  () =>
    import("@/components/dashboard/widgets/ComplianceRateWidget").then(
      (mod) => ({ default: mod.ComplianceRateWidget }),
    ),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  },
);

export const LazyInventoryLevelsWidget = dynamic(
  () =>
    import("@/components/dashboard/widgets/InventoryLevelsWidget").then(
      (mod) => ({ default: mod.InventoryLevelsWidget }),
    ),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  },
);

export const LazyAnimalActivityWidget = dynamic(
  () =>
    import("@/components/dashboard/widgets/AnimalActivityWidget").then(
      (mod) => ({ default: mod.AnimalActivityWidget }),
    ),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  },
);

export const LazyPhotoUploader = dynamic(
  () =>
    import("@/components/ui/photo-uploader").then((mod) => ({
      default: mod.PhotoUploader,
    })),
  {
    loading: () => <PhotoUploaderSkeleton />,
    ssr: false, // Camera/file upload doesn't work with SSR
  },
);

export const LazyBulkRecordingForm = dynamic(
  () => import("@/components/admin/bulk-recording-form"),
  {
    loading: () => <BulkFormSkeleton />,
    ssr: false,
  },
);

export const LazyDosageCalculator = dynamic(
  () =>
    import("@/components/dosage-calculator").then((mod) => ({
      default: mod.DosageCalculator,
    })),
  {
    loading: () => (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[150px]" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    ),
    ssr: false,
  },
);

// Calendar and date components that exist
export const LazyCalendar = dynamic(() => import("@/components/ui/calendar"), {
  loading: () => <Skeleton className="h-64 w-full" />,
  ssr: false,
});

// Heavy form components that exist
export const LazyCommandDialog = dynamic(
  () => import("@/components/ui/command"),
  {
    loading: () => <Skeleton className="h-32 w-full" />,
    ssr: false,
  },
);
