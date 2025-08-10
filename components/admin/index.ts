/**
 * Admin Components - Export Index
 *
 * Centralized exports for all administration-related components.
 */

// Bulk Recording Components
export { BulkRecordingForm } from "./bulk-recording-form";
export { BulkAdminActions } from "./bulk-admin-actions";
export { BulkRecordingDemo } from "./bulk-recording-demo";

// Hooks
export { useBulkRecording } from "@/hooks/admin/use-bulk-recording";

/**
 * Usage Examples:
 *
 * // Complete bulk recording solution
 * import { BulkRecordingForm, BulkAdminActions, useBulkRecording } from "@/components/admin";
 *
 * // Demo and testing
 * import { BulkRecordingDemo } from "@/components/admin";
 */
