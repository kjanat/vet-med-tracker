/**
 * Centralized status configuration for consistent theming
 * Ensures all status indicators use the same colors and patterns
 */

export const STATUS_CONFIGS = {
  urgent: {
    badge: "destructive",
    text: "text-destructive-foreground",
    bg: "bg-destructive/10",
    border: "border-destructive/20",
    icon: "text-destructive",
    ring: "ring-destructive/20",
  },
  high: {
    badge: "default",
    text: "text-primary-foreground",
    bg: "bg-primary/10",
    border: "border-primary/20",
    icon: "text-primary",
    ring: "ring-primary/20",
  },
  normal: {
    badge: "secondary",
    text: "text-secondary-foreground",
    bg: "bg-secondary/10",
    border: "border-secondary/20",
    icon: "text-secondary-foreground",
    ring: "ring-secondary/20",
  },
  success: {
    badge: "success",
    text: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
    icon: "text-green-600",
    ring: "ring-green-200",
  },
  prn: {
    badge: "info",
    text: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "text-blue-600",
    ring: "ring-blue-200",
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
