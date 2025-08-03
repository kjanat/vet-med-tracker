// Audit logging helper - TODO: Implement when audit_log table is added
export const createAuditLog = async (
	_db: typeof import("@/db/drizzle").db,
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
	},
) => {
	// TODO: Implement audit logging when audit_log table is added to schema
	console.log("Audit log:", {
		userId,
		householdId,
		action,
		resourceType: resourceType || tableName,
		resourceId: resourceId || recordId,
		oldValues,
		newValues,
		details,
		timestamp: new Date().toISOString(),
	});
};
