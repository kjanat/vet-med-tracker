/**
 * Standardized toast message helpers for consistent UX
 */

import { toast } from "sonner";

/**
 * Show standardized error toast message
 * @param action - The action that failed (e.g., "save", "delete", "load")
 * @param resource - The resource being acted upon (e.g., "animal", "medication")
 * @param customMessage - Optional custom error message
 */
export function showErrorToast(
  action: string,
  resource?: string,
  customMessage?: string,
): void {
  const message =
    customMessage ||
    `Failed to ${action}${resource ? ` ${resource}` : ""}. Please try again.`;

  toast.error(message);
}

/**
 * Show standardized success toast message
 * @param action - The action that succeeded (e.g., "saved", "deleted", "loaded")
 * @param resource - The resource being acted upon (e.g., "animal", "medication")
 * @param customMessage - Optional custom success message
 */
export function showSuccessToast(
  action: string,
  resource?: string,
  customMessage?: string,
): void {
  const message =
    customMessage ||
    `${resource ? `${resource.charAt(0).toUpperCase() + resource.slice(1)} ` : ""}${action} successfully.`;

  toast.success(message);
}
/**
 * Common error messages for frequent operations
 */
export const CommonErrors = {
  NETWORK: "Network error. Please check your connection and try again.",
  NOT_FOUND: "The requested item could not be found.",
  SERVER: "Server error. Please try again later.",
  UNAUTHORIZED: "You don't have permission to perform this action.",
  VALIDATION: "Please check your input and try again.",
} as const;
