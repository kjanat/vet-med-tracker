/**
 * Input sanitization utilities for VetMed Tracker
 * Provides protection against SQL injection, XSS, and other attacks
 */

import { TRPCError } from "@trpc/server";

/**
 * SQL Injection Prevention
 */

// Dangerous SQL keywords and patterns
const SQL_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|FROM|WHERE|JOIN|SCRIPT|JAVASCRIPT|VBSCRIPT|ONLOAD|ONERROR|ONCLICK)\b)/gi,
  /(-{2}|\/\*|\*\/|;|\||&&|\|\||'|")/g, // SQL comment markers and dangerous chars
  /(xp_|sp_|0x|CHAR|NCHAR|VARCHAR|NVARCHAR|CAST|CONVERT|EXEC)/gi,
];

/**
 * Sanitize input to prevent SQL injection
 * Note: This is a backup - always use parameterized queries!
 */
export function sqlSanitize(input: string): string {
  if (!input) return "";

  let sanitized = input;

  // Remove SQL patterns
  for (const pattern of SQL_PATTERNS) {
    sanitized = sanitized.replace(pattern, "");
  }

  // Escape special characters
  sanitized = sanitized
    .replace(/'/g, "''")
    .replace(/"/g, '""')
    .replace(/\\/g, "\\\\");

  return sanitized.trim();
}

/**
 * Validate that input doesn't contain SQL injection attempts
 */
export function sqlValidate(input: string): boolean {
  if (!input) return true;

  for (const pattern of SQL_PATTERNS) {
    if (pattern.test(input)) {
      return false;
    }
  }

  return true;
}

export const SQLSanitizer = {
  sanitize: sqlSanitize,
  validate: sqlValidate,
};

/**
 * XSS Protection
 */

// HTML entities that need escaping
const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
};

// Dangerous JavaScript patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script\s*>)<[^<]*)*<\/script\s*>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // Event handlers
  /<iframe/gi,
  /<embed/gi,
  /<object/gi,
  /data:text\/html/gi,
];

/**
 * Escape HTML entities to prevent XSS
 */
export function xssEscapeHtml(input: string): string {
  if (!input) return "";

  return input.replace(/[&<>"'/]/g, (match) => HTML_ENTITIES[match] || match);
}

/**
 * Remove dangerous HTML/JavaScript content
 */
export function xssSanitize(input: string): string {
  if (!input) return "";

  let sanitized = input;

  // Remove dangerous patterns
  for (const pattern of XSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, "");
  }

  // Escape remaining HTML
  return xssEscapeHtml(sanitized);
}

/**
 * Validate that input doesn't contain XSS attempts
 */
export function xssValidate(input: string): boolean {
  if (!input) return true;

  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      return false;
    }
  }

  return true;
}

export const XSSSanitizer = {
  escapeHtml: xssEscapeHtml,
  sanitize: xssSanitize,
  validate: xssValidate,
};

/**
 * Medical Data Sanitizer Functions
 * Specific to VetMed Tracker domain
 */

/**
 * Sanitize medication name
 */
export function medSanitizeMedicationName(name: string): string {
  if (!name) return "";

  // Allow alphanumeric, spaces, hyphens, parentheses, percentages
  const sanitized = name.replace(/[^a-zA-Z0-9\s\-().%]/g, "");

  // Limit length
  return sanitized.substring(0, 200).trim();
}

/**
 * Sanitize dosage string
 */
export function medSanitizeDosage(dosage: string): string {
  if (!dosage) return "";

  // Allow numbers, decimals, common units, and basic math
  const sanitized = dosage.replace(/[^0-9.\s\-/,mgkglbsmlLunittabcapIU]/g, "");

  // Limit length
  return sanitized.substring(0, 50).trim();
}

/**
 * Sanitize animal name
 */
