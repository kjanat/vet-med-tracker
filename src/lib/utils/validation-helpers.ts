import { TRPCError } from "@trpc/server";
import { z } from "zod";

/**
 * Common validation schemas and helpers for tRPC endpoints
 */

// UUID validation schema (reusable)
export const uuidSchema = z.uuid();

// Date string validation (YYYY-MM-DD format)
export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// Time string validation (HH:MM format)
export const timeStringSchema = z.string().regex(/^\d{2}:\d{2}$/);

// Common input schemas for CRUD operations
export const createInputSchema = {
  householdId: uuidSchema,
};

export const updateInputSchema = {
  householdId: uuidSchema,
  id: uuidSchema,
};

export const deleteInputSchema = {
  householdId: uuidSchema,
  id: uuidSchema,
};

export const getByIdInputSchema = {
  householdId: uuidSchema,
  id: uuidSchema,
};

export const listInputSchema = {
  householdId: uuidSchema,
};

// Reusable composed schemas for common endpoint patterns
export const householdIdInput = z.object({ householdId: uuidSchema });
export const idWithHouseholdInput = z.object({
  householdId: uuidSchema,
  id: uuidSchema,
});
export const listWithFiltersInput = z.object({
  householdId: uuidSchema,
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
});

/**
 * Factory for creating extended input schemas
 * Reduces duplication when adding fields to common patterns
 */
export function extendHouseholdInput<T extends z.ZodRawShape>(extension: T) {
  return householdIdInput.extend(extension);
}

export function extendIdWithHouseholdInput<T extends z.ZodRawShape>(
  extension: T,
) {
  return idWithHouseholdInput.extend(extension);
}

/**
 * Validate that required fields are present
 */
export function validateRequiredFields<T extends Record<string, unknown>>(
  data: T,
  requiredFields: Array<keyof T>,
  entityName = "Entity",
): void {
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `${entityName} requires field: ${String(field)}`,
      });
    }
  }
}

/**
 * Validate conditional requirements (if A is set, B must be set)
 */
export function validateConditionalRequirements<
  T extends Record<string, unknown>,
>(
  data: T,
  conditionals: Array<{
    if: keyof T;
    then: Array<keyof T>;
    message?: string;
  }>,
): void {
  for (const { if: condition, then: required, message } of conditionals) {
    if (data[condition] !== undefined && data[condition] !== null) {
      for (const field of required) {
        if (data[field] === undefined || data[field] === null) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              message ||
              `When ${String(condition)} is set, ${String(field)} is required`,
          });
        }
      }
    }
  }
}

/**
 * Validate mutually exclusive fields (only one can be set)
 */
export function validateMutuallyExclusive<T extends Record<string, unknown>>(
  data: T,
  fields: Array<keyof T>,
  entityName = "Entity",
): void {
  const setFields = fields.filter(
    (field) => data[field] !== undefined && data[field] !== null,
  );

  if (setFields.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${entityName} requires exactly one of: ${fields.map(String).join(", ")}`,
    });
  }

  if (setFields.length > 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${entityName} cannot have more than one of: ${fields.map(String).join(", ")}`,
    });
  }
}

/**
 * Validate at least one field is present
 */
export function validateAtLeastOne<T extends Record<string, unknown>>(
  data: T,
  fields: Array<keyof T>,
  entityName = "Entity",
): void {
  const hasAtLeastOne = fields.some(
    (field) => data[field] !== undefined && data[field] !== null,
  );

  if (!hasAtLeastOne) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${entityName} requires at least one of: ${fields.map(String).join(", ")}`,
    });
  }
}

/**
 * Validate array length constraints
 */
export function validateArrayLength<T>(
  array: T[] | undefined | null,
  constraints: { min?: number; max?: number },
  fieldName: string,
): void {
  if (!array) {
    if (constraints.min && constraints.min > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `${fieldName} requires at least ${constraints.min} items`,
      });
    }
    return;
  }

  if (constraints.min !== undefined && array.length < constraints.min) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${fieldName} requires at least ${constraints.min} items`,
    });
  }

  if (constraints.max !== undefined && array.length > constraints.max) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${fieldName} cannot exceed ${constraints.max} items`,
    });
  }
}

/**
 * Validate numeric range
 */
export function validateRange(
  value: number | undefined | null,
  constraints: { min?: number; max?: number },
  fieldName: string,
): void {
  if (value === undefined || value === null) {
    return;
  }

  if (constraints.min !== undefined && value < constraints.min) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${fieldName} must be at least ${constraints.min}`,
    });
  }

  if (constraints.max !== undefined && value > constraints.max) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${fieldName} cannot exceed ${constraints.max}`,
    });
  }
}
