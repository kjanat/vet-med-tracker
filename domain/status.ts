// domain/status.ts
import { ADMIN_STATUS, type AdminStatus } from "./admin.types";

export function deriveStatus(
  adminMinutes: number,
  scheduledMinutes: number | null,
  cutoffMinutes: number,
  provided?: AdminStatus,
  scheduleType?: "PRN" | "FIXED" | string,
): AdminStatus {
  if (provided) return provided;
  if (scheduleType === "PRN" || !scheduledMinutes) return "PRN";

  const diff = adminMinutes - scheduledMinutes;
  if (diff <= ADMIN_STATUS.ON_TIME) return "ON_TIME";
  if (diff <= ADMIN_STATUS.LATE) return "LATE";
  if (diff <= cutoffMinutes) return "VERY_LATE";
  return "VERY_LATE"; // beyond cutoff should be auto-missed upstream
}
