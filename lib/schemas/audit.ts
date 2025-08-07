import { z } from "zod";

// Schema for audit log entry
export const auditEntrySchema = z.object({
	id: z.string().uuid(),
	userId: z.string().uuid(),
	userName: z.string().nullable(),
	userEmail: z.string(),
	action: z.string(),
	resourceType: z.string(),
	resourceId: z.string().uuid().nullable(),
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
	userId: z.string().uuid().optional(),
	search: z.string().optional(),
	startDate: z.string().datetime().optional(),
	endDate: z.string().datetime().optional(),
});

export type AuditEntry = z.infer<typeof auditEntrySchema>;
export type AuditFilters = z.infer<typeof auditFiltersSchema>;
