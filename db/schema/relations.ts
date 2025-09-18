import { relations } from "drizzle-orm/relations";
import {
  vetmedAdministrations,
  vetmedAnimals,
  vetmedAuditLog,
  vetmedHouseholds,
  vetmedInventoryItems,
  vetmedMedicationCatalog,
  vetmedMemberships,
  vetmedNotificationQueue,
  vetmedRegimens,
  vetmedUsers,
} from "./tables";

export const vetmedAnimalsRelations = relations(
  vetmedAnimals,
  ({ one, many }) => ({
    vetmedAdministrations: many(vetmedAdministrations),
    vetmedHousehold: one(vetmedHouseholds, {
      fields: [vetmedAnimals.householdId],
      references: [vetmedHouseholds.id],
    }),
    vetmedInventoryItems: many(vetmedInventoryItems),
    vetmedRegimens: many(vetmedRegimens),
  }),
);

export const vetmedHouseholdsRelations = relations(
  vetmedHouseholds,
  ({ many }) => ({
    vetmedAdministrations: many(vetmedAdministrations),
    vetmedAnimals: many(vetmedAnimals),
    vetmedAuditLogs: many(vetmedAuditLog),
    vetmedInventoryItems: many(vetmedInventoryItems),
    vetmedMemberships: many(vetmedMemberships),
    vetmedNotificationQueues: many(vetmedNotificationQueue),
  }),
);

export const vetmedMembershipsRelations = relations(
  vetmedMemberships,
  ({ one }) => ({
    vetmedHousehold: one(vetmedHouseholds, {
      fields: [vetmedMemberships.householdId],
      references: [vetmedHouseholds.id],
    }),
    vetmedUser: one(vetmedUsers, {
      fields: [vetmedMemberships.userId],
      references: [vetmedUsers.id],
    }),
  }),
);

export const vetmedUsersRelations = relations(vetmedUsers, ({ many }) => ({
  vetmedAdministrations_caregiverId: many(vetmedAdministrations, {
    relationName: "vetmedAdministrations_caregiverId_vetmedUsers_id",
  }),
  vetmedAdministrations_coSignUserId: many(vetmedAdministrations, {
    relationName: "vetmedAdministrations_coSignUserId_vetmedUsers_id",
  }),
  vetmedAuditLogs: many(vetmedAuditLog),
  vetmedMemberships: many(vetmedMemberships),
  vetmedNotificationQueues: many(vetmedNotificationQueue),
}));

export const vetmedInventoryItemsRelations = relations(
  vetmedInventoryItems,
  ({ one, many }) => ({
    vetmedAdministrations: many(vetmedAdministrations),
    vetmedAnimal: one(vetmedAnimals, {
      fields: [vetmedInventoryItems.assignedAnimalId],
      references: [vetmedAnimals.id],
    }),
    vetmedHousehold: one(vetmedHouseholds, {
      fields: [vetmedInventoryItems.householdId],
      references: [vetmedHouseholds.id],
    }),
    vetmedMedicationCatalog: one(vetmedMedicationCatalog, {
      fields: [vetmedInventoryItems.medicationId],
      references: [vetmedMedicationCatalog.id],
    }),
  }),
);

export const vetmedMedicationCatalogRelations = relations(
  vetmedMedicationCatalog,
  ({ many }) => ({
    vetmedInventoryItems: many(vetmedInventoryItems),
    vetmedRegimens: many(vetmedRegimens),
  }),
);

export const vetmedNotificationQueueRelations = relations(
  vetmedNotificationQueue,
  ({ one }) => ({
    vetmedHousehold: one(vetmedHouseholds, {
      fields: [vetmedNotificationQueue.householdId],
      references: [vetmedHouseholds.id],
    }),
    vetmedUser: one(vetmedUsers, {
      fields: [vetmedNotificationQueue.userId],
      references: [vetmedUsers.id],
    }),
  }),
);

export const vetmedAuditLogRelations = relations(vetmedAuditLog, ({ one }) => ({
  vetmedHousehold: one(vetmedHouseholds, {
    fields: [vetmedAuditLog.householdId],
    references: [vetmedHouseholds.id],
  }),
  vetmedUser: one(vetmedUsers, {
    fields: [vetmedAuditLog.userId],
    references: [vetmedUsers.id],
  }),
}));

export const vetmedRegimensRelations = relations(
  vetmedRegimens,
  ({ one, many }) => ({
    vetmedAdministrations: many(vetmedAdministrations),
    vetmedAnimal: one(vetmedAnimals, {
      fields: [vetmedRegimens.animalId],
      references: [vetmedAnimals.id],
    }),
    vetmedMedicationCatalog: one(vetmedMedicationCatalog, {
      fields: [vetmedRegimens.medicationId],
      references: [vetmedMedicationCatalog.id],
    }),
  }),
);

export const vetmedAdministrationsRelations = relations(
  vetmedAdministrations,
  ({ one }) => ({
    vetmedAnimal: one(vetmedAnimals, {
      fields: [vetmedAdministrations.animalId],
      references: [vetmedAnimals.id],
    }),
    vetmedHousehold: one(vetmedHouseholds, {
      fields: [vetmedAdministrations.householdId],
      references: [vetmedHouseholds.id],
    }),
    vetmedInventoryItem: one(vetmedInventoryItems, {
      fields: [vetmedAdministrations.sourceItemId],
      references: [vetmedInventoryItems.id],
    }),
    vetmedRegimen: one(vetmedRegimens, {
      fields: [vetmedAdministrations.regimenId],
      references: [vetmedRegimens.id],
    }),
    vetmedUser_caregiverId: one(vetmedUsers, {
      fields: [vetmedAdministrations.caregiverId],
      references: [vetmedUsers.id],
      relationName: "vetmedAdministrations_caregiverId_vetmedUsers_id",
    }),
    vetmedUser_coSignUserId: one(vetmedUsers, {
      fields: [vetmedAdministrations.coSignUserId],
      references: [vetmedUsers.id],
      relationName: "vetmedAdministrations_coSignUserId_vetmedUsers_id",
    }),
  }),
);
