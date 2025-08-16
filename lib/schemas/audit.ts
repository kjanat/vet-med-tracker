import { z } from "zod";

// Schema for audit log entry
export const auditEntrySchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  userName: z.string().nullable(),
  userEmail: z.string(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.uuid().nullable(),
  details: z.unknown().nullable(),
  timestamp: z.string(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  sessionId: z.string().nullable(),
});

// Schema for audit log filters
export const auditFiltersSchema = z.object({
  action: z.string().optional(),
  resourceType: z.string().optional(),
  userId: z.uuid().optional(),
  search: z.string().optional(),
  startDate: z.iso.datetime().optional(),
  endDate: z.iso.datetime().optional(),
});

export type AuditEntry = z.infer<typeof auditEntrySchema>;
export type AuditFilters = z.infer<typeof auditFiltersSchema>;
