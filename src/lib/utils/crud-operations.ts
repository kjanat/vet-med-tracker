import { TRPCError } from "@trpc/server";
import { and, eq, isNull, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

/**
 * Common CRUD operation utilities for reducing boilerplate
 */

/**
 * Type for Drizzle database client used in CRUD operations
 * Using 'any' here provides flexibility for different Drizzle database types
 * (pooled vs unpooled, different backends) while maintaining type safety at call sites.
 * The alternative of using complex Drizzle generics causes type inference issues.
 * Note: The noExplicitAny warning is intentionally accepted here as the type alias
 * provides necessary flexibility while maintaining type safety at call sites.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// biome-ignore lint/suspicious/noExplicitAny: Drizzle DB type flexibility required
type DrizzleDB = any;

/**
 * Creates a standard "not found" error
 */
export function createNotFoundError(entityName: string): TRPCError {
  return new TRPCError({
    code: "NOT_FOUND",
    message: `${entityName} not found`,
  });
}

/**
 * Creates household-scoped query conditions with soft-delete check
 */
export function householdScopeConditions<T extends PgTable>(
  _table: T,
  id: string,
  householdId: string,
  idColumn: PgColumn,
  householdColumn: PgColumn,
  deletedAtColumn: PgColumn,
): SQL<unknown>[] {
  return [
    eq(idColumn, id),
    eq(householdColumn, householdId),
    isNull(deletedAtColumn),
  ];
}

/**
 * Creates a standardized soft-delete mutation value
 */
export function softDeleteValue() {
  return { deletedAt: new Date() };
}

/**
 * Validates that a mutation result exists and returns the first item
 * Throws NOT_FOUND error if result is empty
 */
export function validateMutationResult<T>(result: T[], entityName: string): T {
  if (!result[0]) {
    throw createNotFoundError(entityName);
  }
  return result[0];
}

/**
 * Removes undefined values from an object for clean database inserts/updates
 * More concise than manual filtering
 */
export function cleanUndefinedValues<T extends Record<string, unknown>>(
  obj: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

/**
 * Standard success response for delete operations
 */
export function deleteSuccessResponse() {
  return { success: true as const };
}

/**
 * Creates a standard soft-delete mutation handler
 * Reduces boilerplate for soft-delete endpoints
 */
export function createSoftDeleteHandler<T extends PgTable>(params: {
  table: T;
  idColumn: PgColumn;
  householdColumn: PgColumn;
  deletedAtColumn: PgColumn;
  entityName: string;
}) {
  const { table, idColumn, householdColumn, deletedAtColumn, entityName } =
    params;

  return async (db: DrizzleDB, input: { id: string; householdId: string }) => {
    const deleted = await db
      .update(table)
      .set(softDeleteValue())
      .where(
        and(
          ...householdScopeConditions(
            table,
            input.id,
            input.householdId,
            idColumn,
            householdColumn,
            deletedAtColumn,
          ),
        ),
      )
      .returning();

    validateMutationResult(deleted, entityName);
    return deleteSuccessResponse();
  };
}

/**
 * Creates household-scoped list query conditions
 * Reduces duplication in list queries with soft-delete check
 */
export function createListQueryConditions<T extends PgTable>(
  _table: T,
  householdId: string,
  householdColumn: PgColumn,
  deletedAtColumn: PgColumn,
): SQL<unknown>[] {
  return [eq(householdColumn, householdId), isNull(deletedAtColumn)];
}

/**
 * Creates a standard household-scoped update mutation handler
 * Reduces boilerplate for update endpoints
 */
export function createUpdateHandler<T extends PgTable>(params: {
  table: T;
  idColumn: PgColumn;
  householdColumn: PgColumn;
  deletedAtColumn: PgColumn;
  entityName: string;
  transformData?: (data: Record<string, unknown>) => Record<string, unknown>;
}) {
  const {
    table,
    idColumn,
    householdColumn,
    deletedAtColumn,
    entityName,
    transformData,
  } = params;

  return async (
    db: DrizzleDB,
    input: { id: string; householdId: string } & Record<string, unknown>,
  ) => {
    const { id, householdId, ...updateData } = input;

    // Apply optional data transformation
    const processedData = transformData
      ? transformData(updateData)
      : updateData;

    // Clean undefined values
    const cleanData = cleanUndefinedValues(processedData);

    const updated = await db
      .update(table)
      .set(cleanData)
      .where(
        and(
          ...householdScopeConditions(
            table,
            id,
            householdId,
            idColumn,
            householdColumn,
            deletedAtColumn,
          ),
        ),
      )
      .returning();

    return validateMutationResult(updated, entityName);
  };
}

/**
 * Creates a standard household-scoped getById query handler
 * Reduces boilerplate for getById endpoints
 */
export function createGetByIdHandler<T extends PgTable>(params: {
  table: T;
  idColumn: PgColumn;
  householdColumn: PgColumn;
  deletedAtColumn: PgColumn;
  entityName: string;
}) {
  const { table, idColumn, householdColumn, deletedAtColumn, entityName } =
    params;

  return async (db: DrizzleDB, input: { id: string; householdId: string }) => {
    const result = await db
      .select()
      .from(table)
      .where(
        and(
          ...householdScopeConditions(
            table,
            input.id,
            input.householdId,
            idColumn,
            householdColumn,
            deletedAtColumn,
          ),
        ),
      )
      .limit(1);

    return validateMutationResult(result, entityName);
  };
}

/**
 * Creates a standard household-scoped create mutation handler
 * Reduces boilerplate for create endpoints with optional data transformation
 */
export function createCreateHandler<T extends PgTable>(params: {
  table: T;
  entityName: string;
  transformData?: (data: Record<string, unknown>) => Record<string, unknown>;
}) {
  const { table, entityName, transformData } = params;

  return async (db: DrizzleDB, input: Record<string, unknown>) => {
    // Apply optional data transformation
    const processedData = transformData ? transformData(input) : input;

    // Clean undefined values
    const cleanData = cleanUndefinedValues(processedData);

    const result = await db.insert(table).values(cleanData).returning();

    return validateMutationResult(result, entityName);
  };
}

/**
 * Creates an update handler with audit logging support
 * For entities that require audit trail of changes
 */
export function createUpdateHandlerWithAudit<T extends PgTable>(params: {
  table: T;
  idColumn: PgColumn;
  deletedAtColumn: PgColumn;
  entityName: string;
  resourceType: string;
  transformData?: (data: Record<string, unknown>) => Record<string, unknown>;
  getHouseholdId: (input: Record<string, unknown>) => string;
  getRelatedTable?: () => { table: PgTable; joinColumn: PgColumn };
}) {
  const {
    table,
    idColumn,
    deletedAtColumn,
    entityName,
    resourceType,
    transformData,
    getHouseholdId,
    getRelatedTable,
  } = params;

  return async (
    db: DrizzleDB,
    input: { id: string } & Record<string, unknown>,
    userId: string,
    createAuditLogFn: (
      db: DrizzleDB,
      logData: {
        action: string;
        householdId: string;
        newValues?: Record<string, unknown>;
        oldValues?: Record<string, unknown>;
        resourceId: string;
        resourceType: string;
        userId: string;
      },
    ) => Promise<void>,
  ) => {
    const { id, ...rawUpdateData } = input;
    const householdId = getHouseholdId(input);

    // Apply optional data transformation
    const processedData = transformData
      ? transformData(rawUpdateData)
      : rawUpdateData;
    const updateData = cleanUndefinedValues(processedData);

    // Fetch existing record for audit
    let existingQuery = db.select().from(table);

    if (getRelatedTable) {
      const { table: relatedTable, joinColumn } = getRelatedTable();
      existingQuery = existingQuery
        .innerJoin(relatedTable, eq(joinColumn, idColumn))
        .where(and(eq(idColumn, id), isNull(deletedAtColumn)));
    } else {
      existingQuery = existingQuery.where(
        and(eq(idColumn, id), isNull(deletedAtColumn)),
      );
    }

    const existing = await existingQuery.limit(1);

    if (!existing[0]) {
      throw createNotFoundError(entityName);
    }

    // Perform update
    await db.update(table).set(updateData).where(eq(idColumn, id)).returning();

    // Create audit log
    await createAuditLogFn(db, {
      action: "UPDATE",
      householdId,
      newValues: updateData,
      oldValues: getRelatedTable ? existing[0]?.[resourceType] : existing[0],
      resourceId: id,
      resourceType,
      userId,
    });

    // Fetch complete updated record
    let completeQuery = db.select().from(table);

    if (getRelatedTable) {
      const { table: relatedTable, joinColumn } = getRelatedTable();
      completeQuery = completeQuery
        .innerJoin(relatedTable, eq(joinColumn, idColumn))
        .where(eq(idColumn, id));
    } else {
      completeQuery = completeQuery.where(eq(idColumn, id));
    }

    const result = await completeQuery.limit(1);
    return result[0];
  };
}

/**
 * Creates a soft-delete handler with audit logging support
 * For entities that require audit trail of deletions
 */
export function createSoftDeleteHandlerWithAudit<T extends PgTable>(params: {
  table: T;
  idColumn: PgColumn;
  deletedAtColumn: PgColumn;
  entityName: string;
  resourceType: string;
  getHouseholdId: (input: Record<string, unknown>) => string;
  getRelatedTable?: () => { table: PgTable; joinColumn: PgColumn };
}) {
  const {
    table,
    idColumn,
    deletedAtColumn,
    entityName,
    resourceType,
    getHouseholdId,
    getRelatedTable,
  } = params;

  return async (
    db: DrizzleDB,
    input: { id: string } & Record<string, unknown>,
    userId: string,
    createAuditLogFn: (
      db: DrizzleDB,
      logData: {
        action: string;
        householdId: string;
        oldValues?: Record<string, unknown>;
        resourceId: string;
        resourceType: string;
        userId: string;
      },
    ) => Promise<void>,
  ) => {
    const { id } = input;
    const householdId = getHouseholdId(input);

    // Fetch existing record for audit
    let existingQuery = db.select().from(table);

    if (getRelatedTable) {
      const { table: relatedTable, joinColumn } = getRelatedTable();
      existingQuery = existingQuery
        .innerJoin(relatedTable, eq(joinColumn, idColumn))
        .where(and(eq(idColumn, id), isNull(deletedAtColumn)));
    } else {
      existingQuery = existingQuery.where(
        and(eq(idColumn, id), isNull(deletedAtColumn)),
      );
    }

    const existing = await existingQuery.limit(1);
    validateMutationResult(existing, entityName);

    // Perform soft delete
    const result = await db
      .update(table)
      .set(softDeleteValue())
      .where(eq(idColumn, id))
      .returning();

    // Create audit log
    await createAuditLogFn(db, {
      action: "DELETE",
      householdId,
      oldValues: getRelatedTable ? existing[0]?.[resourceType] : existing[0],
      resourceId: id,
      resourceType,
      userId,
    });

    return { [resourceType]: result[0], success: true };
  };
}
