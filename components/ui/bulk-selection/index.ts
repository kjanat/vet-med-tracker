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
export { SelectAllCheckbox } from "@/components/ui/select-all-checkbox";
export { FloatingActionBar } from "@/components/ui/floating-action-bar";

// Complete Table Solution
export {
	BulkSelectionTable,
	type BulkSelectionColumn,
} from "@/components/ui/bulk-selection-table";

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
