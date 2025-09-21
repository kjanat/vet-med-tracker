/**
 * Lazy Component Loaders
 * Performance Optimization - Wave 2B
 *
 * Implements dynamic imports and code splitting for large components
 * to reduce initial bundle size and improve Core Web Vitals
 */

import dynamic from "next/dynamic";
import { Suspense } from "react";

// Loading fallback components
export const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

export const LoadingCard = () => (
  <div className="animate-pulse rounded-lg border bg-card p-4">
    <div className="space-y-3">
      <div className="h-4 w-1/3 rounded bg-muted" />
      <div className="h-3 w-full rounded bg-muted" />
      <div className="h-3 w-2/3 rounded bg-muted" />
    </div>
  </div>
);

export const LoadingForm = () => (
  <div className="space-y-4">
    <div className="animate-pulse space-y-3">
      <div className="h-4 w-1/4 rounded bg-muted" />
      <div className="h-10 w-full rounded bg-muted" />
      <div className="h-4 w-1/4 rounded bg-muted" />
      <div className="h-10 w-full rounded bg-muted" />
      <div className="h-10 w-1/3 rounded bg-muted" />
    </div>
  </div>
);

export const LoadingTable = () => (
  <div className="space-y-3">
    <div className="animate-pulse">
      <div className="h-10 w-full rounded bg-muted" />
      {["a", "b", "c", "d", "e"].map((id) => (
        <div
          className="mt-2 h-8 w-full rounded bg-muted/50"
          key={`skeleton-${id}`}
        />
      ))}
    </div>
  </div>
);

// =============================================================================
// ADMIN COMPONENTS
// =============================================================================

export const LazyBulkRecordingForm = dynamic(
  () =>
    import("@/components/admin/bulk-recording-form").then((mod) => ({
      default: mod.BulkRecordingForm,
    })),
  {
    loading: () => <LoadingForm />,
    ssr: false,
  },
);

export const LazyBulkRecordingDemo = dynamic(
  () =>
    import("@/components/admin/bulk-recording-demo").then((mod) => ({
      default: mod.BulkRecordingDemo,
    })),
  {
    loading: () => <LoadingCard />,
    ssr: false,
  },
);

// =============================================================================
// DOSAGE COMPONENTS
// =============================================================================

export const LazyDosageCalculator = dynamic(
  () => import("@/components/medication/dosage-calculator"),
  {
    loading: () => <LoadingForm />,
    ssr: false,
  },
);

// =============================================================================
// REGIMEN COMPONENTS
// =============================================================================

export const LazyRegimenForm = dynamic(
  () =>
    import("@/components/regimens/regimen-form").then((mod) => ({
      default: mod.RegimenForm,
    })),
  {
    loading: () => <LoadingForm />,
    ssr: false,
  },
);

export const LazyRegimenList = dynamic(
  () =>
    import("@/components/regimens/regimen-list").then((mod) => ({
      default: mod.RegimenList,
    })),
  {
    loading: () => <LoadingTable />,
    ssr: false,
  },
);

// =============================================================================
// MEDICATION COMPONENTS
// =============================================================================

export const LazyHybridMedicationInput = dynamic(
  () =>
    import("@/components/medication/hybrid-medication-input").then((mod) => ({
      default: mod.HybridMedicationInput,
    })),
  {
    loading: () => <LoadingForm />,
    ssr: false,
  },
);

// =============================================================================
// SETTINGS COMPONENTS
// =============================================================================

export const LazyAnimalList = dynamic(
  () =>
    import("@/components/settings/animals/animal-list").then((mod) => ({
      default: mod.AnimalList,
    })),
  {
    loading: () => <LoadingTable />,
    ssr: false,
  },
);

export const LazyBulkAnimalTable = dynamic(
  () =>
    import("@/components/settings/animals/bulk-animal-table").then((mod) => ({
      default: mod.BulkAnimalTable,
    })),
  {
    loading: () => <LoadingTable />,
    ssr: false,
  },
);

export const LazyPrefsPanel = dynamic(
  () =>
    import("@/components/settings/preferences/prefs-panel").then((mod) => ({
      default: mod.PrefsPanel,
    })),
  {
    loading: () => <LoadingForm />,
    ssr: false,
  },
);

