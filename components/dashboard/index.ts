// Main dashboard components
export { DashboardLayout, type DashboardWidget } from "./DashboardLayout";
export { ReportingDashboard } from "./ReportingDashboard";
export {
	DateRangeSelector,
	QuickDatePresets,
	CompactDateDisplay,
} from "./DateRangeSelector";

// Widget components
export { ComplianceRateWidget } from "./widgets/ComplianceRateWidget";
export { AdministrationTimelineWidget } from "./widgets/AdministrationTimelineWidget";
export { MedicationDistributionWidget } from "./widgets/MedicationDistributionWidget";
export { AnimalActivityWidget } from "./widgets/AnimalActivityWidget";
export { InventoryLevelsWidget } from "./widgets/InventoryLevelsWidget";
export { UpcomingDosesWidget } from "./widgets/UpcomingDosesWidget";

// Widget utilities
export {
	WidgetErrorBoundary,
	useWidgetError,
	withWidgetErrorBoundary,
} from "./widgets/WidgetErrorBoundary";
export { WidgetSkeletons } from "./widgets/WidgetSkeletons";

// Dashboard data hooks
export {
	useComplianceData,
	useAdministrationStats,
	useMedicationDistribution,
	useAnimalActivityData,
	useInventoryMetrics,
	useUpcomingDoses,
	useSuggestionsData,
	useComplianceHeatmapData,
	useDashboardRefresh,
	getDateRangeFromPeriod,
	PERIOD_OPTIONS,
	type DateRange,
	type Period,
} from "@/hooks/dashboard/useDashboardData";
