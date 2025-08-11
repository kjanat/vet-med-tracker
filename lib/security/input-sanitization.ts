import DOMPurify from "isomorphic-dompurify";
import { z } from "zod";

/**
 * Security utilities for input sanitization and validation
 */

// Common validation patterns
export const securityPatterns = {
	// Basic SQL injection patterns (basic defense in depth)
	sqlInjection:
		/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,

	// XSS patterns
	xssPatterns: [
		/<script[^>]*>.*?<\/script>/gi,
		/javascript:/gi,
		/on\w+\s*=/gi,
		/<iframe[^>]*>.*?<\/iframe>/gi,
	],

	// Path traversal
	pathTraversal: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c)/i,

	// Command injection
	commandInjection: /[;&|`$(){}[\]]/,

	// UUID validation
	uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

	// Email validation (more strict than basic regex)
	email:
		/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,

	// Phone number validation
	phone: /^[\d\s\-()+]+$/,

	// Safe filename pattern
	safeFilename: /^[a-zA-Z0-9._-]+$/,
};

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtml(input: string): string {
	if (typeof input !== "string") return "";
	return DOMPurify.sanitize(input, {
		ALLOWED_TAGS: [], // Strip all HTML tags
		ALLOWED_ATTR: [],
	});
}

/**
 * Sanitize text input for safe storage and display
 */
export function sanitizeText(input: string, maxLength = 1000): string {
	if (typeof input !== "string") return "";

	// Remove potential XSS patterns
	let sanitized = input;
	securityPatterns.xssPatterns.forEach((pattern) => {
		sanitized = sanitized.replace(pattern, "");
	});

	// Trim and limit length
	return sanitized.trim().slice(0, maxLength);
}

/**
 * Validate and sanitize file names
 */
export function sanitizeFileName(filename: string): string {
	if (typeof filename !== "string") return "";

	// Remove path traversal attempts
	let sanitized = filename.replace(securityPatterns.pathTraversal, "");

	// Remove potentially dangerous characters
	// File system reserved characters: < > : " / \ | ? *
	sanitized = sanitized.replace(/[<>:"/\\|?*]/g, "");

	// Remove control characters using filter instead of regex with control character ranges
	// This avoids the noControlCharactersInRegex lint rule while still providing security
	sanitized = sanitized
		.split("")
		.filter((char) => {
			const code = char.charCodeAt(0);
			// Filter out ASCII control characters (0-31) which can break filenames
			return code > 31 || char === " "; // Allow space (32) but not other control chars
		})
		.join("");

	// Limit length and ensure safe characters only
	return sanitized.slice(0, 255).trim();
}

/**
 * Enhanced Zod schemas with security validations
 */
export const secureSchemas = {
	// Secure string with XSS protection
	safeString: (maxLength = 1000) =>
		z
			.string()
			.transform(sanitizeText)
			.refine(
				(val) => !securityPatterns.sqlInjection.test(val),
				"Invalid characters detected",
			)
			.refine(
				(val) => val.length <= maxLength,
				`String too long (max ${maxLength})`,
			),

	// Secure HTML content
	safeHtml: (maxLength = 5000) =>
		z
			.string()
			.transform(sanitizeHtml)
			.refine(
				(val) => val.length <= maxLength,
				`Content too long (max ${maxLength})`,
			),

	// Strict UUID validation
	uuid: z
		.string()
		.refine((val) => securityPatterns.uuid.test(val), "Invalid UUID format"),

	// Secure email validation
	email: z
		.string()
		.refine((val) => securityPatterns.email.test(val), "Invalid email format")
		.transform((val) => val.toLowerCase().trim()),

	// Secure phone validation
	phone: z
		.string()
		.refine(
			(val) => securityPatterns.phone.test(val),
			"Invalid phone number format",
		)
		.transform((val) => val.trim()),

	// Secure filename
	filename: z
		.string()
		.transform(sanitizeFileName)
		.refine((val) => val.length > 0, "Filename cannot be empty")
		.refine((val) => !val.startsWith("."), "Hidden files not allowed")
		.refine(
			(val) => securityPatterns.safeFilename.test(val),
			"Invalid filename characters",
		),

	// URL validation with whitelist
	url: (allowedHosts?: string[]) =>
		z
			.string()
			.url("Invalid URL format")
			.refine((val) => {
				if (!allowedHosts) return true;
				try {
					const url = new URL(val);
					return allowedHosts.includes(url.hostname);
				} catch {
					return false;
				}
			}, "URL host not allowed"),

	// Numeric validations with bounds
	positiveNumber: (max?: number) =>
		z
			.number()
			.positive("Must be positive")
			.finite("Must be finite")
			.refine((val) => !max || val <= max, `Must be less than ${max}`),

	// Array validation with size limits
	limitedArray: <T>(itemSchema: z.ZodSchema<T>, maxItems = 100) =>
		z.array(itemSchema).max(maxItems, `Too many items (max ${maxItems})`),

	// Date validation with reasonable bounds
	recentDate: (yearsBack = 150, yearsFuture = 10) => {
		const minDate = new Date();
		minDate.setFullYear(minDate.getFullYear() - yearsBack);
		const maxDate = new Date();
		maxDate.setFullYear(maxDate.getFullYear() + yearsFuture);

		return z
			.date()
			.min(minDate, `Date too old (before ${minDate.getFullYear()})`)
			.max(maxDate, `Date too far in future (after ${maxDate.getFullYear()})`);
	},
};

/**
 * Security validation middleware for tRPC procedures
 */
export function createSecurityValidator<T>(schema: z.ZodSchema<T>) {
	return schema.refine((data: unknown) => {
		// Additional runtime security checks
		const jsonStr = JSON.stringify(data);

		// Check for excessively large payloads
		if (jsonStr.length > 100000) {
			// 100KB limit
			return false;
		}

		// Check for suspicious patterns in serialized data
		if (securityPatterns.sqlInjection.test(jsonStr)) {
			return false;
		}

		return true;
	}, "Security validation failed");
}

/**
 * Rate limiting helpers
 */
export const rateLimitHelpers = {
	// Generate rate limit key based on user context
	generateKey(userId?: string, ip?: string, action?: string): string {
		if (userId) {
			return `user:${userId}${action ? `:${action}` : ""}`;
		}
		return `ip:${ip || "unknown"}${action ? `:${action}` : ""}`;
	},

	// Check if IP is from private network (for bypassing certain limits)
	isPrivateIP(ip: string): boolean {
		const privateRanges = [
			/^127\./, // localhost
			/^10\./, // 10.0.0.0/8
			/^192\.168\./, // 192.168.0.0/16
			/^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
		];
		return privateRanges.some((range) => range.test(ip));
	},
};

/**
 * Content Security Policy helpers
 */
export const cspHelpers = {
	// Generate nonce for inline scripts
	generateNonce(): string {
		const array = new Uint8Array(16);
		crypto.getRandomValues(array);
		return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
			"",
		);
	},

	// Validate CSP-safe content
	isCSPSafe(content: string): boolean {
		return !securityPatterns.xssPatterns.some((pattern) =>
			pattern.test(content),
		);
	},
};

/**
 * Error message sanitization (prevent information disclosure)
 */
export function sanitizeErrorMessage(
	error: unknown,
	isProduction = process.env.NODE_ENV === "production",
): string {
	if (isProduction) {
		// In production, return generic messages to prevent information disclosure
		if (error instanceof z.ZodError) {
			return "Validation failed";
		}
		return "An error occurred";
	}

	// In development, allow more detailed errors
	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}

/**
 * Audit logging helper
 */
export function createSecurityAuditLog(
	action: string,
	userId?: string,
	ip?: string,
	details?: Record<string, unknown>,
) {
	console.log(
		JSON.stringify({
			timestamp: new Date().toISOString(),
			type: "security_audit",
			action,
			userId,
			ip,
			details,
			severity: "info",
		}),
	);
}
