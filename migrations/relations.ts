import { relations } from "drizzle-orm/relations";
import { vetmedHouseholds, vetmedAnimals, vetmedSuggestions, vetmedUsers, vetmedPushSubscriptions, vetmedCosignRequests, vetmedAdministrations, vetmedAuditLog, vetmedNotificationQueue, vetmedMemberships, vetmedInventoryItems, vetmedMedicationCatalog, vetmedRegimens, vetmedNotifications } from "./schema";

export const vetmedAnimalsRelations = relations(vetmedAnimals, ({one, many}) => ({
	vetmedHousehold: one(vetmedHouseholds, {
		fields: [vetmedAnimals.householdId],
		references: [vetmedHouseholds.id]
	}),
	vetmedInventoryItems: many(vetmedInventoryItems),
	vetmedRegimens: many(vetmedRegimens),
	vetmedAdministrations: many(vetmedAdministrations),
	vetmedUsers: many(vetmedUsers),
}));

export const vetmedHouseholdsRelations = relations(vetmedHouseholds, ({many}) => ({
	vetmedAnimals: many(vetmedAnimals),
	vetmedSuggestions: many(vetmedSuggestions),
	vetmedCosignRequests: many(vetmedCosignRequests),
	vetmedAuditLogs: many(vetmedAuditLog),
	vetmedNotificationQueues: many(vetmedNotificationQueue),
	vetmedMemberships: many(vetmedMemberships),
	vetmedInventoryItems: many(vetmedInventoryItems),
	vetmedAdministrations: many(vetmedAdministrations),
	vetmedNotifications: many(vetmedNotifications),
	vetmedUsers: many(vetmedUsers),
}));

export const vetmedSuggestionsRelations = relations(vetmedSuggestions, ({one}) => ({
	vetmedHousehold: one(vetmedHouseholds, {
		fields: [vetmedSuggestions.householdId],
		references: [vetmedHouseholds.id]
	}),
	vetmedUser_appliedByUserId: one(vetmedUsers, {
		fields: [vetmedSuggestions.appliedByUserId],
		references: [vetmedUsers.id],
		relationName: "vetmedSuggestions_appliedByUserId_vetmedUsers_id"
	}),
	vetmedUser_revertedByUserId: one(vetmedUsers, {
		fields: [vetmedSuggestions.revertedByUserId],
		references: [vetmedUsers.id],
		relationName: "vetmedSuggestions_revertedByUserId_vetmedUsers_id"
	}),
	vetmedUser_dismissedByUserId: one(vetmedUsers, {
		fields: [vetmedSuggestions.dismissedByUserId],
		references: [vetmedUsers.id],
		relationName: "vetmedSuggestions_dismissedByUserId_vetmedUsers_id"
	}),
}));

export const vetmedUsersRelations = relations(vetmedUsers, ({one, many}) => ({
	vetmedSuggestions_appliedByUserId: many(vetmedSuggestions, {
		relationName: "vetmedSuggestions_appliedByUserId_vetmedUsers_id"
	}),
	vetmedSuggestions_revertedByUserId: many(vetmedSuggestions, {
		relationName: "vetmedSuggestions_revertedByUserId_vetmedUsers_id"
	}),
	vetmedSuggestions_dismissedByUserId: many(vetmedSuggestions, {
		relationName: "vetmedSuggestions_dismissedByUserId_vetmedUsers_id"
	}),
	vetmedPushSubscriptions: many(vetmedPushSubscriptions),
	vetmedCosignRequests_requesterId: many(vetmedCosignRequests, {
		relationName: "vetmedCosignRequests_requesterId_vetmedUsers_id"
	}),
	vetmedCosignRequests_cosignerId: many(vetmedCosignRequests, {
		relationName: "vetmedCosignRequests_cosignerId_vetmedUsers_id"
	}),
	vetmedAuditLogs: many(vetmedAuditLog),
	vetmedNotificationQueues: many(vetmedNotificationQueue),
	vetmedMemberships: many(vetmedMemberships),
	vetmedAdministrations_caregiverId: many(vetmedAdministrations, {
		relationName: "vetmedAdministrations_caregiverId_vetmedUsers_id"
	}),
	vetmedAdministrations_coSignUserId: many(vetmedAdministrations, {
		relationName: "vetmedAdministrations_coSignUserId_vetmedUsers_id"
	}),
	vetmedNotifications: many(vetmedNotifications),
	vetmedHousehold: one(vetmedHouseholds, {
		fields: [vetmedUsers.defaultHouseholdId],
		references: [vetmedHouseholds.id]
	}),
	vetmedAnimal: one(vetmedAnimals, {
		fields: [vetmedUsers.defaultAnimalId],
		references: [vetmedAnimals.id]
	}),
}));

export const vetmedPushSubscriptionsRelations = relations(vetmedPushSubscriptions, ({one}) => ({
	vetmedUser: one(vetmedUsers, {
		fields: [vetmedPushSubscriptions.userId],
		references: [vetmedUsers.id]
	}),
}));

export const vetmedCosignRequestsRelations = relations(vetmedCosignRequests, ({one}) => ({
	vetmedUser_requesterId: one(vetmedUsers, {
		fields: [vetmedCosignRequests.requesterId],
		references: [vetmedUsers.id],
		relationName: "vetmedCosignRequests_requesterId_vetmedUsers_id"
	}),
	vetmedUser_cosignerId: one(vetmedUsers, {
		fields: [vetmedCosignRequests.cosignerId],
		references: [vetmedUsers.id],
		relationName: "vetmedCosignRequests_cosignerId_vetmedUsers_id"
	}),
	vetmedHousehold: one(vetmedHouseholds, {
		fields: [vetmedCosignRequests.householdId],
		references: [vetmedHouseholds.id]
	}),
	vetmedAdministration: one(vetmedAdministrations, {
		fields: [vetmedCosignRequests.administrationId],
		references: [vetmedAdministrations.id]
	}),
}));

export const vetmedAdministrationsRelations = relations(vetmedAdministrations, ({one, many}) => ({
	vetmedCosignRequests: many(vetmedCosignRequests),
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

export const vetmedNotificationsRelations = relations(vetmedNotifications, ({one}) => ({
	vetmedUser: one(vetmedUsers, {
		fields: [vetmedNotifications.userId],
		references: [vetmedUsers.id]
	}),
	vetmedHousehold: one(vetmedHouseholds, {
		fields: [vetmedNotifications.householdId],
		references: [vetmedHouseholds.id]
	}),
}));