"use client";

import { z } from "zod";

/**
 * Type-safe query parameter utilities for consistent URL state management
 * across the application. Provides validation, type safety, and developer experience.
 */

// =============================================================================
// SEARCH PARAM TYPES
// =============================================================================

/**
 * Search parameters for the history page filters
 */
export interface HistorySearchParams {
  /** Animal ID to filter by */
  animalId?: string;
  /** Regimen ID to filter by */
  regimenId?: string;
  /** Caregiver ID to filter by */
  caregiverId?: string;
  /** Type of administration to show */
  type?: "all" | "scheduled" | "prn";
  /** Status filter for administrations */
  status?: "on-time" | "late" | "missed" | "all";
  /** View mode for history display */
  view?: "list" | "calendar";
  /** Start date for filtering (ISO date string) */
  from?: string;
  /** End date for filtering (ISO date string) */
  to?: string;
}

/**
 * Search parameters for settings page tabs
 */
export interface SettingsSearchParams {
  /** Active settings tab */
  tab?: "data" | "preferences" | "notifications" | "household";
}

/**
 * Search parameters for insights page
 */
export interface InsightsSearchParams {
  /** Start date for insights data (ISO date string) */
  from?: string;
  /** End date for insights data (ISO date string) */
  to?: string;
  /** Animal ID to filter insights by */
  animalId?: string;
  /** View mode for insights */
  view?: "summary" | "detailed" | "charts";
  /** Metric focus for insights */
  metric?: "compliance" | "timing" | "inventory" | "all";
}

/**
 * Search parameters for record page
 */
export interface RecordSearchParams {
  /** Pre-selected animal ID */
  animalId?: string;
  /** Pre-selected regimen ID */
  regimenId?: string;
  /** Return URL after successful recording */
  returnTo?: string;
  /** Recording mode */
  mode?: "quick" | "detailed";
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const HistorySearchParamsSchema = z.object({
  animalId: z.string().optional(),
  regimenId: z.string().optional(),
  caregiverId: z.string().optional(),
  type: z.enum(["all", "scheduled", "prn"]).optional(),
  status: z.enum(["on-time", "late", "missed", "all"]).optional(),
  view: z.enum(["list", "calendar"]).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const SettingsSearchParamsSchema = z.object({
  tab: z.enum(["data", "preferences", "notifications", "household"]).optional(),
});

const InsightsSearchParamsSchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  animalId: z.string().optional(),
  view: z.enum(["summary", "detailed", "charts"]).optional(),
  metric: z.enum(["compliance", "timing", "inventory", "all"]).optional(),
});

const RecordSearchParamsSchema = z.object({
  animalId: z.string().optional(),
  regimenId: z.string().optional(),
  returnTo: z.string().optional(),
  mode: z.enum(["quick", "detailed"]).optional(),
});

// Schema mapping for type-safe validation
const schemaMap = {
  history: HistorySearchParamsSchema,
  settings: SettingsSearchParamsSchema,
  insights: InsightsSearchParamsSchema,
  record: RecordSearchParamsSchema,
} as const;

export type SearchParamPageType = keyof typeof schemaMap;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Creates a type-safe query string from parameters
 *
 * @template T - The type of search parameters
 * @param params - The parameters to include in the query string
 * @param currentParams - Existing URLSearchParams to merge with (optional)
 * @returns A query string without the leading '?'
 *
 * @example
 * ```typescript
 * const queryString = createTypedQueryString<HistorySearchParams>({
 *   animalId: "123",
 *   type: "scheduled",
 *   from: undefined // This will be removed from the URL
 * });
 * // Result: "animalId=123&type=scheduled"
 * ```
 */
export function createTypedQueryString<T>(
  params: Partial<T>,
  currentParams?: URLSearchParams,
): string {
  const newParams = new URLSearchParams(currentParams);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      newParams.delete(key);
    } else {
      newParams.set(key, String(value));
    }
  });

  return newParams.toString();
}

/**
 * Parses search parameters with type safety and validation
 *
 * @template T - The expected return type
 * @param searchParams - URLSearchParams or ReadonlyURLSearchParams to parse
 * @param pageType - The page type for validation schema lookup
 * @returns Parsed and validated search parameters
 *
 * @example
 * ```typescript
 * const params = parseTypedSearchParams<HistorySearchParams>(
 *   searchParams,
 *   'history'
 * );
 * // params.type is now properly typed as "all" | "scheduled" | "prn" | undefined
 * ```
 */
