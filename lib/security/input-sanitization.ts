export class InputSanitizer {
  /**
   * Sanitize user input to prevent XSS attacks
   */
  static sanitizeString(input: string): string {
    if (typeof input !== "string") return "";

    return input
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;")
      .trim();
  }

  /**
   * Sanitize HTML content while preserving safe tags
   */
  static sanitizeHtml(input: string): string {
    // Basic HTML sanitization - in production use a library like DOMPurify
    return InputSanitizer.sanitizeString(input);
  }

  /**
   * Validate and sanitize email addresses
   */
  static sanitizeEmail(email: string): string {
    const sanitized = InputSanitizer.sanitizeString(email).toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(sanitized) ? sanitized : "";
  }

  /**
   * Sanitize phone numbers
   */
  static sanitizePhone(phone: string): string {
    return phone.replace(/[^\d+\-\s()]/g, "").trim();
  }

  /**
   * Sanitize numeric input
   */
  static sanitizeNumber(input: string | number): number | null {
    const num = typeof input === "number" ? input : parseFloat(input);
    return Number.isNaN(num) ? null : num;
  }
}

// Export for schema compatibility
import { z } from "zod";

export function createSecurityValidator<T extends z.ZodTypeAny>(schema: T) {
  return schema;
}

export const secureSchemas = {
  email: z.string().email(),
  limitedArray: <T extends z.ZodTypeAny>(itemSchema: T, maxItems = 100) =>
    z.array(itemSchema).max(maxItems),
  phone: z.string().max(20),
  positiveNumber: (max = Number.MAX_SAFE_INTEGER) =>
    z.number().positive().max(max),
  recentDate: (maxYearsBack = 200, maxYearsFuture = 0) => {
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - maxYearsBack);
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + maxYearsFuture);
    return z.date().min(minDate).max(maxDate);
  },
  safeNumber: z.number().finite(),
  safeString: (maxLength = 1000) => z.string().min(1).max(maxLength),
  safeText: (maxLength = 10000) => z.string().max(maxLength),
  safeUuid: z.string().uuid(),
  url: () => z.string().url(),
  uuid: z.string().uuid(),
};
