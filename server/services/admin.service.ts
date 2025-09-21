// services/admin.service.ts

import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import {
  vetmedAdministrations as administrations,
  vetmedAnimals as animals,
  type NewAdministration,
  vetmedRegimens as regimens,
} from "@/db/schema";
import type { RecordAdministrationInput } from "@/domain/admin.types.ts";
import { deriveStatus } from "@/domain/status.ts";
import { closestScheduled, toAnimalLocal } from "@/domain/time.ts";

export async function getAnimalOrThrow(
  db: typeof import("@/db/drizzle").db,
  animalId: string,
  householdId: string,
) {
  const [row] = await db
    .select()
    .from(animals)
    .where(and(eq(animals.id, animalId), eq(animals.householdId, householdId)))
    .limit(1)
    .execute();
  if (!row)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Animal not found in this household",
    });
  return row;
}

export async function getActiveRegimenOrThrow(
  db: typeof import("@/db/drizzle").db,
  regimenId: string,
  animalId: string,
) {
  const [row] = await db
    .select()
    .from(regimens)
    .where(
      and(
        eq(regimens.id, regimenId),
        eq(regimens.animalId, animalId),
        eq(regimens.active, true),
      ),
    )
    .limit(1)
    .execute();
  if (!row)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Active regimen not found for this animal",
    });
  return row;
}
export async function findByIdempotency(
  db: typeof import("@/db/drizzle").db,
  key: string,
) {
  const [row] = await db
    .select()
    .from(administrations)
    .where(eq(administrations.idempotencyKey, key))
    .limit(1)
    .execute();
  return row ?? null;
}

export function computeScheduleAndStatus(
  regimen: {
    scheduleType: string;
    timesLocal: string[] | null;
    cutoffMinutes: number;
  },
  animalTz: string,
  administeredAt: Date,
  provided?: RecordAdministrationInput["status"],
) {
  const { minutes: adminMinutes, local } = toAnimalLocal(
    administeredAt,
    animalTz,
  );
  const closest =
    regimen.scheduleType === "FIXED"
      ? closestScheduled(adminMinutes, regimen.timesLocal)
      : null;
  const status = deriveStatus(
    adminMinutes,
    closest?.minutes ?? null,
    regimen.cutoffMinutes,
    provided,
    regimen.scheduleType,
  );

  let scheduledFor: Date | null = null;
  if (closest) {
    const [h, m] = closest.time.split(":").map(Number);
    const scheduled = new Date(local);
    scheduled.setHours(h ?? 0, m ?? 0, 0, 0);
    scheduledFor = scheduled;
  }

  return { scheduledFor, status };
}

export async function recordAdministration(
  db: typeof import("@/db/drizzle").db,
  caregiverId: string,
  input: RecordAdministrationInput,
  animal: { id: string; timezone: string | null },
  regimen: {
    id: string;
    dose: string | null;
    scheduleType: string;
    timesLocal: string[] | null;
    cutoffMinutes: number;
  },
) {
  const administeredAt = input.administeredAt ?? new Date();
  const { status, scheduledFor } = computeScheduleAndStatus(
    {
      cutoffMinutes: regimen.cutoffMinutes,
      scheduleType: regimen.scheduleType,
      timesLocal: regimen.timesLocal,
    },
    animal.timezone || "UTC",
    administeredAt,
    input.status,
  );

  const newAdmin: NewAdministration = {
    adverseEvent: false,
    animalId: animal.id,
    caregiverId,
    dose: input.dose || regimen.dose || null,
    householdId: input.householdId,
    idempotencyKey: input.idempotencyKey,
    mediaUrls: input.mediaUrls || null,
    notes: input.notes || null,
    recordedAt: administeredAt,
    regimenId: input.regimenId,
    scheduledFor,
    site: input.site || null,
    sourceItemId: input.inventorySourceId || null,
    status,
  };

  const [created] = await db
    .insert(administrations)
    .values(newAdmin)
    .onConflictDoNothing()
    .returning()
    .execute();

  // If conflict (idempotent), fetch and return the existing record
  if (!created) {
    const existing = await findByIdempotency(db, input.idempotencyKey);
    if (existing) return existing;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Idempotency conflict without existing record",
    });
  }

  return created;
}
