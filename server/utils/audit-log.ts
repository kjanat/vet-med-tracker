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
      userId,
      householdId,
      action,
      resourceType: resourceType || tableName || "unknown",
      resourceId: resourceId || recordId || null,
      oldValues: oldValues || null,
      newValues: newValues || null,
      details: details || null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      sessionId: sessionId || null,
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - audit logging should not break the main operation
  }
};
