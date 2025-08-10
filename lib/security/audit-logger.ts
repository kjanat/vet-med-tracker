/**
 * Security Audit Logger
 * Comprehensive audit logging for security events and compliance
 */

export interface AuditEvent {
	// Event identification
	id: string;
	timestamp: string;
	type: "security" | "auth" | "data" | "admin" | "error";

	// Event details
	action: string;
	resource?: string;
	outcome: "success" | "failure" | "blocked";

	// User context
	userId?: string;
	sessionId?: string;
	userAgent?: string;

	// Network context
	clientIp?: string;
	country?: string;

	// Request context
	method?: string;
	path?: string;
	query?: Record<string, unknown>;

	// Security context
	riskScore?: number;
	threatIndicators?: string[];

	// Additional context
	metadata?: Record<string, unknown>;
	error?: string;

	// Compliance fields
	severity: "low" | "medium" | "high" | "critical";
	category: string;
}

export interface AuditLogger {
	log(event: Omit<AuditEvent, "id" | "timestamp">): Promise<void>;
	logAuth(action: string, context: AuthContext): Promise<void>;
	logDataAccess(action: string, context: DataAccessContext): Promise<void>;
	logSecurityEvent(action: string, context: SecurityContext): Promise<void>;
	query(filters: AuditQueryFilters): Promise<AuditEvent[]>;
}

export interface AuthContext {
	userId?: string;
	outcome: "success" | "failure" | "blocked";
	clientIp?: string;
	userAgent?: string;
	method?: string;
	metadata?: Record<string, unknown>;
}

export interface DataAccessContext {
	userId: string;
	resource: string;
	action: string;
	outcome: "success" | "failure" | "blocked";
	householdId?: string;
	animalId?: string;
	metadata?: Record<string, unknown>;
}

export interface SecurityContext {
	threatType: string;
	severity: "low" | "medium" | "high" | "critical";
	clientIp?: string;
	userId?: string;
	outcome: "detected" | "blocked" | "mitigated";
	details?: Record<string, unknown>;
}

export interface AuditQueryFilters {
	startDate?: Date;
	endDate?: Date;
	userId?: string;
	type?: string[];
	severity?: string[];
	outcome?: string[];
	limit?: number;
	offset?: number;
}

/**
 * Console-based audit logger for development and basic production use
 */
