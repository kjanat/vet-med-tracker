// Browser-compatible crypto using Web Crypto API
const getRandomBytes = (size: number): Uint8Array => {
  if (crypto?.getRandomValues) {
    // Modern environment with Web Crypto API (browser or Node 16+)
    return crypto.getRandomValues(new Uint8Array(size));
  } else {
    // Fallback: generate pseudo-random bytes
    const bytes = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes;
  }
};

import DOMPurify from "isomorphic-dompurify";
import { type ZodType, z } from "zod";

/**
 * Security utilities for input sanitization and validation
 */

// Common validation patterns
export const securityPatterns = {
  // Basic SQL injection patterns (defense-in-depth; keep conservative)
  sqlInjection:
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,

  // XSS patterns
  xssPatterns: [
    /<script\b[^<]*(?:(?!<\/script\s*>)<[^<]*)*<\/script\s*>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
  ],

  // Path traversal
  pathTraversal: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c)/i,

  // Command injection (broad; apply only where appropriate)
  commandInjection: /[;&|`$(){}[\]]/,

  // UUID validation
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

  // Email validation (stricter than minimal)
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
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize text input for safe storage and display
 */
export function sanitizeText(input: string, maxLength = 1000): string {
  // Remove potential XSS patterns
  let sanitized = input;
  for (const pattern of securityPatterns.xssPatterns) {
    sanitized = sanitized.replace(pattern, "");
  }
  // Trim and limit length
  return sanitized.trim().slice(0, maxLength);
}

/**
 * Validate and sanitize file names
 */
export function sanitizeFileName(filename: string): string {
  // Remove path traversal attempts
  let sanitized = filename.replace(securityPatterns.pathTraversal, "");

  // Remove filesystem-dangerous characters: < > : " / \ | ? *
  sanitized = sanitized.replace(/[<>:"/\\|?*]/g, "");

  // Strip control chars (keep space). Kept as filter to satisfy noControlCharactersInRegex.
  sanitized = sanitized
    .split("")
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code > 31 || ch === " ";
    })
    .join("");

  // Collapse consecutive slashes/backslashes just in case
  sanitized = sanitized.replace(/[\\/]+/g, "/");

  // Limit length and trim
  return sanitized.slice(0, 255).trim();
}

/**
 * Enhanced Zod schemas with security validations (Zod v4-ready)
 */
export const secureSchemas = {
  // Secure string with XSS protection
  safeString: (maxLength = 1000) => {
    const sanitized = z
      .string()
      .transform((val) => sanitizeText(val, maxLength));
    return sanitized
      .pipe(
        z
          .string()
          .max(maxLength, { message: `String too long (max ${maxLength})` }),
      )
      .refine((val) => !securityPatterns.sqlInjection.test(val), {
        message: "Invalid characters detected",
      });
  },
  // Secure HTML content (sanitize -> validate length)
  // Strict UUID validation (use built-in)
  uuid: z.uuid({ message: "Invalid UUID format" }),

  // Secure email (normalize -> validate)
  email: z.email({ message: "Invalid email format" }),

  // Secure phone (normalize -> regex)
  phone: z
    .string()
    .trim()
    .regex(securityPatterns.phone, { message: "Invalid phone number format" }),

  // Secure filename (sanitize -> structural checks)
  filename: (() => {
    const sanitized = z.string().transform((val) => sanitizeFileName(val));
    return sanitized
      .pipe(z.string().min(1, { message: "Filename cannot be empty" }))
      .refine((val) => !val.startsWith("."), {
        message: "Hidden files not allowed",
      })
      .refine((val) => securityPatterns.safeFilename.test(val), {
        message: "Invalid filename characters",
      });
  })(),

  // URL validation with optional host allowlist (returns string)
  url: (allowedHosts?: string[]) =>
    z.url({ message: "Invalid URL format" }).refine(
      (val) => {
        if (!allowedHosts || allowedHosts.length === 0) return true;
        try {
          const u = new URL(val);
          return allowedHosts.includes(u.hostname);
        } catch {
          return false;
        }
      },
      { message: "URL host not allowed" },
    ),

  // Numeric validations with bounds (finite by default in v4)
  positiveNumber: (max?: number) => {
    let s = z.number().positive({ message: "Must be positive" });
    if (typeof max === "number") {
      s = s.lte(max, { message: `Must be ≤ ${max}` });
    }
    return s;
  },

  // Array validation with size limits
  limitedArray: <T>(itemSchema: z.ZodType<T>, maxItems = 100) =>
    z
      .array(itemSchema)
      .max(maxItems, { message: `Too many items (max ${maxItems})` }),

  // Date validation with reasonable bounds (accepts strings or Dates; returns Date)
  recentDate: (yearsBack = 150, yearsFuture = 10) => {
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - yearsBack);

    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + yearsFuture);

    return z.coerce
      .date()
      .min(minDate, {
        message: `Date too old (before ${minDate.getFullYear()})`,
      })
      .max(maxDate, {
        message: `Date too far in future (after ${maxDate.getFullYear()})`,
      });
  },
};

/**
 * Security validation middleware for tRPC procedures
 * Prefer superRefine for better error reporting (no generic bool refine).
 */
export function createSecurityValidator<T>(schema: ZodType<T>) {
  return schema.superRefine((data, ctx) => {
    try {
      const jsonStr = JSON.stringify(data);

      if (jsonStr.length > 100_000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Payload too large (max 100KB)",
          path: [], // root
        });
      }

      if (securityPatterns.sqlInjection.test(jsonStr)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Security validation failed",
          path: [],
        });
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Unable to serialize payload for security checks",
        path: [],
      });
    }
  });
}

/**
 * Rate limiting helpers
 */
export const rateLimitHelpers = {
  // Generate rate limit key based on user context
  generateKey(userId?: string, ip?: string, action?: string): string {
    if (userId) return `user:${userId}${action ? `:${action}` : ""}`;
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
    return privateRanges.some((re) => re.test(ip));
  },
};

/**
 * Content Security Policy helpers
 */
export const cspHelpers = {
  // Generate nonce for inline scripts
  generateNonce(): string {
    // Prefer base64 to avoid hex-only nonces
    if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      // base64url (no padding) is CSP-safe
      return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    }
    const bytes = getRandomBytes(16);
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
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
    if (error instanceof z.ZodError) return "Validation failed";
    return "An error occurred";
  }
  if (error instanceof Error) return error.message;
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
  // Intentionally minimal; wire into your logger if needed
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
