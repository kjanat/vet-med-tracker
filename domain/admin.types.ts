// domain/admin.types.ts
import { z } from "zod";
import { adminStatusEnum } from "@/db/schema";

export const ADMIN_STATUS = {
  LATE: 180,
  ON_TIME: 60,
} as const;

export type AdminStatus = (typeof adminStatusEnum.enumValues)[number];

export const AdminStatusZ = z.enum(
  adminStatusEnum.enumValues as [AdminStatus, ...AdminStatus[]],
);

// Normalize ISO inputs to Date at the edge
export const IsoDateZ = z.preprocess(
  (v) => (typeof v === "string" ? new Date(v) : v),
  z.date(),
);

export const RecordAdministrationZ = z.object({
  administeredAt: IsoDateZ.optional(),
  allowOverride: z.boolean().default(false),
  animalId: z.uuid(),
  conditionTags: z.array(z.string()).optional(),
  dose: z.string().optional(),
  householdId: z.uuid(),
  idempotencyKey: z.string().min(8),
  inventorySourceId: z.uuid().optional(),
  mediaUrls: z.array(z.url()).optional(),
  notes: z.string().optional(),
  regimenId: z.uuid(),
  requiresCoSign: z.boolean().default(false),
  site: z.string().optional(),
  status: AdminStatusZ.optional(),
});

export const RecordBulkAdministrationZ = RecordAdministrationZ.omit({
  animalId: true,
  requiresCoSign: true,
}).extend({
  animalIds: z.array(z.uuid()).min(1).max(50),
  idempotencyKey: z.string().min(6), // base prefix; we suffix per animal
});

export type RecordAdministrationInput = z.infer<typeof RecordAdministrationZ>;
export type RecordBulkAdministrationInput = z.infer<
  typeof RecordBulkAdministrationZ
>;
