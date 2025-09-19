import DOMPurify from "isomorphic-dompurify";
import { type ZodType, z } from "zod";

/**
 * Security utilities for input sanitization and validation
 */

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate cryptographically secure random bytes
 */
const getRandomBytes = (size: number): Uint8Array => {
  const bytes = new Uint8Array(size);

  if (crypto?.getRandomValues) {
    return crypto.getRandomValues(bytes);
  }

  // Fallback for older environments
  for (let i = 0; i < size; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
};

// ============================================================================
// Security Patterns
// ============================================================================

export const securityPatterns = {
  // Command injection characters
  commandInjection: /[;&|`$(){}[\]]/,
  // Email validation
  email:
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,

  // Path traversal attempts
  pathTraversal: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c)/i,

  // Phone number
  phone: /^[\d\s\-()+]+$/,

  // Safe filename
  safeFilename: /^[a-zA-Z0-9._-]+$/,

  // SQL injection keywords
  sqlInjection:
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,

  // UUID format
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

  // XSS patterns
  xssPatterns: [
    /<script\b[^<]*(?:(?!<\/script\s*>)<[^<]*)*<\/script\s*>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
  ],
};

// ============================================================================
// Sanitization Functions
// ============================================================================

/**
 * Remove all HTML tags and dangerous content
 */
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_ATTR: [],
    ALLOWED_TAGS: [],
  });
}

/**
 * Clean text input for safe storage
 */
export function sanitizeText(input: string, maxLength = 1000): string {
  let sanitized = input;

  // Remove XSS patterns
  for (const pattern of securityPatterns.xssPatterns) {
    sanitized = sanitized.replace(pattern, "");
  }

  return sanitized.trim().slice(0, maxLength);
}

/**
 * Make filenames safe for filesystem operations
 */
export function sanitizeFileName(filename: string): string {
  return (
    filename
      // Remove path traversal
      .replace(securityPatterns.pathTraversal, "")
      // Remove dangerous characters
      .replace(/[<>:"/\\|?*]/g, "")
      // Remove control characters (except space)
      .split("")
      .filter((ch) => ch.charCodeAt(0) > 31 || ch === " ")
      .join("")
      // Collapse multiple slashes
      .replace(/[\\/]+/g, "/")
      // Limit length
      .slice(0, 255)
      .trim()
  );
}

// ============================================================================
// Zod Security Schemas
// ============================================================================

export const secureSchemas = {
  // Email with validation
  email: z.email({ message: "Invalid email format" }),

  // Secure filename
  filename: () =>
    z
      .string()
      .transform(sanitizeFileName)
      .pipe(
        z
          .string()
          .min(1, { message: "Filename cannot be empty" })
          .refine((val) => !val.startsWith("."), {
            message: "Hidden files not allowed",
          })
          .refine((val) => securityPatterns.safeFilename.test(val), {
            message: "Invalid filename characters",
          }),
      ),

  // Array with size limit
  limitedArray: <T>(itemSchema: z.ZodType<T>, maxItems = 100) =>
    z.array(itemSchema).max(maxItems, { message: `Max ${maxItems} items` }),

  // Phone number
  phone: z
    .string()
    .trim()
    .regex(securityPatterns.phone, { message: "Invalid phone number" }),

  // Positive number with optional max
  positiveNumber: (max?: number) => {
    let schema = z.number().positive({ message: "Must be positive" });
    if (max !== undefined) {
      schema = schema.lte(max, { message: `Must be ≤ ${max}` });
    }
    return schema;
  },

  // Date within reasonable bounds
  recentDate: (yearsBack = 150, yearsFuture = 10) => {
    const minDate = new Date();
    const maxDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - yearsBack);
    maxDate.setFullYear(maxDate.getFullYear() + yearsFuture);

    return z.coerce
      .date()
      .min(minDate, { message: `Date too old` })
      .max(maxDate, { message: `Date too far in future` });
  },

  // Safe string with XSS protection
  safeString: (maxLength = 1000) =>
    z
      .string()
      .transform((val) => sanitizeText(val, maxLength))
      .pipe(
        z
          .string()
          .max(maxLength, { message: `Max ${maxLength} characters` })
          .refine((val) => !securityPatterns.sqlInjection.test(val), {
            message: "Invalid characters detected",
          }),
      ),

  // URL with optional host restriction
  url: (allowedHosts?: string[]) =>
    z.url({ message: "Invalid URL" }).refine(
      (val) => {
        if (!allowedHosts?.length) return true;
        try {
          const { hostname } = new URL(val);
          return allowedHosts.includes(hostname);
        } catch {
          return false;
        }
      },
      { message: "URL host not allowed" },
    ),

  // UUID validation
  uuid: z.uuid({ message: "Invalid UUID format" }),
};

// ============================================================================
// Middleware & Validators
// ============================================================================

/**
 * Add security checks to any Zod schema
 */
export function createSecurityValidator<T>(schema: ZodType<T>) {
  return schema.superRefine((data, ctx) => {
    try {
      const jsonStr = JSON.stringify(data);

      // Check payload size
      if (jsonStr.length > 100_000) {
        ctx.addIssue({
          code: "custom",
          message: "Payload too large",
          path: [],
        });
      }

      // Check for SQL injection
      if (securityPatterns.sqlInjection.test(jsonStr)) {
        ctx.addIssue({
          code: "custom",
          message: "Security validation failed",
          path: [],
        });
      }
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Invalid payload",
        path: [],
      });
    }
  });
}

// ============================================================================
// Rate Limiting
// ============================================================================

export const rateLimitHelpers = {
  /**
   * Generate unique key for rate limiting
   */
  generateKey(userId?: string, ip?: string, action?: string): string {
    const base = userId ? `user:${userId}` : `ip:${ip || "unknown"}`;
    return action ? `${base}:${action}` : base;
  },

  /**
   * Check if IP is from private network
   */
  isPrivateIP(ip: string): boolean {
    const privateRanges = [
      /^127\./, // localhost
      /^10\./, // 10.0.0.0/8
      /^192\.168\./, // 192.168.0.0/16
      /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
    ];
    return privateRanges.some((pattern) => pattern.test(ip));
  },
};

// ============================================================================
// CSP (Content Security Policy)
// ============================================================================

export const cspHelpers = {
  /**
   * Generate random nonce for inline scripts
   */
  generateNonce(): string {
    const bytes = getRandomBytes(16);
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  },

  /**
   * Check if content is safe for CSP
   */
  isCSPSafe(content: string): boolean {
    return !securityPatterns.xssPatterns.some((pattern) =>
      pattern.test(content),
    );
  },
};

// ============================================================================
// Error Handling & Logging
// ============================================================================

/**
 * Sanitize error messages to prevent info disclosure
 */
export function sanitizeErrorMessage(
  error: unknown,
  isProduction = process.env.NODE_ENV === "production",
): string {
  if (isProduction) {
    return error instanceof z.ZodError
      ? "Validation failed"
      : "An error occurred";
  }

  return error instanceof Error ? error.message : String(error);
}

/**
 * Log security events for audit trail
 */
export function createSecurityAuditLog(
  action: string,
  userId?: string,
  ip?: string,
  details?: Record<string, unknown>,
): void {
  console.log(
    JSON.stringify({
      action,
      details,
      ip,
      severity: "info",
      timestamp: new Date().toISOString(),
      type: "security_audit",
      userId,
    }),
  );
}
