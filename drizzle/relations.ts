import {relations} from "drizzle-orm/relations";
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
    vetmedUsers
} from "./schema";

export const vetmedAuditLogRelations = relations(vetmedAuditLog, ({one}) => ({
    vetmedUser: one(vetmedUsers, {
        fields: [vetmedAuditLog.userId],
        references: [vetmedUsers.id]
    }),
    vetmedHousehold: one(vetmedHouseholds, {
        fields: [vetmedAuditLog.householdId],
        references: [vetmedHouseholds.id]
    }),
}));

export const vetmedUsersRelations = relations(vetmedUsers, ({many}) => ({
    vetmedAuditLogs: many(vetmedAuditLog),
    vetmedNotificationQueues: many(vetmedNotificationQueue),
    vetmedMemberships: many(vetmedMemberships),
    vetmedAdministrations_caregiverId: many(vetmedAdministrations, {
        relationName: "vetmedAdministrations_caregiverId_vetmedUsers_id"
    }),
    vetmedAdministrations_coSignUserId: many(vetmedAdministrations, {
        relationName: "vetmedAdministrations_coSignUserId_vetmedUsers_id"
    }),
}));

export const vetmedHouseholdsRelations = relations(vetmedHouseholds, ({many}) => ({
    vetmedAuditLogs: many(vetmedAuditLog),
    vetmedNotificationQueues: many(vetmedNotificationQueue),
    vetmedMemberships: many(vetmedMemberships),
    vetmedInventoryItems: many(vetmedInventoryItems),
    vetmedAdministrations: many(vetmedAdministrations),
    vetmedAnimals: many(vetmedAnimals),
}));

export const vetmedNotificationQueueRelations = relations(vetmedNotificationQueue, ({one}) => ({
    vetmedUser: one(vetmedUsers, {
        fields: [vetmedNotificationQueue.userId],
        references: [vetmedUsers.id]
    }),
    vetmedHousehold: one(vetmedHouseholds, {
        fields: [vetmedNotificationQueue.householdId],
        references: [vetmedHouseholds.id]
    }),
}));

export const vetmedMembershipsRelations = relations(vetmedMemberships, ({one}) => ({
    vetmedUser: one(vetmedUsers, {
        fields: [vetmedMemberships.userId],
        references: [vetmedUsers.id]
    }),
    vetmedHousehold: one(vetmedHouseholds, {
        fields: [vetmedMemberships.householdId],
        references: [vetmedHouseholds.id]
    }),
}));

export const vetmedInventoryItemsRelations = relations(vetmedInventoryItems, ({one, many}) => ({
    vetmedHousehold: one(vetmedHouseholds, {
        fields: [vetmedInventoryItems.householdId],
        references: [vetmedHouseholds.id]
    }),
    vetmedAnimal: one(vetmedAnimals, {
        fields: [vetmedInventoryItems.assignedAnimalId],
        references: [vetmedAnimals.id]
    }),
    vetmedMedicationCatalog: one(vetmedMedicationCatalog, {
        fields: [vetmedInventoryItems.medicationId],
        references: [vetmedMedicationCatalog.id]
    }),
    vetmedAdministrations: many(vetmedAdministrations),
}));

export const vetmedAnimalsRelations = relations(vetmedAnimals, ({one, many}) => ({
    vetmedInventoryItems: many(vetmedInventoryItems),
    vetmedRegimens: many(vetmedRegimens),
    vetmedAdministrations: many(vetmedAdministrations),
    vetmedHousehold: one(vetmedHouseholds, {
        fields: [vetmedAnimals.householdId],
        references: [vetmedHouseholds.id]
    }),
}));

export const vetmedMedicationCatalogRelations = relations(vetmedMedicationCatalog, ({many}) => ({
    vetmedInventoryItems: many(vetmedInventoryItems),
    vetmedRegimens: many(vetmedRegimens),
}));

export const vetmedRegimensRelations = relations(vetmedRegimens, ({one, many}) => ({
    vetmedAnimal: one(vetmedAnimals, {
        fields: [vetmedRegimens.animalId],
        references: [vetmedAnimals.id]
    }),
    vetmedMedicationCatalog: one(vetmedMedicationCatalog, {
        fields: [vetmedRegimens.medicationId],
        references: [vetmedMedicationCatalog.id]
    }),
    vetmedAdministrations: many(vetmedAdministrations),
}));

export const vetmedAdministrationsRelations = relations(vetmedAdministrations, ({one}) => ({
    vetmedRegimen: one(vetmedRegimens, {
        fields: [vetmedAdministrations.regimenId],
        references: [vetmedRegimens.id]
    }),
    vetmedAnimal: one(vetmedAnimals, {
        fields: [vetmedAdministrations.animalId],
        references: [vetmedAnimals.id]
    }),
    vetmedHousehold: one(vetmedHouseholds, {
        fields: [vetmedAdministrations.householdId],
        references: [vetmedHouseholds.id]
    }),
    vetmedUser_caregiverId: one(vetmedUsers, {
        fields: [vetmedAdministrations.caregiverId],
        references: [vetmedUsers.id],
        relationName: "vetmedAdministrations_caregiverId_vetmedUsers_id"
    }),
    vetmedUser_coSignUserId: one(vetmedUsers, {
        fields: [vetmedAdministrations.coSignUserId],
        references: [vetmedUsers.id],
        relationName: "vetmedAdministrations_coSignUserId_vetmedUsers_id"
    }),
    vetmedInventoryItem: one(vetmedInventoryItems, {
        fields: [vetmedAdministrations.sourceItemId],
        references: [vetmedInventoryItems.id]
    }),
}));