class ConsoleAuditLogger implements AuditLogger {
	private generateId(): string {
		return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	async log(event: Omit<AuditEvent, "id" | "timestamp">): Promise<void> {
		const auditEvent: AuditEvent = {
			id: this.generateId(),
			timestamp: new Date().toISOString(),
			...event,
		};

		// In production, this would go to a secure audit log system
		if (process.env.NODE_ENV === "production") {
			// Log to structured format for log aggregation systems
			console.log(
				JSON.stringify({
					service: "vetmed-tracker",
					level: "audit",
					event: auditEvent,
				}),
			);
		} else {
			// More readable format for development
			console.log(
				`[AUDIT] ${auditEvent.timestamp} - ${auditEvent.action} (${auditEvent.outcome})`,
				{
					id: auditEvent.id,
					type: auditEvent.type,
					severity: auditEvent.severity,
					userId: auditEvent.userId,
					clientIp: auditEvent.clientIp,
					metadata: auditEvent.metadata,
				},
			);
		}

		// In a production environment, you would also:
		// 1. Send to external audit logging service (e.g., AWS CloudTrail, Datadog)
		// 2. Store in immutable database
		// 3. Send alerts for high-severity events
		// 4. Implement log rotation and retention policies
	}

	async logAuth(action: string, context: AuthContext): Promise<void> {
		await this.log({
			type: "auth",
			action,
			outcome: context.outcome,
			userId: context.userId,
			clientIp: context.clientIp,
			userAgent: context.userAgent,
			method: context.method,
			severity: context.outcome === "failure" ? "medium" : "low",
			category: "authentication",
			metadata: context.metadata,
		});
	}

	async logDataAccess(
		action: string,
		context: DataAccessContext,
	): Promise<void> {
		await this.log({
			type: "data",
			action,
			resource: context.resource,
			outcome: context.outcome,
			userId: context.userId,
			severity: context.outcome === "failure" ? "medium" : "low",
			category: "data_access",
			metadata: {
				householdId: context.householdId,
				animalId: context.animalId,
				...context.metadata,
			},
		});
	}

	async logSecurityEvent(
		action: string,
		context: SecurityContext,
	): Promise<void> {
		await this.log({
			type: "security",
			action,
			outcome: context.outcome as any,
			userId: context.userId,
			clientIp: context.clientIp,
			severity: context.severity,
			category: "security_threat",
			threatIndicators: [context.threatType],
			metadata: context.details,
		});
	}

	async query(filters: AuditQueryFilters): Promise<AuditEvent[]> {
		// In a real implementation, this would query the audit database
		console.warn("Audit query not implemented in console logger");
		return [];
	}
}

// Global audit logger instance
export const auditLogger: AuditLogger = new ConsoleAuditLogger();

/**
 * Security event types and helpers
 */
export const SecurityEvents = {
	// Authentication events
	LOGIN_SUCCESS: "login_success",
	LOGIN_FAILURE: "login_failure",
	LOGOUT: "logout",
	SESSION_EXPIRED: "session_expired",
	ACCOUNT_LOCKED: "account_locked",

	// Authorization events
	ACCESS_DENIED: "access_denied",
	PRIVILEGE_ESCALATION_ATTEMPT: "privilege_escalation_attempt",
	UNAUTHORIZED_RESOURCE_ACCESS: "unauthorized_resource_access",

	// Data events
	DATA_CREATED: "data_created",
	DATA_READ: "data_read",
	DATA_UPDATED: "data_updated",
	DATA_DELETED: "data_deleted",
	DATA_EXPORTED: "data_exported",

	// Security threats
	RATE_LIMIT_EXCEEDED: "rate_limit_exceeded",
	SUSPICIOUS_ACTIVITY: "suspicious_activity",
	MALICIOUS_INPUT_DETECTED: "malicious_input_detected",
	SQL_INJECTION_ATTEMPT: "sql_injection_attempt",
	XSS_ATTEMPT: "xss_attempt",
	CSRF_ATTEMPT: "csrf_attempt",

	// System events
	SERVICE_STARTED: "service_started",
	SERVICE_STOPPED: "service_stopped",
	CONFIGURATION_CHANGED: "configuration_changed",
	ERROR_THRESHOLD_EXCEEDED: "error_threshold_exceeded",

	// Admin events
	USER_CREATED: "user_created",
	USER_UPDATED: "user_updated",
	USER_DELETED: "user_deleted",
	HOUSEHOLD_CREATED: "household_created",
	HOUSEHOLD_UPDATED: "household_updated",
	ROLE_CHANGED: "role_changed",
} as const;

/**
 * Helper functions for common audit scenarios
 */
export const auditHelpers = {
	// Log authentication events
	async logLogin(
		userId: string,
		clientIp: string,
		success: boolean,
		userAgent?: string,
	) {
		await auditLogger.logAuth(
			success ? SecurityEvents.LOGIN_SUCCESS : SecurityEvents.LOGIN_FAILURE,
			{
				userId,
				outcome: success ? "success" : "failure",
				clientIp,
				userAgent,
				method: "POST",
			},
		);
	},

	// Log data access events
	async logDataAccess(
		action: string,
		userId: string,
		resource: string,
		success: boolean,
		metadata?: Record<string, unknown>,
	) {
		await auditLogger.logDataAccess(action, {
			userId,
			resource,
			action,
			outcome: success ? "success" : "failure",
			metadata,
		});
	},

	// Log security threats
	async logThreat(
		threatType: string,
		severity: "low" | "medium" | "high" | "critical",
		clientIp?: string,
		userId?: string,
		details?: Record<string, unknown>,
	) {
		await auditLogger.logSecurityEvent(threatType, {
			threatType,
			severity,
			clientIp,
			userId,
			outcome: "detected",
			details,
		});
	},

	// Log rate limiting events
	async logRateLimitExceeded(
		clientIp: string,
		endpoint: string,
		userId?: string,
	) {
		await auditLogger.logSecurityEvent(SecurityEvents.RATE_LIMIT_EXCEEDED, {
			threatType: "rate_limiting",
			severity: "medium",
			clientIp,
			userId,
			outcome: "blocked",
			details: { endpoint },
		});
	},

	// Log input validation failures
	async logValidationFailure(
		input: string,
		validationType: string,
		clientIp?: string,
		userId?: string,
	) {
		await auditLogger.logSecurityEvent(
			SecurityEvents.MALICIOUS_INPUT_DETECTED,
			{
				threatType: validationType,
				severity: "high",
				clientIp,
				userId,
				outcome: "blocked",
				details: {
					inputLength: input.length,
					validationType,
					// Don't log the actual input to prevent log injection
					inputHash: Buffer.from(input).toString("base64").slice(0, 16),
				},
			},
		);
	},

	// Log privilege escalation attempts
	async logPrivilegeEscalation(
		userId: string,
		attemptedAction: string,
		requiredRole: string,
		currentRole: string,
		clientIp?: string,
	) {
		await auditLogger.logSecurityEvent(
			SecurityEvents.PRIVILEGE_ESCALATION_ATTEMPT,
			{
				threatType: "privilege_escalation",
				severity: "high",
				clientIp,
				userId,
				outcome: "blocked",
				details: {
					attemptedAction,
					requiredRole,
					currentRole,
				},
			},
		);
	},
};

/**
 * Audit middleware for tRPC
 */
export function createAuditMiddleware() {
	return async function auditMiddleware({
		ctx,
		next,
		path,
		type,
	}: {
		ctx: any;
		next: () => Promise<any>;
		path: string;
		type: string;
	}) {
		const startTime = Date.now();
		const userId = ctx.dbUser?.id;
		const clientIp =
			ctx.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

		try {
			const result = await next();

			// Log successful data access
			await auditLogger.logDataAccess(`trpc_${type}`, {
				userId: userId || "anonymous",
				resource: path,
				action: type,
				outcome: "success",
				householdId: ctx.currentHouseholdId,
				metadata: {
					executionTimeMs: Date.now() - startTime,
				},
			});

			return result;
		} catch (error) {
			// Log failed data access
			await auditLogger.logDataAccess(`trpc_${type}`, {
				userId: userId || "anonymous",
				resource: path,
				action: type,
				outcome: "failure",
				householdId: ctx.currentHouseholdId,
				metadata: {
					error: error instanceof Error ? error.message : String(error),
					executionTimeMs: Date.now() - startTime,
				},
			});

			throw error;
		}
	};
}