export function medSanitizeAnimalName(name: string): string {
  if (!name) return "";

  // Allow alphanumeric, spaces, apostrophes, hyphens
  const sanitized = name.replace(/[^a-zA-Z0-9\s'-]/g, "");

  // Limit length
  return sanitized.substring(0, 100).trim();
}

/**
 * Sanitize notes/instructions
 */
export function medSanitizeNotes(notes: string): string {
  if (!notes) return "";

  // First remove any XSS attempts
  let sanitized = XSSSanitizer.sanitize(notes);

  // Allow common punctuation but limit special characters
  sanitized = sanitized.replace(/[^\w\s.,!?;:()\-'"]/g, "");

  // Limit length
  return sanitized.substring(0, 1000).trim();
}

/**
 * Validate and sanitize phone number
 */
export function medSanitizePhoneNumber(phone: string): string {
  if (!phone) return "";

  // Remove all non-numeric except + and -
  const sanitized = phone.replace(/[^0-9+\-().\s]/g, "");

  // Limit length (international numbers can be long)
  return sanitized.substring(0, 20).trim();
}

/**
 * Validate and sanitize email
 */
export function medSanitizeEmail(email: string): string {
  if (!email) return "";

  // Basic email sanitization
  const sanitized = email.toLowerCase().trim();

  // Very basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return "";
  }

  // Limit length
  return sanitized.substring(0, 255);
}

export const MedicalDataSanitizer = {
  sanitizeMedicationName: medSanitizeMedicationName,
  sanitizeDosage: medSanitizeDosage,
  sanitizeAnimalName: medSanitizeAnimalName,
  sanitizeNotes: medSanitizeNotes,
  sanitizePhoneNumber: medSanitizePhoneNumber,
  sanitizeEmail: medSanitizeEmail,
};

/**
 * File Upload Validation Functions
 */

// Allowed image types for animal photos
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

// Allowed document types for medical records
const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

// Maximum file sizes
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validate file name for security
 */
function isValidFileName(fileName: string): boolean {
  // No path traversal
  if (
    fileName.includes("..") ||
    fileName.includes("/") ||
    fileName.includes("\\")
  ) {
    return false;
  }

  // No special characters that could cause issues
  const validPattern = /^[\w\-. ]+$/;
  if (!validPattern.test(fileName)) {
    return false;
  }

  // Reasonable length
  if (fileName.length > 255) {
    return false;
  }

  return true;
}

/**
 * Validate image upload
 */
export function fileValidateImage(file: {
  type: string;
  size: number;
  name: string;
}): {
  valid: boolean;
  error?: string;
} {
  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
    };
  }

  // Check file size
  if (file.size > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
    };
  }

  // Check file name for suspicious patterns
  if (!isValidFileName(file.name)) {
    return {
      valid: false,
      error: "Invalid file name",
    };
  }

  return { valid: true };
}

/**
 * Validate document upload
 */
export function fileValidateDocument(file: {
  type: string;
  size: number;
  name: string;
}): {
  valid: boolean;
  error?: string;
} {
  // Check file type
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_DOCUMENT_TYPES.join(", ")}`,
    };
  }

  // Check file size
  if (file.size > MAX_DOCUMENT_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_DOCUMENT_SIZE / 1024 / 1024}MB`,
    };
  }

  // Check file name
  if (!isValidFileName(file.name)) {
    return {
      valid: false,
      error: "Invalid file name",
    };
  }

  return { valid: true };
}

export const FileUploadValidator = {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  MAX_IMAGE_SIZE,
  MAX_DOCUMENT_SIZE,
  validateImage: fileValidateImage,
  validateDocument: fileValidateDocument,
};

/**
 * Request Size Limiter Functions
 */

const MAX_JSON_SIZE = 1 * 1024 * 1024; // 1MB for JSON
const MAX_URL_LENGTH = 2048; // Standard URL length limit

/**
 * Validate JSON payload size
 */
export function requestValidateJsonSize(payload: unknown): boolean {
  const size = new TextEncoder().encode(JSON.stringify(payload)).length;
  return size <= MAX_JSON_SIZE;
}

