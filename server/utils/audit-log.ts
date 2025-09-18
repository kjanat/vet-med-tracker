import { auditLog } from "@/db/schema";

// Audit logging helper
export const createAuditLog = async (
  db: typeof import("@/db/drizzle").db,
  {
    userId,
    householdId,
    action,
    resourceType,
    tableName,
    resourceId,
    recordId,
    oldValues,
    newValues,
    details,
    ipAddress,
    userAgent,
    sessionId,
  }: {
    userId: string;
    householdId: string;
    action: string;
    resourceType?: string;
    tableName?: string;
    resourceId?: string;
    recordId?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  },
) => {
  try {
    await db.insert(auditLog).values({
      action,
      details: details || null,
      householdId,
      ipAddress: ipAddress || null,
      newValues: newValues || null,
      oldValues: oldValues || null,
      resourceId: resourceId || recordId || null,
      resourceType: resourceType || tableName || "unknown",
      sessionId: sessionId || null,
      userAgent: userAgent || null,
      userId,
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - audit logging should not break the main operation
  }
};
