// server/api/routers/admin.ts

import { z } from "zod";
// Shared domain types/schemas
import {
  IsoDateZ,
  RecordAdministrationZ,
  RecordBulkAdministrationZ,
} from "@/domain/admin.types";
import { createTRPCRouter, householdProcedure } from "@/server/api/trpc";
// Query layer (reads)
import { listAdministrations } from "@/server/services/admin.queries";
// Service layer (writes/mutations)
import {
  getActiveRegimenOrThrow,
  getAnimalOrThrow,
  recordAdministration,
} from "@/server/services/admin.service";

/**
 * Local input schemas for the thin router.
 * These mirror what your old file validated inline, but live here
 * only as lightweight wiring to the service layer.
 */

const CosignZ = z.object({
  householdId: z.uuid(),
  notes: z.string().optional(),
  recordId: z.uuid(),
});

const UndoZ = z.object({
  householdId: z.uuid(),
  recordId: z.uuid(),
});

const DeleteZ = z.object({
  householdId: z.uuid(),
  recordId: z.uuid(),
});

const UpdateZ = z.object({
  householdId: z.uuid(),
  recordId: z.uuid(),
  updates: z.object({
    adverseEvent: z.boolean().optional(),
    adverseEventDescription: z.string().optional(),
    dose: z.string().optional(),
    mediaUrls: z.array(z.url()).optional(),
    notes: z.string().optional(),
    site: z.string().optional(),
  }),
});

const ListZ = z.object({
  animalId: z.uuid().optional(),
  endDate: IsoDateZ.optional(),
  householdId: z.uuid(),
  limit: z.number().min(1).max(100).default(50),
  startDate: IsoDateZ.optional(),
});

export const adminRouter = createTRPCRouter({
  // Co-sign an administration record
  cosign: householdProcedure.input(CosignZ).mutation(() => {
    throw new Error("Co-sign functionality not yet implemented");
  }),
  // Create a new administration record
  create: householdProcedure
    .input(RecordAdministrationZ)
    .mutation(async ({ ctx, input }) => {
      const animal = await getAnimalOrThrow(
        ctx.db,
        input.animalId,
        ctx.dbUser.id,
      );
      const regimen = await getActiveRegimenOrThrow(
        ctx.db,
        input.regimenId,
        ctx.dbUser.id,
      );
      return recordAdministration(
        ctx.db,
        ctx.dbUser.id,
        input,
        animal,
        regimen,
      );
    }),

  // Delete an administration record
  delete: householdProcedure.input(DeleteZ).mutation(() => {
    throw new Error("Delete functionality not yet implemented");
  }),

  // List administrations with joined/derived fields (batched)
  list: householdProcedure
    .input(ListZ)
    .query(({ ctx, input }) =>
      listAdministrations(ctx.db, ctx.dbUser.id, input),
    ),

  // Record administrations for multiple animals
  recordBulk: householdProcedure
    .input(RecordBulkAdministrationZ)
    .mutation(() => {
      throw new Error("Bulk record functionality not yet implemented");
    }),

  // Undo a recent administration (caregiver self-undo)
  undo: householdProcedure.input(UndoZ).mutation(() => {
    throw new Error("Undo functionality not yet implemented");
  }),

  // Update an administration record
  update: householdProcedure.input(UpdateZ).mutation(() => {
    throw new Error("Update functionality not yet implemented");
  }),
});