export const LazyDataPanel = dynamic(
  () =>
    import("@/components/settings/data/data-panel").then((mod) => ({
      default: mod.DataPanel,
    })),
  {
    loading: () => <LoadingCard />,
    ssr: false,
  },
);

// =============================================================================
// HOUSEHOLD COMPONENTS
// =============================================================================

export const LazyMemberList = dynamic(
  () =>
    import("@/components/household/member-list").then((mod) => ({
      default: mod.MemberList,
    })),
  {
    loading: () => <LoadingTable />,
    ssr: false,
  },
);

export const LazyHouseholdDialogs = dynamic(
  () => import("@/components/household/household-dialogs"),
  {
    loading: () => <LoadingCard />,
    ssr: false,
  },
);

// =============================================================================
// ONBOARDING COMPONENTS
// =============================================================================

export const LazyWelcomeFlow = dynamic(
  () =>
    import("@/components/onboarding/welcome-flow").then((mod) => ({
      default: mod.WelcomeFlow,
    })),
  {
    loading: () => <LoadingForm />,
    ssr: false,
  },
);

// =============================================================================
// CHART COMPONENTS (Heavy dependencies)
// =============================================================================

export const LazyChart = dynamic(
  () =>
    import("@/components/ui/chart").then((mod) => ({
      default: mod.ChartContainer,
    })),
  {
    loading: () => (
      <div className="h-[300px] w-full animate-pulse rounded-lg bg-muted" />
    ),
    ssr: false,
  },
);

// =============================================================================
// SPECIALIZED LAZY WRAPPERS
// =============================================================================

interface LazyComponentWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function LazyComponentWrapper({
  children,
  fallback = <LoadingSpinner />,
}: LazyComponentWrapperProps) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}

// HOC for creating lazy components with custom loading states
export function createLazyComponent<T = Record<string, unknown>>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  loadingComponent: () => React.ReactNode = LoadingSpinner,
  ssrEnabled = true,
) {
  return dynamic(importFn, {
    loading: loadingComponent,
    ssr: ssrEnabled,
  });
}

// Utility for preloading components
export const preloadComponent = {
  bulkRecording: () => import("@/components/admin/bulk-recording-form"),
  chart: () => import("@/components/ui/chart"),
  dosageCalculator: () => import("@/components/medication/dosage-calculator"),
  regimenForm: () => import("@/components/regimens/regimen-form"),
  welcomeFlow: () => import("@/components/onboarding/welcome-flow"),
};

// =============================================================================
// ROUTE-BASED LAZY LOADING
// =============================================================================

// Admin route components
export const LazyAdminRoute = dynamic(
  () => import("@/app/(main)/auth/admin/record/page"),
  {
    loading: () => <LoadingForm />,
    ssr: false,
  },
);

// Settings route components
export const LazySettingsRoute = dynamic(
  () => import("@/app/(main)/auth/settings/page"),
  {
    loading: () => <LoadingCard />,
    ssr: false,
  },
);

// Medication route components
export const LazyMedicationRoute = dynamic(
  () => import("@/app/(main)/auth/medications/dosage-calculator/page"),
  {
    loading: () => <LoadingForm />,
    ssr: false,
  },
);

// =============================================================================
// PERFORMANCE MONITORING
// =============================================================================

export interface LazyLoadMetrics {
  componentName: string;
  loadTime: number;
  isVisible: boolean;
  timestamp: number;
}

class LazyLoadMonitor {
  private metrics: LazyLoadMetrics[] = [];

  recordLoad(componentName: string, loadTime: number, isVisible: boolean) {
    this.metrics.push({
      componentName,
      isVisible,
      loadTime,
      timestamp: Date.now(),
    });

    // Keep only last 100 entries
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  getMetrics() {
    return this.metrics;
  }

  getAverageLoadTime(componentName?: string) {
    const filtered = componentName
      ? this.metrics.filter((m) => m.componentName === componentName)
      : this.metrics;

    if (filtered.length === 0) return 0;

    const totalTime = filtered.reduce((sum, m) => sum + m.loadTime, 0);
    return totalTime / filtered.length;
  }

  reset() {
    this.metrics = [];
  }
}

export const lazyLoadMonitor = new LazyLoadMonitor();
