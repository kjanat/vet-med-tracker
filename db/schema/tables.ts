import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const temperatureUnit = pgEnum("temperature_unit", [
  "celsius",
  "fahrenheit",
]);
export const vetmedAdminStatus = pgEnum("vetmed_admin_status", [
  "ON_TIME",
  "LATE",
  "VERY_LATE",
  "MISSED",
  "PRN",
]);
export const vetmedForm = pgEnum("vetmed_form", [
  "TABLET",
  "CAPSULE",
  "LIQUID",
  "INJECTION",
  "CREAM",
  "OINTMENT",
  "DROPS",
  "SPRAY",
  "POWDER",
  "PATCH",
  "OTHER",
]);
export const vetmedRole = pgEnum("vetmed_role", [
  "OWNER",
  "CAREGIVER",
  "VETREADONLY",
]);
export const vetmedRoute = pgEnum("vetmed_route", [
  "ORAL",
  "SC",
  "IM",
  "IV",
  "TOPICAL",
  "OTIC",
  "OPHTHALMIC",
  "INHALED",
  "RECTAL",
  "OTHER",
]);
export const vetmedScheduleType = pgEnum("vetmed_schedule_type", [
  "FIXED",
  "PRN",
  "INTERVAL",
  "TAPER",
]);
export const vetmedStorage = pgEnum("vetmed_storage", [
  "ROOM",
  "FRIDGE",
  "FREEZER",
  "CONTROLLED",
]);
export const weightUnit = pgEnum("weight_unit", ["kg", "lbs"]);

export interface UserNotificationPreferencesSchema {
  emailReminders: boolean;
  smsReminders: boolean;
  pushNotifications: boolean;
  reminderLeadTime: number;
}

export interface UserDisplayPreferencesSchema {
  temperatureUnit: "celsius" | "fahrenheit";
  weightUnit: "kg" | "lbs";
  use24HourTime: boolean;
  weekStartsOn: 0 | 1;
  theme: "system" | "light" | "dark";
}

export interface UserPreferencesSchema {
  defaultTimezone: string;
  preferredPhoneNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notificationPreferences: UserNotificationPreferencesSchema;
  displayPreferences: UserDisplayPreferencesSchema;
  defaultHouseholdId: string | null;
  defaultAnimalId: string | null;
  legacyBackup?: Record<string, unknown> | null;
}

export interface UserProfileSchema {
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  pronouns: string | null;
  location: string | null;
  website: string | null;
  socialLinks: Record<string, unknown>;
  profileVisibility: Record<string, boolean>;
  profileCompletedAt: string | null;
  legacyProfileData?: Record<string, unknown> | null;
}

export const vetmedAnimals = pgTable(
  "vetmed_animals",
  {
    allergies: text().array(),
    breed: text(),
    clinicName: text("clinic_name"),
    color: text(),
    conditions: text().array(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
    dob: date(),
    householdId: uuid("household_id").notNull(),
    id: uuid().defaultRandom().primaryKey().notNull(),
    microchipId: text("microchip_id"),
    name: text().notNull(),
    neutered: boolean().default(false).notNull(),
    notes: text(),
    photoUrl: text("photo_url"),
    sex: text(),
    species: text().notNull(),
    timezone: text().default("America/New_York").notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    vetEmail: text("vet_email"),
    vetName: text("vet_name"),
    vetPhone: text("vet_phone"),
    weightKg: numeric("weight_kg", { precision: 5, scale: 2 }),
  },
  (table) => [
    index("animal_deleted_at_idx").using(
      "btree",
      table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("animal_household_id_idx").using(
      "btree",
      table.householdId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.householdId],
      foreignColumns: [vetmedHouseholds.id],
      name: "vetmed_animals_household_id_vetmed_households_id_fk",
    }).onDelete("cascade"),
  ],
);

