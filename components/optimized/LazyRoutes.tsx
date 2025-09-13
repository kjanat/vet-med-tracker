"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Page loading skeletons
const PageSkeleton = () => (
  <div className="container mx-auto space-y-6 p-4">
    <div className="space-y-2">
      <Skeleton className="h-8 w-[300px]" />
      <Skeleton className="h-4 w-[200px]" />
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Skeleton className="h-[200px]" />
      <Skeleton className="h-[200px]" />
      <Skeleton className="h-[200px]" />
    </div>
  </div>
);

const FormPageSkeleton = () => (
  <div className="container mx-auto space-y-4 p-4">
    <Skeleton className="h-8 w-[250px]" />
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-10 w-[120px]" />
    </div>
  </div>
);

// Route-based dynamic imports
export const LazyReportsPage = dynamic(
  () => import("@/app/(main)/auth/reports/page"),
  {
    loading: () => <PageSkeleton />,
    ssr: false,
  },
);

export const LazyInsightsPage = dynamic(
  () => import("@/app/(main)/auth/insights/page"),
  {
    loading: () => <PageSkeleton />,
    ssr: false,
  },
);

export const LazyDosageCalculatorPage = dynamic(
  () => import("@/app/(main)/auth/medications/dosage-calculator/page"),
  {
    loading: () => <FormPageSkeleton />,
    ssr: false,
  },
);

export const LazyInventoryPage = dynamic(
  () => import("@/app/(main)/auth/medications/inventory/page"),
  {
    loading: () => <PageSkeleton />,
    ssr: false,
  },
);

export const LazyAdminRecordPage = dynamic(
  () => import("@/app/(main)/auth/admin/record/page"),
  {
    loading: () => <FormPageSkeleton />,
    ssr: false,
  },
);

export const LazyCoSignPage = dynamic(
  () => import("@/app/(main)/auth/cosign/page"),
  {
    loading: () => <FormPageSkeleton />,
    ssr: false,
  },
);

export const LazyAnimalEmergencyPage = dynamic(
  () => import("@/app/(main)/auth/manage/animals/[id]/emergency/page"),
  {
    loading: () => <FormPageSkeleton />,
    ssr: false,
  },
);

export const LazyAnimalReportPage = dynamic(
  () => import("@/app/(main)/auth/reports/animal/[id]/page"),
  {
    loading: () => <PageSkeleton />,
    ssr: false,
  },
);

// Heavy settings pages
export const LazyDataPrivacyAuditPage = dynamic(
  () => import("@/app/(main)/auth/settings/data-privacy/audit/page"),
  {
    loading: () => <PageSkeleton />,
    ssr: false,
  },
);

// Profile and user management
export const LazyProfilePage = dynamic(
  () => import("@/app/(main)/auth/profile/page"),
  {
    loading: () => <FormPageSkeleton />,
    ssr: false,
  },
);
