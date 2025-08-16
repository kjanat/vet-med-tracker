// Main dashboard components

// Dashboard data hooks
export {
  type DateRange,
  getDateRangeFromPeriod,
  PERIOD_OPTIONS,
  type Period,
  useAdministrationStats,
  useAnimalActivityData,
  useComplianceData,
  useComplianceHeatmapData,
  useDashboardRefresh,
  useInventoryMetrics,
  useMedicationDistribution,
  useSuggestionsData,
  useUpcomingDoses,
} from "@/hooks/dashboard/useDashboardData";
export { DashboardLayout, type DashboardWidget } from "./DashboardLayout";
export {
  CompactDateDisplay,
  DateRangeSelector,
  QuickDatePresets,
} from "./DateRangeSelector";
export { ReportingDashboard } from "./ReportingDashboard";
export { AdministrationTimelineWidget } from "./widgets/AdministrationTimelineWidget";
export { AnimalActivityWidget } from "./widgets/AnimalActivityWidget";
// Widget components
export { ComplianceRateWidget } from "./widgets/ComplianceRateWidget";
export { InventoryLevelsWidget } from "./widgets/InventoryLevelsWidget";
export { MedicationDistributionWidget } from "./widgets/MedicationDistributionWidget";
export { UpcomingDosesWidget } from "./widgets/UpcomingDosesWidget";
// Widget utilities
export {
  useWidgetError,
  WidgetErrorBoundary,
  withWidgetErrorBoundary,
} from "./widgets/WidgetErrorBoundary";
export { WidgetSkeletons } from "./widgets/WidgetSkeletons";
