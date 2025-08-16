/**
 * Admin Components - Export Index
 *
 * Centralized exports for all administration-related components.
 */

// Hooks
export { useBulkRecording } from "@/hooks/admin/use-bulk-recording";
export { BulkAdminActions } from "./bulk-admin-actions";
export { BulkRecordingDemo } from "./bulk-recording-demo";
// Bulk Recording Components
export { BulkRecordingForm } from "./bulk-recording-form";

/**
 * Usage Examples:
 *
 * // Complete bulk recording solution
 * import { BulkRecordingForm, BulkAdminActions, useBulkRecording } from "@/components/admin";
 *
 * // Demo and testing
 * import { BulkRecordingDemo } from "@/components/admin";
 */
