import { z } from "zod";

// Schema for audit log entry
export const auditEntrySchema = z.object({
  action: z.string(),
  details: z.unknown().nullable(),
  id: z.uuid(),
  ipAddress: z.string().nullable(),
  resourceId: z.uuid().nullable(),
  resourceType: z.string(),
  sessionId: z.string().nullable(),
  timestamp: z.date(),
  userAgent: z.string().nullable(),
  userEmail: z.string(),
  userId: z.uuid(),
  userName: z.string().nullable(),
});

// Schema for audit log filters
export const auditFiltersSchema = z.object({
  action: z.string().optional(),
  endDate: z.iso.datetime().optional(),
  resourceType: z.string().optional(),
  search: z.string().optional(),
  startDate: z.iso.datetime().optional(),
  userId: z.uuid().optional(),
});

export type AuditEntry = z.infer<typeof auditEntrySchema>;
export type AuditFilters = z.infer<typeof auditFiltersSchema>;
