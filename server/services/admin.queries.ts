import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";
import {
  vetmedAdministrations as administrations,
  vetmedAnimals as animals,
  vetmedAuditLog as auditLog,
  vetmedInventoryItems as inventoryItems,
  vetmedMedicationCatalog as medicationCatalog,
  vetmedRegimens as regimens,
  vetmedUsers as users,
} from "@/db/schema";

export type ListInput = {
  householdId: string;
  animalId?: string;
  startDate?: Date; // inclusive, already parsed via IsoDateZ in router
  endDate?: Date; // exclusive
  limit?: number; // router defaults to 50
};

// Returned record shape (matches your previous list() output, with enrichments)
export type ListedAdministration = Awaited<
  ReturnType<typeof listAdministrations>
>[number];

export async function listAdministrations(
  db: typeof import("@/db/drizzle").db,
  dbUserId: string,
  input: ListInput,
) {
  const limit = input.limit ?? 50;

  const whereClauses = [eq(administrations.householdId, input.householdId)];
  if (input.animalId)
    whereClauses.push(eq(administrations.animalId, input.animalId));
  if (input.startDate)
    whereClauses.push(gte(administrations.recordedAt, input.startDate));
  if (input.endDate)
    whereClauses.push(lt(administrations.recordedAt, input.endDate));

  // Main, wide select
  const rows = await db
    .select({
      // adverse event / cosign
      adverseEvent: administrations.adverseEvent,
      adverseEventDescription: administrations.adverseEventDescription,
      animalBreed: animals.breed,
      animalId: administrations.animalId,

      // animal
      animalName: animals.name,
      animalSpecies: animals.species,
      animalTimezone: animals.timezone,
      animalWeightKg: animals.weightKg,
      caregiverEmail: users.email,
      caregiverId: administrations.caregiverId,

      // caregiver
      caregiverName: users.name,
      coSignedAt: administrations.coSignedAt,
      coSignNotes: administrations.coSignNotes,
      coSignUserId: administrations.coSignUserId,
      createdAt: administrations.createdAt,
      dose: administrations.dose,
      householdId: administrations.householdId,
      // core fields
      id: administrations.id,
      inventoryBrandOverride: inventoryItems.brandOverride,
      inventoryExpiresOn: inventoryItems.expiresOn,

      // inventory (optional)
      inventoryItemName: inventoryItems.medicationName,
      inventoryLot: inventoryItems.lot,
      inventoryOpenedOn: inventoryItems.openedOn,
      inventorySupplier: inventoryItems.supplier,
      inventoryUnitsRemaining: inventoryItems.unitsRemaining,
      inventoryUnitType: inventoryItems.unitType,
      mediaUrls: administrations.mediaUrls,
      medicationBrandName: medicationCatalog.brandName,
      medicationForm: medicationCatalog.form,

      // catalog (optional)
      medicationGenericName: medicationCatalog.genericName,
      medicationRoute: medicationCatalog.route,
      medicationStrength: medicationCatalog.strength,
      notes: administrations.notes,
      recordedAt: administrations.recordedAt,
      regimenDose: regimens.dose,
      regimenId: administrations.regimenId,
      regimenInstructions: regimens.instructions,
      regimenMedicationId: regimens.medicationId,
      regimenMedicationName: regimens.medicationName,

      // regimen
      regimenName: regimens.name,
      regimenRequiresCoSign: regimens.requiresCoSign,
      regimenRoute: regimens.route,
      scheduledFor: administrations.scheduledFor,
      site: administrations.site,
      sourceItemId: administrations.sourceItemId,
      status: administrations.status,
      updatedAt: administrations.updatedAt,
    })
    .from(administrations)
    .innerJoin(animals, eq(administrations.animalId, animals.id))
    .innerJoin(users, eq(administrations.caregiverId, users.id))
    .innerJoin(regimens, eq(administrations.regimenId, regimens.id))
    .leftJoin(
      medicationCatalog,
      eq(regimens.medicationId, medicationCatalog.id),
    )
    .leftJoin(
      inventoryItems,
      eq(administrations.sourceItemId, inventoryItems.id),
    )
    .where(and(...whereClauses))
    // In practice, most UIs want newest first; change to asc() if you prefer.
    .orderBy(desc(administrations.recordedAt))
    .limit(limit)
    .execute();

  if (rows.length === 0) return [];

  // Batch lookup: audit edits for all records
  const recordIds = rows.map((r) => r.id);
  const edits = await db
    .select({
      action: auditLog.action,
      newValues: auditLog.newValues,
      oldValues: auditLog.oldValues,
      resourceId: auditLog.resourceId,
      timestamp: auditLog.timestamp,
      userEmail: users.email,
      userId: auditLog.userId,
      userName: users.name,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id))
    .where(
      and(
        inArray(auditLog.resourceId, recordIds),
        eq(auditLog.resourceType, "administrations"),
        eq(auditLog.action, "UPDATE"),
      ),
    )
    .orderBy(auditLog.timestamp)
    .execute();

  // Map edits by resource
  const editsByRecord = new Map<string, typeof edits>();
  for (const e of edits) {
    const list = editsByRecord.get(e.resourceId ?? "") ?? [];
    list.push(e);
    editsByRecord.set(e.resourceId ?? "", list);
  }

  // Batch lookup: co-signer user details (optional)
  const cosignUserIds = Array.from(
    new Set(rows.map((r) => r.coSignUserId).filter(Boolean) as string[]),
  );
  const cosignUsers = cosignUserIds.length
    ? await db
        .select({ email: users.email, id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, cosignUserIds))
        .execute()
    : [];
  const cosignById = new Map(cosignUsers.map((u) => [u.id, u]));

  // Enrich + shape
  const enriched = rows.map((r) => {
    const history = editsByRecord.get(r.id) ?? [];
    const last = history.at(-1);

    const coSignerDetails = r.coSignUserId
      ? (cosignById.get(r.coSignUserId) ?? null)
      : null;

    const cosignPending =
      r.regimenRequiresCoSign && !r.coSignedAt && r.caregiverId !== dbUserId;

    // Derived medication display fields
    const medicationDisplayName =
      r.medicationGenericName ||
      r.regimenMedicationName ||
      r.inventoryItemName ||
      "Unknown Medication";
    const medicationDisplayRoute =
      r.medicationRoute || r.regimenRoute || "Unknown";
    const medicationDisplayForm = r.medicationForm || "Unknown";
    const medicationDisplayStrength = r.medicationStrength || "Unknown";

    return {
      ...r,
      coSignerDetails,
      cosignPending,
      editedAt: last?.timestamp ?? null,
      editedBy: last?.userName ?? null,
      editHistory: history.map((h) => ({
        action: h.action,
        changes: { new: h.newValues, old: h.oldValues },
        timestamp: h.timestamp,
        userEmail: h.userEmail,
        userId: h.userId,
        userName: h.userName ?? "Unknown User",
      })),
      isEdited: history.length > 0,
      medicationDisplayForm,
      medicationDisplayName,
      medicationDisplayRoute,
      medicationDisplayStrength,
    };
  });

  return enriched;
}