export function parseTypedSearchParams<T>(
  searchParams: URLSearchParams,
  pageType: SearchParamPageType,
): T {
  const schema = schemaMap[pageType];
  const rawParams: Record<string, string | undefined> = {};

  // Convert URLSearchParams to plain object
  for (const [key, value] of searchParams.entries()) {
    rawParams[key] = value;
  }

  // Validate and parse with schema
  const result = schema.safeParse(rawParams);

  if (result.success) {
    return result.data as T;
  }

  // Log validation errors in development
  if (process.env.NODE_ENV === "development") {
    console.warn(
      `Invalid search parameters for page "${pageType}":`,
      result.error.format(),
    );
  }

  // Return empty object on validation failure
  return {} as T;
}

/**
 * Updates specific search parameters while preserving others
 *
 * @template T - The type of search parameters
 * @param currentParams - Current URLSearchParams
 * @param updates - Partial updates to apply
 * @returns New query string with updates applied
 *
 * @example
 * ```typescript
 * const newQuery = updateSearchParams<HistorySearchParams>(
 *   searchParams,
 *   { type: "scheduled", view: undefined }
 * );
 * // Preserves other params but sets type and removes view
 * ```
 */
export function updateSearchParams<T>(
  currentParams: URLSearchParams,
  updates: Partial<T>,
): string {
  return createTypedQueryString(
    updates,
    new URLSearchParams(currentParams.toString()),
  );
}

/**
 * Creates a type-safe search parameter getter with default values
 *
 * @template T - The type of search parameters
 * @param searchParams - URLSearchParams to read from
 * @param pageType - Page type for validation
 * @param defaults - Default values to merge with parsed params
 * @returns Parsed parameters merged with defaults
 *
 * @example
 * ```typescript
 * const params = getTypedSearchParams<HistorySearchParams>(
 *   searchParams,
 *   'history',
 *   { type: 'all', view: 'list' }
 * );
 * // Always returns type and view, even if not in URL
 * ```
 */
export function getTypedSearchParams<T>(
  searchParams: URLSearchParams,
  pageType: SearchParamPageType,
  defaults: Partial<T> = {},
): T {
  const parsed = parseTypedSearchParams<T>(searchParams, pageType);
  return { ...defaults, ...parsed } as T;
}

/**
 * Utility to check if search parameters have specific values
 *
 * @param searchParams - URLSearchParams to check
 * @param checks - Object with key-value pairs to check
 * @returns True if all checks pass
 *
 * @example
 * ```typescript
 * const hasFilters = hasSearchParamValues(searchParams, {
 *   type: 'scheduled',
 *   animalId: '123'
 * });
 * ```
 */
export function hasSearchParamValues(
  searchParams: URLSearchParams,
  checks: Record<string, string>,
): boolean {
  return Object.entries(checks).every(
    ([key, value]) => searchParams.get(key) === value,
  );
}

/**
 * Removes all search parameters matching the provided keys
 *
 * @param currentParams - Current URLSearchParams
 * @param keysToRemove - Array of parameter keys to remove
 * @returns New query string with specified keys removed
 *
 * @example
 * ```typescript
 * const newQuery = removeSearchParams(searchParams, ['animalId', 'type']);
 * ```
 */
export function removeSearchParams(
  currentParams: URLSearchParams,
  keysToRemove: string[],
): string {
  const newParams = new URLSearchParams(currentParams.toString());

  keysToRemove.forEach((key) => {
    newParams.delete(key);
  });

  return newParams.toString();
}

// =============================================================================
// TYPE GUARDS AND VALIDATION HELPERS
// =============================================================================

/**
 * Type guard to check if a value is a valid HistorySearchParams type
 */
export function isValidHistoryType(
  value: string | undefined,
): value is NonNullable<HistorySearchParams["type"]> {
  return value !== undefined && ["all", "scheduled", "prn"].includes(value);
}

/**
 * Type guard to check if a value is a valid HistorySearchParams status
 */
export function isValidHistoryStatus(
  value: string | undefined,
): value is NonNullable<HistorySearchParams["status"]> {
  return (
    value !== undefined && ["on-time", "late", "missed", "all"].includes(value)
  );
}

/**
 * Type guard to check if a value is a valid HistorySearchParams view
 */
export function isValidHistoryView(
  value: string | undefined,
): value is NonNullable<HistorySearchParams["view"]> {
  return value !== undefined && ["list", "calendar"].includes(value);
}

/**
 * Type guard to check if a value is a valid SettingsSearchParams tab
 */
export function isValidSettingsTab(
  value: string | undefined,
): value is NonNullable<SettingsSearchParams["tab"]> {
  return (
    value !== undefined &&
    ["data", "preferences", "notifications", "household"].includes(value)
  );
}

/**
 * Validates if a string is a valid ISO date format (YYYY-MM-DD)
 */
export function isValidISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

/**
 * Validates if a string is a valid UUID
 */
export function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