/**
 * Validate URL length
 */
export function requestValidateUrlLength(url: string): boolean {
  return url.length <= MAX_URL_LENGTH;
}

export const RequestSizeLimiter = {
  MAX_JSON_SIZE,
  MAX_URL_LENGTH,
  validateJsonSize: requestValidateJsonSize,
  validateUrlLength: requestValidateUrlLength,
};

/**
 * Validation Error Formatter Functions
 */

/**
 * Format Zod validation errors for client
 */
export function formatZodError(error: unknown): {
  message: string;
  fields: Record<string, string[]>;
} {
  const fields: Record<string, string[]> = {};

  if (error && typeof error === "object" && "errors" in error) {
    const zodError = error as {
      errors: Array<{ path: string[]; message: string }>;
    };
    for (const err of zodError.errors) {
      const path = err.path.join(".");
      if (!fields[path]) {
        fields[path] = [];
      }
      fields[path].push(err.message);
    }
  }

  return {
    message: "Validation failed",
    fields,
  };
}

/**
 * Create standardized validation error
 */
export function createValidationError(
  message: string,
  fields?: Record<string, string[]>,
): TRPCError {
  return new TRPCError({
    code: "BAD_REQUEST",
    message,
    cause: fields ? { validation: fields } : undefined,
  });
}

export const ValidationErrorFormatter = {
  formatZodError,
  createValidationError,
};

/**
 * Sanitize a string value based on options
 */
function sanitizeStringValue(
  value: string,
  options: { skipXss?: boolean; skipSql?: boolean },
): string {
  let cleanValue = value;

  if (!options.skipXss) {
    cleanValue = XSSSanitizer.sanitize(cleanValue);
  }

  if (!options.skipSql) {
    cleanValue = SQLSanitizer.sanitize(cleanValue);
  }

  return cleanValue;
}

/**
 * Sanitize array items
 */
function sanitizeArrayItems<T extends Record<string, unknown>>(
  array: unknown[],
  options: {
    skipXss?: boolean;
    skipSql?: boolean;
    fieldRules?: Record<string, (value: unknown) => unknown>;
  },
): unknown[] {
  return array.map((item) => {
    if (typeof item === "string") {
      return sanitizeStringValue(item, options);
    }
    if (item && typeof item === "object" && !Array.isArray(item)) {
      return inputSanitizeObject(item as T, options);
    }
    return item;
  });
}

/**
 * Process a single object entry
 */
function processSingleEntry<T extends Record<string, unknown>>(
  key: string,
  value: unknown,
  options: {
    skipXss?: boolean;
    skipSql?: boolean;
    fieldRules?: Record<string, (value: unknown) => unknown>;
  },
): unknown {
  // Apply field-specific rules if provided
  if (options.fieldRules?.[key]) {
    return options.fieldRules[key](value);
  }

  // Sanitize strings
  if (typeof value === "string") {
    return sanitizeStringValue(value, options);
  }

  // Recursively sanitize nested objects
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return inputSanitizeObject(value as T, options);
  }

  // Sanitize arrays
  if (Array.isArray(value)) {
    return sanitizeArrayItems(value, options);
  }

  return value;
}

/**
 * Main sanitizer utility functions
 */

/**
 * Sanitize all string fields in an object
 */
export function inputSanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: {
    skipXss?: boolean;
    skipSql?: boolean;
    fieldRules?: Record<string, (value: unknown) => unknown>;
  } = {},
): T {
  const sanitized: Record<string, unknown> = { ...obj };

  for (const [key, value] of Object.entries(sanitized)) {
    sanitized[key] = processSingleEntry(key, value, options);
  }

  return sanitized as T;
}

/**
 * Quick validate for common injection attempts
 */
export function inputQuickValidate(input: string): boolean {
  return SQLSanitizer.validate(input) && XSSSanitizer.validate(input);
}

export const InputSanitizer = {
  sanitizeObject: inputSanitizeObject,
  quickValidate: inputQuickValidate,
};
