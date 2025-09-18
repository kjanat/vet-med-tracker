/**
 * Centralized status configuration for consistent theming
 * Ensures all status indicators use the same colors and patterns
 */

export const STATUS_CONFIGS = {
  high: {
    badge: "default",
    bg: "bg-primary/10",
    border: "border-primary/20",
    icon: "text-primary",
    ring: "ring-primary/20",
    text: "text-primary-foreground",
  },
  normal: {
    badge: "secondary",
    bg: "bg-secondary/10",
    border: "border-secondary/20",
    icon: "text-secondary-foreground",
    ring: "ring-secondary/20",
    text: "text-secondary-foreground",
  },
  prn: {
    badge: "info",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "text-blue-600",
    ring: "ring-blue-200",
    text: "text-blue-700",
  },
  success: {
    badge: "success",
    bg: "bg-green-50",
    border: "border-green-200",
    icon: "text-green-600",
    ring: "ring-green-200",
    text: "text-green-700",
  },
  urgent: {
    badge: "destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/20",
    icon: "text-destructive",
    ring: "ring-destructive/20",
    text: "text-destructive-foreground",
  },
} as const;

export type StatusType = keyof typeof STATUS_CONFIGS;

/**
 * Get status configuration by type
 */
export function getStatusConfig(type: StatusType) {
  return STATUS_CONFIGS[type];
}

/**
 * Map medication states to status types
 */
export function getMedicationStatus(regimen: {
  isPRN: boolean;
  isOverdue?: boolean;
  section: "due" | "later" | "prn";
}): StatusType {
  if (regimen.isPRN) return "prn";
  if (regimen.isOverdue) return "urgent";
  if (regimen.section === "due") return "high";
  return "normal";
}
