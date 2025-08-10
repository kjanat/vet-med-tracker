/**
 * Bulk Selection System - Export Index
 *
 * Centralized exports for all bulk selection components and utilities.
 */

// Core Context Provider
export {
	BulkSelectionProvider,
	useBulkSelection,
} from "@/components/providers/bulk-selection-provider";

// Individual Components
export { BulkSelectionCheckbox } from "@/components/ui/bulk-selection-checkbox";
// Complete Table Solution
export {
	type BulkSelectionColumn,
	BulkSelectionTable,
} from "@/components/ui/bulk-selection-table";
export { FloatingActionBar } from "@/components/ui/floating-action-bar";
export { SelectAllCheckbox } from "@/components/ui/select-all-checkbox";

// Integration Helpers
export { useBulkSelectionIntegration } from "@/hooks/shared/use-bulk-selection-integration";

// Re-export common types for convenience
export type BulkSelectionAction = {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	onClick: (selectedIds: string[]) => void;
	variant?:
		| "default"
		| "destructive"
		| "outline"
		| "secondary"
		| "ghost"
		| "link";
};

/**
 * Usage Examples:
 *
 * // Complete solution
 * import { BulkSelectionTable, BulkSelectionProvider } from "@/components/ui/bulk-selection";
 *
 * // Individual components
 * import {
 *   BulkSelectionCheckbox,
 *   SelectAllCheckbox,
 *   FloatingActionBar,
 *   useBulkSelection
 * } from "@/components/ui/bulk-selection";
 *
 * // Integration helper
 * import { useBulkSelectionIntegration } from "@/components/ui/bulk-selection";
 */