export const vetmedMemberships = pgTable(
  "vetmed_memberships",
  {
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    householdId: uuid("household_id").notNull(),
    id: uuid().defaultRandom().primaryKey().notNull(),
    role: vetmedRole().default("CAREGIVER").notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    userId: uuid("user_id").notNull(),
  },
  (table) => [
    index("membership_household_id_idx").using(
      "btree",
      table.householdId.asc().nullsLast().op("uuid_ops"),
    ),
    index("membership_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [vetmedUsers.id],
      name: "vetmed_memberships_user_id_vetmed_users_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.householdId],
      foreignColumns: [vetmedHouseholds.id],
      name: "vetmed_memberships_household_id_vetmed_households_id_fk",
    }).onDelete("cascade"),
    unique("vetmed_memberships_user_id_household_id_unique").on(
      table.userId,
      table.householdId,
    ),
  ],
);

export const vetmedInventoryItems = pgTable(
  "vetmed_inventory_items",
  {
    // Existing fields
    assignedAnimalId: uuid("assigned_animal_id"),
    barcode: text(),
    brandOverride: text("brand_override"),
    concentration: text(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
    expiresOn: timestamp("expires_on", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    householdId: uuid("household_id").notNull(),
    id: uuid().defaultRandom().primaryKey().notNull(),
    inUse: boolean("in_use").default(false).notNull(),
    isCustomMedication: boolean("is_custom_medication")
      .default(false)
      .notNull(), // Track custom vs catalog
    lot: text(),
    medicationId: uuid("medication_id"), // Made optional for hybrid approach

    // Hybrid medication fields - fallback when not using catalog
    medicationName: text("medication_name"), // Free-text medication name (primary display)
    notes: text(),
    openedOn: timestamp("opened_on", { mode: "date", withTimezone: true }),
    purchaseDate: timestamp("purchase_date", {
      mode: "date",
      withTimezone: true,
    }),
    purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }),
    quantityUnits: integer("quantity_units"),
    storage: vetmedStorage().default("ROOM").notNull(),
    supplier: text(),
    unitsRemaining: integer("units_remaining"),
    unitType: text("unit_type"),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("inventory_animal_id_idx").using(
      "btree",
      table.assignedAnimalId.asc().nullsLast().op("uuid_ops"),
    ),
    index("inventory_deleted_at_idx").using(
      "btree",
      table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("inventory_expires_on_idx").using(
      "btree",
      table.expiresOn.asc().nullsLast().op("date_ops"),
    ),
    index("inventory_household_id_idx").using(
      "btree",
      table.householdId.asc().nullsLast().op("uuid_ops"),
    ),
    index("inventory_in_use_idx").using(
      "btree",
      table.inUse.asc().nullsLast().op("bool_ops"),
    ),
    foreignKey({
      columns: [table.householdId],
      foreignColumns: [vetmedHouseholds.id],
      name: "vetmed_inventory_items_household_id_vetmed_households_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.assignedAnimalId],
      foreignColumns: [vetmedAnimals.id],
      name: "vetmed_inventory_items_assigned_animal_id_vetmed_animals_id_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.medicationId],
      foreignColumns: [vetmedMedicationCatalog.id],
      name: "vetmed_inventory_items_medication_id_vetmed_medication_catalog_",
    }).onDelete("set null"),
  ],
);

export const vetmedNotificationQueue = pgTable(
  "vetmed_notification_queue",
  {
    attempts: integer().default(0).notNull(),
    body: text().notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    data: jsonb(),
    dismissedAt: timestamp("dismissed_at", {
      mode: "date",
      withTimezone: true,
    }),
    error: text(),
    failedAt: timestamp("failed_at", { mode: "date", withTimezone: true }),
    householdId: uuid("household_id").notNull(),
    id: uuid().defaultRandom().primaryKey().notNull(),
    readAt: timestamp("read_at", { mode: "date", withTimezone: true }),
    scheduledFor: timestamp("scheduled_for", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    sentAt: timestamp("sent_at", { mode: "date", withTimezone: true }),
    snoozedUntil: timestamp("snoozed_until", {
      mode: "date",
      withTimezone: true,
    }),
    title: text().notNull(),
    type: text().notNull(),
    userId: uuid("user_id").notNull(),
  },
  (table) => [
    index("notification_scheduled_for_idx").using(
      "btree",
      table.scheduledFor.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("notification_sent_at_idx").using(
      "btree",
      table.sentAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("notification_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [vetmedUsers.id],
      name: "vetmed_notification_queue_user_id_vetmed_users_id_fk",
    }),
    foreignKey({
      columns: [table.householdId],
      foreignColumns: [vetmedHouseholds.id],
      name: "vetmed_notification_queue_household_id_vetmed_households_id_fk",
    }),
  ],
);

export const vetmedMedicationCatalog = pgTable(
  "vetmed_medication_catalog",
  {
    // Age-specific modifications
    // Format: { "pediatric": { "multiplier": 0.8, "minAgeMonths": 2 }, "geriatric": { "multiplier": 0.9, "minAgeYears": 7 } }
    ageAdjustments: jsonb("age_adjustments"),
    brandName: text("brand_name"),

    // Breed-specific considerations (e.g., MDR1 gene in collies)
    // Format: { "collie": { "contraindicatedRoutes": ["IV"], "maxReduction": 0.5 }, "greyhound": { "multiplier": 0.9 } }
    breedConsiderations: jsonb("breed_considerations"),
    commonDosing: text("common_dosing"),

    // Units and concentration information
    concentrationMgMl: numeric("concentration_mg_ml", {
      precision: 10,
      scale: 4,
    }), // For liquid medications

    // Contraindications and special considerations
    contraindications: text().array(), // Array of conditions/scenarios to avoid
    controlledSubstance: boolean("controlled_substance")
      .default(false)
      .notNull(),

    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    dosageMaxMgKg: numeric("dosage_max_mg_kg", { precision: 10, scale: 4 }), // Maximum dose per kg

    // Dosage calculation fields
    dosageMinMgKg: numeric("dosage_min_mg_kg", { precision: 10, scale: 4 }), // Minimum dose per kg
    dosageTypicalMgKg: numeric("dosage_typical_mg_kg", {
      precision: 10,
      scale: 4,
    }), // Typical/recommended dose per kg
    form: vetmedForm().notNull(),
    genericName: text("generic_name").notNull(),
    id: uuid().defaultRandom().primaryKey().notNull(),
    maxDailyDoseMg: numeric("max_daily_dose_mg", { precision: 10, scale: 2 }), // Maximum daily dose total
    maxFrequencyPerDay: integer("max_frequency_per_day"), // Maximum doses per day
    route: vetmedRoute().notNull(),

    // Route-specific adjustments
    // Format: { "ORAL": { "multiplier": 1.0 }, "IV": { "multiplier": 0.5, "additionalWarnings": ["Monitor for reactions"] } }
    routeAdjustments: jsonb("route_adjustments"),

    // Species-specific adjustments stored as JSON
    // Format: { "dog": { "multiplier": 1.0 }, "cat": { "multiplier": 0.8 }, "bird": { "multiplier": 1.2, "maxDailyDose": 50 } }
    speciesAdjustments: jsonb("species_adjustments"),
    strength: text(),

    // Frequency information
    typicalFrequencyHours: integer("typical_frequency_hours"), // How often medication is typically given
    unitsPerTablet: numeric("units_per_tablet", { precision: 10, scale: 4 }), // For solid medications
    unitType: text("unit_type").default("mg"), // mg, mcg, IU, etc.
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    warnings: text(),
  },
  (table) => [
    index("med_catalog_brand_name_idx").using(
      "btree",
      table.brandName.asc().nullsLast().op("text_ops"),
    ),
    index("med_catalog_generic_name_idx").using(
      "btree",
      table.genericName.asc().nullsLast().op("text_ops"),
    ),
    index("med_catalog_dosage_range_idx").using(
      "btree",
      table.dosageMinMgKg.asc().nullsLast().op("numeric_ops"),
      table.dosageMaxMgKg.asc().nullsLast().op("numeric_ops"),
    ),
  ],
);

export const vetmedHouseholds = pgTable("vetmed_households", {
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  id: uuid().defaultRandom().primaryKey().notNull(),
  name: text().notNull(),
  timezone: text().default("America/New_York").notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const vetmedAuditLog = pgTable(
  "vetmed_audit_log",
  {
    action: text().notNull(),
    details: jsonb(),
    householdId: uuid("household_id").notNull(),
    id: uuid().defaultRandom().primaryKey().notNull(),
    ipAddress: text("ip_address"),
    newValues: jsonb("new_values"),
    oldValues: jsonb("old_values"),
    resourceId: uuid("resource_id"),
    resourceType: text("resource_type").notNull(),
    sessionId: text("session_id"),
    timestamp: timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    userAgent: text("user_agent"),
    userId: uuid("user_id").notNull(),
  },
  (table) => [
    index("audit_household_id_idx").using(
      "btree",
      table.householdId.asc().nullsLast().op("uuid_ops"),
    ),
    index("audit_resource_idx").using(
      "btree",
      table.resourceType.asc().nullsLast().op("text_ops"),
      table.resourceId.asc().nullsLast().op("uuid_ops"),
    ),
    index("audit_timestamp_idx").using(
      "btree",
      table.timestamp.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("audit_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [vetmedUsers.id],
      name: "vetmed_audit_log_user_id_vetmed_users_id_fk",
    }),
    foreignKey({
      columns: [table.householdId],
      foreignColumns: [vetmedHouseholds.id],
      name: "vetmed_audit_log_household_id_vetmed_households_id_fk",
    }),
  ],
);

export const vetmedRegimens = pgTable(
  "vetmed_regimens",
  {
    active: boolean().default(true).notNull(),
    animalId: uuid("animal_id").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    cutoffMinutes: integer("cutoff_minutes").default(240).notNull(),
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
    dose: text(),
    endDate: timestamp("end_date", { mode: "date", withTimezone: true }),
    highRisk: boolean("high_risk").default(false).notNull(),
    id: uuid().defaultRandom().primaryKey().notNull(),
    instructions: text(),
    intervalHours: integer("interval_hours"),
    isCustomMedication: boolean("is_custom_medication")
      .default(false)
      .notNull(), // Track custom vs catalog
    maxDailyDoses: integer("max_daily_doses"),
    medicationId: uuid("medication_id"), // Made optional for hybrid approach

    // Hybrid medication fields - fallback when not using catalog
    medicationName: text("medication_name"), // Free-text medication name (primary display)

    // Existing fields
    name: text(),
    pausedAt: timestamp("paused_at", { mode: "date", withTimezone: true }),
    pauseReason: text("pause_reason"),
    prnReason: text("prn_reason"),
    requiresCoSign: boolean("requires_co_sign").default(false).notNull(),
    route: text(),
    scheduleType: vetmedScheduleType("schedule_type").notNull(),
    startDate: timestamp("start_date", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    timesLocal: time("times_local").array(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("regimen_active_idx").using(
      "btree",
      table.active.asc().nullsLast().op("bool_ops"),
    ),
    index("regimen_animal_id_idx").using(
      "btree",
      table.animalId.asc().nullsLast().op("uuid_ops"),
    ),
    index("regimen_deleted_at_idx").using(
      "btree",
      table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("regimen_start_date_idx").using(
      "btree",
      table.startDate.asc().nullsLast().op("date_ops"),
    ),
    foreignKey({
      columns: [table.animalId],
      foreignColumns: [vetmedAnimals.id],
      name: "vetmed_regimens_animal_id_vetmed_animals_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.medicationId],
      foreignColumns: [vetmedMedicationCatalog.id],
      name: "vetmed_regimens_medication_id_vetmed_medication_catalog_id_fk",
    }).onDelete("set null"),
  ],
);

export const vetmedAdministrations = pgTable(
  "vetmed_administrations",
  {
    adverseEvent: boolean("adverse_event").default(false).notNull(),
    adverseEventDescription: text("adverse_event_description"),
    animalId: uuid("animal_id").notNull(),
    caregiverId: uuid("caregiver_id").notNull(),
    coSignedAt: timestamp("co_signed_at", {
      mode: "date",
      withTimezone: true,
    }),
    coSignNotes: text("co_sign_notes"),
    coSignUserId: uuid("co_sign_user_id"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    dose: text(),
    householdId: uuid("household_id").notNull(),
    id: uuid().defaultRandom().primaryKey().notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    mediaUrls: text("media_urls").array(),
    notes: text(),
    recordedAt: timestamp("recorded_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    regimenId: uuid("regimen_id").notNull(),
    scheduledFor: timestamp("scheduled_for", {
      mode: "date",
      withTimezone: true,
    }),
    site: text(),
    sourceItemId: uuid("source_item_id"),
    status: vetmedAdminStatus().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("admin_animal_id_idx").using(
      "btree",
      table.animalId.asc().nullsLast().op("uuid_ops"),
    ),
    index("admin_household_id_idx").using(
      "btree",
      table.householdId.asc().nullsLast().op("uuid_ops"),
    ),
    index("admin_idempotency_key_idx").using(
      "btree",
      table.idempotencyKey.asc().nullsLast().op("text_ops"),
    ),
    index("admin_recorded_at_idx").using(
      "btree",
      table.recordedAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("admin_regimen_id_idx").using(
      "btree",
      table.regimenId.asc().nullsLast().op("uuid_ops"),
    ),
    index("admin_scheduled_for_idx").using(
      "btree",
      table.scheduledFor.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("admin_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    foreignKey({
      columns: [table.regimenId],
      foreignColumns: [vetmedRegimens.id],
      name: "vetmed_administrations_regimen_id_vetmed_regimens_id_fk",
    }),
    foreignKey({
      columns: [table.animalId],
      foreignColumns: [vetmedAnimals.id],
      name: "vetmed_administrations_animal_id_vetmed_animals_id_fk",
    }),
    foreignKey({
      columns: [table.householdId],
      foreignColumns: [vetmedHouseholds.id],
      name: "vetmed_administrations_household_id_vetmed_households_id_fk",
    }),
    foreignKey({
      columns: [table.caregiverId],
      foreignColumns: [vetmedUsers.id],
      name: "vetmed_administrations_caregiver_id_vetmed_users_id_fk",
    }),
    foreignKey({
      columns: [table.coSignUserId],
      foreignColumns: [vetmedUsers.id],
      name: "vetmed_administrations_co_sign_user_id_vetmed_users_id_fk",
    }),
    foreignKey({
      columns: [table.sourceItemId],
      foreignColumns: [vetmedInventoryItems.id],
      name: "vetmed_administrations_source_item_id_vetmed_inventory_items_id",
    }),
    unique("vetmed_administrations_idempotency_key_unique").on(
      table.idempotencyKey,
    ),
  ],
);

export const vetmedNotifications = pgTable(
  "vetmed_notifications",
  {
    actionUrl: text("action_url"), // Optional URL for click action
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    data: jsonb(), // Additional metadata (animalId, regimenId, etc.)
    dismissed: boolean().default(false).notNull(),
    dismissedAt: timestamp("dismissed_at", {
      mode: "date",
      withTimezone: true,
    }),
    householdId: uuid("household_id").notNull(),
    id: uuid().defaultRandom().primaryKey().notNull(),
    message: text().notNull(),
    priority: text().default("medium").notNull(), // "low", "medium", "high", "critical"
    read: boolean().default(false).notNull(),
    readAt: timestamp("read_at", { mode: "date", withTimezone: true }),
    title: text().notNull(),
    type: text().notNull(), // "medication", "inventory", "system", "due", "overdue", "reminder"
    userId: uuid("user_id").notNull(),
  },
  (table) => [
    index("notification_user_read_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
      table.read.asc().nullsLast().op("bool_ops"),
    ),
    index("notification_household_idx").using(
      "btree",
      table.householdId.asc().nullsLast().op("uuid_ops"),
    ),
    index("notification_created_at_idx").using(
      "btree",
      table.createdAt.desc().nullsLast().op("timestamptz_ops"),
    ),
    index("notification_type_idx").using(
      "btree",
      table.type.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [vetmedUsers.id],
      name: "vetmed_notifications_user_id_vetmed_users_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.householdId],
      foreignColumns: [vetmedHouseholds.id],
      name: "vetmed_notifications_household_id_vetmed_households_id_fk",
    }).onDelete("cascade"),
  ],
);

export const vetmedCosignStatus = pgEnum("vetmed_cosign_status", [
  "pending",
  "approved",
  "rejected",
  "expired",
]);

export const vetmedSuggestionStatus = pgEnum("vetmed_suggestion_status", [
  "pending",
  "applied",
  "reverted",
  "dismissed",
]);

export const vetmedSuggestions = pgTable(
  "vetmed_suggestions",
  {
    action: jsonb().notNull(), // Store action parameters as JSON
    appliedAt: timestamp("applied_at", { mode: "date", withTimezone: true }),
    appliedByUserId: uuid("applied_by_user_id"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    dismissedAt: timestamp("dismissed_at", {
      mode: "date",
      withTimezone: true,
    }),
    dismissedByUserId: uuid("dismissed_by_user_id"),
    estimatedImpact: text("estimated_impact"),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }),
    householdId: uuid("household_id").notNull(),
    id: uuid().defaultRandom().primaryKey().notNull(),
    originalValues: jsonb("original_values"), // Store original state for revert
    priority: text().default("medium").notNull(), // "low", "medium", "high"
    rationale: text().notNull(),
    revertedAt: timestamp("reverted_at", {
      mode: "date",
      withTimezone: true,
    }),
    revertedByUserId: uuid("reverted_by_user_id"),
    status: vetmedSuggestionStatus().default("pending").notNull(),
    summary: text().notNull(),
    type: text().notNull(), // "ADD_REMINDER", "SHIFT_TIME", "ENABLE_COSIGN", etc.
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("suggestions_household_id_idx").using(
      "btree",
      table.householdId.asc().nullsLast().op("uuid_ops"),
    ),
    index("suggestions_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("suggestions_type_idx").using(
      "btree",
      table.type.asc().nullsLast().op("text_ops"),
    ),
    index("suggestions_created_at_idx").using(
      "btree",
      table.createdAt.desc().nullsLast().op("timestamptz_ops"),
    ),
    foreignKey({
      columns: [table.householdId],
      foreignColumns: [vetmedHouseholds.id],
      name: "vetmed_suggestions_household_id_vetmed_households_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.appliedByUserId],
      foreignColumns: [vetmedUsers.id],
      name: "vetmed_suggestions_applied_by_user_id_vetmed_users_id_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.revertedByUserId],
      foreignColumns: [vetmedUsers.id],
      name: "vetmed_suggestions_reverted_by_user_id_vetmed_users_id_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.dismissedByUserId],
      foreignColumns: [vetmedUsers.id],
      name: "vetmed_suggestions_dismissed_by_user_id_vetmed_users_id_fk",
    }).onDelete("set null"),
  ],
);

export const vetmedCosignRequests = pgTable(
  "vetmed_cosign_requests",
  {
    administrationId: uuid("administration_id").notNull(),
    cosignerId: uuid("cosigner_id").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    householdId: uuid("household_id").notNull(),
    id: uuid().defaultRandom().primaryKey().notNull(),
    rejectionReason: text("rejection_reason"),
    requesterId: uuid("requester_id").notNull(),
    signature: text(), // Base64 encoded signature
    signedAt: timestamp("signed_at", { mode: "date", withTimezone: true }),
    status: vetmedCosignStatus().default("pending").notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("cosign_requests_administration_id_idx").using(
      "btree",
      table.administrationId.asc().nullsLast().op("uuid_ops"),
    ),
    index("cosign_requests_requester_id_idx").using(
      "btree",
      table.requesterId.asc().nullsLast().op("uuid_ops"),
    ),
    index("cosign_requests_cosigner_id_idx").using(
      "btree",
      table.cosignerId.asc().nullsLast().op("uuid_ops"),
    ),
    index("cosign_requests_household_id_idx").using(
      "btree",
      table.householdId.asc().nullsLast().op("uuid_ops"),
    ),
    index("cosign_requests_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("cosign_requests_expires_at_idx").using(
      "btree",
      table.expiresAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    foreignKey({
      columns: [table.administrationId],
      foreignColumns: [vetmedAdministrations.id],
      name: "vetmed_cosign_requests_administration_id_vetmed_administrations_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.requesterId],
      foreignColumns: [vetmedUsers.id],
      name: "vetmed_cosign_requests_requester_id_vetmed_users_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.cosignerId],
      foreignColumns: [vetmedUsers.id],
      name: "vetmed_cosign_requests_cosigner_id_vetmed_users_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.householdId],
      foreignColumns: [vetmedHouseholds.id],
      name: "vetmed_cosign_requests_household_id_vetmed_households_id_fk",
    }).onDelete("cascade"),
    unique("vetmed_cosign_requests_administration_id_unique").on(
      table.administrationId,
    ),
  ],
);

export const vetmedPushSubscriptions = pgTable(
  "vetmed_push_subscriptions",
  {
    authKey: text("auth_key").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    deviceName: text("device_name"),
    endpoint: text().notNull(),
    id: uuid().defaultRandom().primaryKey().notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    lastUsed: timestamp("last_used", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    p256dhKey: text("p256dh_key").notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    userAgent: text("user_agent"),
    userId: uuid("user_id").notNull(),
  },
  (table) => [
    index("push_subscription_user_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    index("push_subscription_endpoint_idx").using(
      "btree",
      table.endpoint.asc().nullsLast().op("text_ops"),
    ),
    index("push_subscription_active_idx").using(
      "btree",
      table.isActive.asc().nullsLast().op("bool_ops"),
    ),
    unique("vetmed_push_subscriptions_endpoint_unique").on(table.endpoint),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [vetmedUsers.id],
      name: "vetmed_push_subscriptions_user_id_vetmed_users_id_fk",
    }).onDelete("cascade"),
  ],
);

export const vetmedUsers = pgTable(
  "vetmed_users",
  {
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    defaultAnimalId: uuid("default_animal_id"),
    defaultHouseholdId: uuid("default_household_id"),
    email: text().notNull(),
    emailVerified: timestamp("email_verified", {
      mode: "date",
      withTimezone: true,
    }),
    id: uuid().defaultRandom().primaryKey().notNull(),
    image: text(),
    name: text(),
    onboardingComplete: boolean("onboarding_complete").default(false),
    onboardingCompletedAt: timestamp("onboarding_completed_at", {
      mode: "date",
      withTimezone: true,
    }),
    preferences: jsonb("preferences")
      .$type<UserPreferencesSchema>()
      .default(
        sql`'{"defaultTimezone":"America/New_York","preferredPhoneNumber":null,"emergencyContactName":null,"emergencyContactPhone":null,"notificationPreferences":{"emailReminders":true,"smsReminders":false,"pushNotifications":true,"reminderLeadTime":15},"displayPreferences":{"temperatureUnit":"fahrenheit","weightUnit":"lbs","use24HourTime":false,"weekStartsOn":0,"theme":"system"},"defaultHouseholdId":null,"defaultAnimalId":null}'::jsonb`,
      )
      .notNull(),
    profile: jsonb("profile")
      .$type<UserProfileSchema>()
      .default(
        sql`'{"firstName":null,"lastName":null,"bio":null,"pronouns":null,"location":null,"website":null,"socialLinks":{},"profileVisibility":{"name":true,"email":false,"bio":true,"location":true},"profileCompletedAt":null}'::jsonb`,
      )
      .notNull(),
    stackUserId: text("stack_user_id"),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("vetmed_users_email_unique").on(table.email),
    unique("vetmed_users_stack_user_id_unique").on(table.stackUserId),
    foreignKey({
      columns: [table.defaultHouseholdId],
      foreignColumns: [vetmedHouseholds.id],
      name: "vetmed_users_default_household_id_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.defaultAnimalId],
      foreignColumns: [vetmedAnimals.id],
      name: "vetmed_users_default_animal_id_fk",
    }).onDelete("set null"),
  ],
);

// Export aliases for plain table names (without vetmed prefix)
export const users = vetmedUsers;
export const animals = vetmedAnimals;
export const households = vetmedHouseholds;
export const memberships = vetmedMemberships;
export const medicationCatalog = vetmedMedicationCatalog;
export const inventoryItems = vetmedInventoryItems;
export const regimens = vetmedRegimens;
export const administrations = vetmedAdministrations;
export const auditLog = vetmedAuditLog;
export const notificationQueue = vetmedNotificationQueue;
export const notifications = vetmedNotifications;
export const suggestions = vetmedSuggestions;
export const cosignRequests = vetmedCosignRequests;
export const pushSubscriptions = vetmedPushSubscriptions;

// Export enum types and utilities
export const adminStatusEnum = vetmedAdminStatus;
export const roleEnum = vetmedRole;
export const scheduleTypeEnum = vetmedScheduleType;
export const routeEnum = vetmedRoute;
export const formEnum = vetmedForm;
export const storageEnum = vetmedStorage;
export const cosignStatusEnum = vetmedCosignStatus;

// Type exports for easier use
export type NewAdministration = typeof vetmedAdministrations.$inferInsert;
export type NewAnimal = typeof vetmedAnimals.$inferInsert;
export type NewUser = typeof vetmedUsers.$inferInsert;
export type NewHousehold = typeof vetmedHouseholds.$inferInsert;
export type NewMembership = typeof vetmedMemberships.$inferInsert;
export type NewRegimen = typeof vetmedRegimens.$inferInsert;
export type NewInventoryItem = typeof vetmedInventoryItems.$inferInsert;
export type NewMedicationCatalog = typeof vetmedMedicationCatalog.$inferInsert;
export type NewNotification = typeof vetmedNotifications.$inferInsert;
export type NewSuggestion = typeof vetmedSuggestions.$inferInsert;
export type NewCosignRequest = typeof vetmedCosignRequests.$inferInsert;
export type NewPushSubscription = typeof vetmedPushSubscriptions.$inferInsert;
export type NewAuditLog = typeof vetmedAuditLog.$inferInsert;

// Select types for reading from database
export type Administration = typeof vetmedAdministrations.$inferSelect;
export type Animal = typeof vetmedAnimals.$inferSelect;
export type User = typeof vetmedUsers.$inferSelect;
export type Household = typeof vetmedHouseholds.$inferSelect;
export type Membership = typeof vetmedMemberships.$inferSelect;
export type Regimen = typeof vetmedRegimens.$inferSelect;
export type InventoryItem = typeof vetmedInventoryItems.$inferSelect;
export type MedicationCatalog = typeof vetmedMedicationCatalog.$inferSelect;
export type Notification = typeof vetmedNotifications.$inferSelect;
export type Suggestion = typeof vetmedSuggestions.$inferSelect;
export type CosignRequest = typeof vetmedCosignRequests.$inferSelect;
export type PushSubscription = typeof vetmedPushSubscriptions.$inferSelect;
export type AuditLog = typeof vetmedAuditLog.$inferSelect;
