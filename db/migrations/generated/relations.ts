import { relations } from "drizzle-orm/relations";
import {
  vetmedAdministrations,
  vetmedAnimals,
  vetmedAuditLog,
  vetmedCosignRequests,
  vetmedHouseholds,
  vetmedInventoryItems,
  vetmedMedicationCatalog,
  vetmedMemberships,
  vetmedNotificationQueue,
  vetmedNotifications,
  vetmedPushSubscriptions,
  vetmedRegimens,
  vetmedSuggestions,
  vetmedUsers,
} from "./schema";

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
    vetmedUsers: many(vetmedUsers),
  }),
);

export const vetmedHouseholdsRelations = relations(
  vetmedHouseholds,
  ({ many }) => ({
    vetmedAdministrations: many(vetmedAdministrations),
    vetmedAnimals: many(vetmedAnimals),
    vetmedAuditLogs: many(vetmedAuditLog),
    vetmedCosignRequests: many(vetmedCosignRequests),
    vetmedInventoryItems: many(vetmedInventoryItems),
    vetmedMemberships: many(vetmedMemberships),
    vetmedNotificationQueues: many(vetmedNotificationQueue),
    vetmedNotifications: many(vetmedNotifications),
    vetmedSuggestions: many(vetmedSuggestions),
    vetmedUsers: many(vetmedUsers),
  }),
);

export const vetmedSuggestionsRelations = relations(
  vetmedSuggestions,
  ({ one }) => ({
    vetmedHousehold: one(vetmedHouseholds, {
      fields: [vetmedSuggestions.householdId],
      references: [vetmedHouseholds.id],
    }),
    vetmedUser_appliedByUserId: one(vetmedUsers, {
      fields: [vetmedSuggestions.appliedByUserId],
      references: [vetmedUsers.id],
      relationName: "vetmedSuggestions_appliedByUserId_vetmedUsers_id",
    }),
    vetmedUser_dismissedByUserId: one(vetmedUsers, {
      fields: [vetmedSuggestions.dismissedByUserId],
      references: [vetmedUsers.id],
      relationName: "vetmedSuggestions_dismissedByUserId_vetmedUsers_id",
    }),
    vetmedUser_revertedByUserId: one(vetmedUsers, {
      fields: [vetmedSuggestions.revertedByUserId],
      references: [vetmedUsers.id],
      relationName: "vetmedSuggestions_revertedByUserId_vetmedUsers_id",
    }),
  }),
);

export const vetmedUsersRelations = relations(vetmedUsers, ({ one, many }) => ({
  vetmedAdministrations_caregiverId: many(vetmedAdministrations, {
    relationName: "vetmedAdministrations_caregiverId_vetmedUsers_id",
  }),
  vetmedAdministrations_coSignUserId: many(vetmedAdministrations, {
    relationName: "vetmedAdministrations_coSignUserId_vetmedUsers_id",
  }),
  vetmedAnimal: one(vetmedAnimals, {
    fields: [vetmedUsers.defaultAnimalId],
    references: [vetmedAnimals.id],
  }),
  vetmedAuditLogs: many(vetmedAuditLog),
  vetmedCosignRequests_cosignerId: many(vetmedCosignRequests, {
    relationName: "vetmedCosignRequests_cosignerId_vetmedUsers_id",
  }),
  vetmedCosignRequests_requesterId: many(vetmedCosignRequests, {
    relationName: "vetmedCosignRequests_requesterId_vetmedUsers_id",
  }),
  vetmedHousehold: one(vetmedHouseholds, {
    fields: [vetmedUsers.defaultHouseholdId],
    references: [vetmedHouseholds.id],
  }),
  vetmedMemberships: many(vetmedMemberships),
  vetmedNotificationQueues: many(vetmedNotificationQueue),
  vetmedNotifications: many(vetmedNotifications),
  vetmedPushSubscriptions: many(vetmedPushSubscriptions),
  vetmedSuggestions_appliedByUserId: many(vetmedSuggestions, {
    relationName: "vetmedSuggestions_appliedByUserId_vetmedUsers_id",
  }),
  vetmedSuggestions_dismissedByUserId: many(vetmedSuggestions, {
    relationName: "vetmedSuggestions_dismissedByUserId_vetmedUsers_id",
  }),
  vetmedSuggestions_revertedByUserId: many(vetmedSuggestions, {
    relationName: "vetmedSuggestions_revertedByUserId_vetmedUsers_id",
  }),
}));

export const vetmedPushSubscriptionsRelations = relations(
  vetmedPushSubscriptions,
  ({ one }) => ({
    vetmedUser: one(vetmedUsers, {
      fields: [vetmedPushSubscriptions.userId],
      references: [vetmedUsers.id],
    }),
  }),
);

export const vetmedCosignRequestsRelations = relations(
  vetmedCosignRequests,
  ({ one }) => ({
    vetmedAdministration: one(vetmedAdministrations, {
      fields: [vetmedCosignRequests.administrationId],
      references: [vetmedAdministrations.id],
    }),
    vetmedHousehold: one(vetmedHouseholds, {
      fields: [vetmedCosignRequests.householdId],
      references: [vetmedHouseholds.id],
    }),
    vetmedUser_cosignerId: one(vetmedUsers, {
      fields: [vetmedCosignRequests.cosignerId],
      references: [vetmedUsers.id],
      relationName: "vetmedCosignRequests_cosignerId_vetmedUsers_id",
    }),
    vetmedUser_requesterId: one(vetmedUsers, {
      fields: [vetmedCosignRequests.requesterId],
      references: [vetmedUsers.id],
      relationName: "vetmedCosignRequests_requesterId_vetmedUsers_id",
    }),
  }),
);

export const vetmedAdministrationsRelations = relations(
  vetmedAdministrations,
  ({ one, many }) => ({
    vetmedAnimal: one(vetmedAnimals, {
      fields: [vetmedAdministrations.animalId],
      references: [vetmedAnimals.id],
    }),
    vetmedCosignRequests: many(vetmedCosignRequests),
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

export const vetmedNotificationsRelations = relations(
  vetmedNotifications,
  ({ one }) => ({
    vetmedHousehold: one(vetmedHouseholds, {
      fields: [vetmedNotifications.householdId],
      references: [vetmedHouseholds.id],
    }),
    vetmedUser: one(vetmedUsers, {
      fields: [vetmedNotifications.userId],
      references: [vetmedUsers.id],
    }),
  }),
);
