import {sql} from "drizzle-orm";
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

export const vetmedAnimals = pgTable(
    "vetmed_animals",
    {
        id: uuid().defaultRandom().primaryKey().notNull(),
        householdId: uuid("household_id").notNull(),
        name: text().notNull(),
        species: text().notNull(),
        breed: text(),
        sex: text(),
        neutered: boolean().default(false).notNull(),
        dob: date(),
        weightKg: numeric("weight_kg", {precision: 5, scale: 2}),
        microchipId: text("microchip_id"),
        color: text(),
        photoUrl: text("photo_url"),
        timezone: text().default("America/New_York").notNull(),
        vetName: text("vet_name"),
        vetPhone: text("vet_phone"),
        vetEmail: text("vet_email"),
        clinicName: text("clinic_name"),
        allergies: text().array(),
        conditions: text().array(),
        notes: text(),
        createdAt: timestamp("created_at", {withTimezone: true, mode: "string"})
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {withTimezone: true, mode: "string"})
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", {withTimezone: true, mode: "string"}),
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
        id: uuid().defaultRandom().primaryKey().notNull(),
        userId: uuid("user_id").notNull(),
        householdId: uuid("household_id").notNull(),
        role: vetmedRole().default("CAREGIVER").notNull(),
        createdAt: timestamp("created_at", {withTimezone: true, mode: "string"})
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {withTimezone: true, mode: "string"})
            .defaultNow()
            .notNull(),
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
        id: uuid().defaultRandom().primaryKey().notNull(),
        householdId: uuid("household_id").notNull(),
        medicationId: uuid("medication_id").notNull(),
        assignedAnimalId: uuid("assigned_animal_id"),
        brandOverride: text("brand_override"),
        concentration: text(),
        lot: text(),
        expiresOn: date("expires_on").notNull(),
        storage: vetmedStorage().default("ROOM").notNull(),
        quantityUnits: integer("quantity_units"),
        unitsRemaining: integer("units_remaining"),
        unitType: text("unit_type"),
        openedOn: date("opened_on"),
        inUse: boolean("in_use").default(false).notNull(),
        barcode: text(),
        purchaseDate: date("purchase_date"),
        purchasePrice: numeric("purchase_price", {precision: 10, scale: 2}),
        supplier: text(),
        notes: text(),
        createdAt: timestamp("created_at", {withTimezone: true, mode: "string"})
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {withTimezone: true, mode: "string"})
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", {withTimezone: true, mode: "string"}),
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
        }),
    ],
);

export const vetmedNotificationQueue = pgTable(
    "vetmed_notification_queue",
    {
        id: uuid().defaultRandom().primaryKey().notNull(),
        userId: uuid("user_id").notNull(),
        householdId: uuid("household_id").notNull(),
        type: text().notNull(),
        title: text().notNull(),
        body: text().notNull(),
        data: jsonb(),
        scheduledFor: timestamp("scheduled_for", {
            withTimezone: true,
            mode: "string",
        }).notNull(),
        sentAt: timestamp("sent_at", {withTimezone: true, mode: "string"}),
        failedAt: timestamp("failed_at", {withTimezone: true, mode: "string"}),
        error: text(),
        attempts: integer().default(0).notNull(),
        readAt: timestamp("read_at", {withTimezone: true, mode: "string"}),
        dismissedAt: timestamp("dismissed_at", {
            withTimezone: true,
            mode: "string",
        }),
        snoozedUntil: timestamp("snoozed_until", {
            withTimezone: true,
            mode: "string",
        }),
        createdAt: timestamp("created_at", {withTimezone: true, mode: "string"})
            .defaultNow()
            .notNull(),
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
        id: uuid().defaultRandom().primaryKey().notNull(),
        genericName: text("generic_name").notNull(),
        brandName: text("brand_name"),
        strength: text(),
        route: vetmedRoute().notNull(),
        form: vetmedForm().notNull(),
        controlledSubstance: boolean("controlled_substance")
            .default(false)
            .notNull(),
        commonDosing: text("common_dosing"),
        warnings: text(),

        // Dosage calculation fields
        dosageMinMgKg: numeric("dosage_min_mg_kg", {precision: 10, scale: 4}), // Minimum dose per kg
        dosageMaxMgKg: numeric("dosage_max_mg_kg", {precision: 10, scale: 4}), // Maximum dose per kg
        dosageTypicalMgKg: numeric("dosage_typical_mg_kg", {precision: 10, scale: 4}), // Typical/recommended dose per kg
        maxDailyDoseMg: numeric("max_daily_dose_mg", {precision: 10, scale: 2}), // Maximum daily dose total

        // Species-specific adjustments stored as JSON
        // Format: { "dog": { "multiplier": 1.0 }, "cat": { "multiplier": 0.8 }, "bird": { "multiplier": 1.2, "maxDailyDose": 50 } }
        speciesAdjustments: jsonb("species_adjustments"),

        // Route-specific adjustments
        // Format: { "ORAL": { "multiplier": 1.0 }, "IV": { "multiplier": 0.5, "additionalWarnings": ["Monitor for reactions"] } }
        routeAdjustments: jsonb("route_adjustments"),

        // Contraindications and special considerations
        contraindications: text().array(), // Array of conditions/scenarios to avoid

        // Age-specific modifications
        // Format: { "pediatric": { "multiplier": 0.8, "minAgeMonths": 2 }, "geriatric": { "multiplier": 0.9, "minAgeYears": 7 } }
        ageAdjustments: jsonb("age_adjustments"),

        // Breed-specific considerations (e.g., MDR1 gene in collies)
        // Format: { "collie": { "contraindicatedRoutes": ["IV"], "maxReduction": 0.5 }, "greyhound": { "multiplier": 0.9 } }
        breedConsiderations: jsonb("breed_considerations"),

        // Units and concentration information
        concentrationMgMl: numeric("concentration_mg_ml", {precision: 10, scale: 4}), // For liquid medications
        unitsPerTablet: numeric("units_per_tablet", {precision: 10, scale: 4}), // For solid medications
        unitType: text("unit_type").default("mg"), // mg, mcg, IU, etc.

        // Frequency information
        typicalFrequencyHours: integer("typical_frequency_hours"), // How often medication is typically given
        maxFrequencyPerDay: integer("max_frequency_per_day"), // Maximum doses per day

        createdAt: timestamp("created_at", {withTimezone: true, mode: "string"})
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {withTimezone: true, mode: "string"})
            .defaultNow()
            .notNull(),
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
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    timezone: text().default("America/New_York").notNull(),
    createdAt: timestamp("created_at", {withTimezone: true, mode: "string"})
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", {withTimezone: true, mode: "string"})
        .defaultNow()
        .notNull(),
});

export const vetmedAuditLog = pgTable(
    "vetmed_audit_log",
    {
        id: uuid().defaultRandom().primaryKey().notNull(),
        userId: uuid("user_id").notNull(),
        householdId: uuid("household_id").notNull(),
        action: text().notNull(),
        resourceType: text("resource_type").notNull(),
        resourceId: uuid("resource_id"),
        oldValues: jsonb("old_values"),
        newValues: jsonb("new_values"),
        details: jsonb(),
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),
        sessionId: text("session_id"),
        timestamp: timestamp({withTimezone: true, mode: "string"})
            .defaultNow()
            .notNull(),
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
        id: uuid().defaultRandom().primaryKey().notNull(),
        animalId: uuid("animal_id").notNull(),
        medicationId: uuid("medication_id").notNull(),
        name: text(),
        instructions: text(),
        scheduleType: vetmedScheduleType("schedule_type").notNull(),
        timesLocal: time("times_local").array(),
        intervalHours: integer("interval_hours"),
        startDate: date("start_date").notNull(),
        endDate: date("end_date"),
        prnReason: text("prn_reason"),
        maxDailyDoses: integer("max_daily_doses"),
        cutoffMinutes: integer("cutoff_minutes").default(240).notNull(),
        highRisk: boolean("high_risk").default(false).notNull(),
        requiresCoSign: boolean("requires_co_sign").default(false).notNull(),
        active: boolean().default(true).notNull(),
        pausedAt: timestamp("paused_at", {withTimezone: true, mode: "string"}),
        pauseReason: text("pause_reason"),
        dose: text(),
        route: text(),
        createdAt: timestamp("created_at", {withTimezone: true, mode: "string"})
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {withTimezone: true, mode: "string"})
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", {withTimezone: true, mode: "string"}),
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
        }),
    ],
);

export const vetmedAdministrations = pgTable(
    "vetmed_administrations",
    {
        id: uuid().defaultRandom().primaryKey().notNull(),
        regimenId: uuid("regimen_id").notNull(),
        animalId: uuid("animal_id").notNull(),
        householdId: uuid("household_id").notNull(),
        caregiverId: uuid("caregiver_id").notNull(),
        scheduledFor: timestamp("scheduled_for", {
            withTimezone: true,
            mode: "string",
        }),
        recordedAt: timestamp("recorded_at", {
            withTimezone: true,
            mode: "string",
        }).notNull(),
        status: vetmedAdminStatus().notNull(),
        sourceItemId: uuid("source_item_id"),
        site: text(),
        dose: text(),
        notes: text(),
        mediaUrls: text("media_urls").array(),
        coSignUserId: uuid("co_sign_user_id"),
        coSignedAt: timestamp("co_signed_at", {
            withTimezone: true,
            mode: "string",
        }),
        coSignNotes: text("co_sign_notes"),
        adverseEvent: boolean("adverse_event").default(false).notNull(),
        adverseEventDescription: text("adverse_event_description"),
        idempotencyKey: text("idempotency_key").notNull(),
        createdAt: timestamp("created_at", {withTimezone: true, mode: "string"})
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {withTimezone: true, mode: "string"})
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
        id: uuid().defaultRandom().primaryKey().notNull(),
        userId: uuid("user_id").notNull(),
        householdId: uuid("household_id").notNull(),
        type: text().notNull(), // "medication", "inventory", "system", "due", "overdue", "reminder"
        title: text().notNull(),
        message: text().notNull(),
        priority: text().default("medium").notNull(), // "low", "medium", "high", "critical"
        read: boolean().default(false).notNull(),
        dismissed: boolean().default(false).notNull(),
        actionUrl: text("action_url"), // Optional URL for click action
        data: jsonb(), // Additional metadata (animalId, regimenId, etc.)
        createdAt: timestamp("created_at", {withTimezone: true, mode: "string"})
            .defaultNow()
            .notNull(),
        readAt: timestamp("read_at", {withTimezone: true, mode: "string"}),
        dismissedAt: timestamp("dismissed_at", {withTimezone: true, mode: "string"}),
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
        id: uuid().defaultRandom().primaryKey().notNull(),
        householdId: uuid("household_id").notNull(),
        type: text().notNull(), // "ADD_REMINDER", "SHIFT_TIME", "ENABLE_COSIGN", etc.
        summary: text().notNull(),
        rationale: text().notNull(),
        priority: text().default("medium").notNull(), // "low", "medium", "high"
        estimatedImpact: text("estimated_impact"),
        status: vetmedSuggestionStatus().default("pending").notNull(),
        action: jsonb().notNull(), // Store action parameters as JSON
        originalValues: jsonb("original_values"), // Store original state for revert
        appliedAt: timestamp("applied_at", {withTimezone: true, mode: "string"}),
        appliedByUserId: uuid("applied_by_user_id"),
        revertedAt: timestamp("reverted_at", {withTimezone: true, mode: "string"}),
        revertedByUserId: uuid("reverted_by_user_id"),
        dismissedAt: timestamp("dismissed_at", {withTimezone: true, mode: "string"}),
        dismissedByUserId: uuid("dismissed_by_user_id"),
        expiresAt: timestamp("expires_at", {withTimezone: true, mode: "string"}),
        createdAt: timestamp("created_at", {withTimezone: true, mode: "string"})
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {withTimezone: true, mode: "string"})
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
        id: uuid().defaultRandom().primaryKey().notNull(),
        administrationId: uuid("administration_id").notNull(),
        requesterId: uuid("requester_id").notNull(),
        cosignerId: uuid("cosigner_id").notNull(),
        householdId: uuid("household_id").notNull(),
        status: vetmedCosignStatus().default("pending").notNull(),
        signature: text(), // Base64 encoded signature
        rejectionReason: text("rejection_reason"),
        signedAt: timestamp("signed_at", {withTimezone: true, mode: "string"}),
        createdAt: timestamp("created_at", {withTimezone: true, mode: "string"})
            .defaultNow()
            .notNull(),
        expiresAt: timestamp("expires_at", {withTimezone: true, mode: "string"})
            .notNull(),
        updatedAt: timestamp("updated_at", {withTimezone: true, mode: "string"})
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
        id: uuid().defaultRandom().primaryKey().notNull(),
        userId: uuid("user_id").notNull(),
        endpoint: text().notNull(),
        p256dhKey: text("p256dh_key").notNull(),
        authKey: text("auth_key").notNull(),
        userAgent: text("user_agent"),
        deviceName: text("device_name"),
        isActive: boolean("is_active").default(true).notNull(),
        lastUsed: timestamp("last_used", {withTimezone: true, mode: "string"})
            .defaultNow()
            .notNull(),
        createdAt: timestamp("created_at", {withTimezone: true, mode: "string"})
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {withTimezone: true, mode: "string"})
            .defaultNow()
            .notNull(),
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
        id: uuid().defaultRandom().primaryKey().notNull(),
        email: text().notNull(),
        name: text(),
        firstName: text("first_name"),
        lastName: text("last_name"),
        image: text(),
        emailVerified: timestamp("email_verified", {
            withTimezone: true,
            mode: "string",
        }),
        createdAt: timestamp("created_at", {withTimezone: true, mode: "string"})
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {withTimezone: true, mode: "string"})
            .defaultNow()
            .notNull(),
        stackUserId: text("stack_user_id"), // renamed from clerk_user_id

        // Flexible profile fields (all optional)
        bio: text(),
        pronouns: text(),
        location: text(),
        website: text(),
        socialLinks: jsonb("social_links").default(sql`'{}'::jsonb`),
        profileData: jsonb("profile_data").default(sql`'{}'::jsonb`), // Extensible custom fields
        profileVisibility: jsonb("profile_visibility").default(
            sql`'{"name": true, "email": false, "bio": true, "location": true}'::jsonb`
        ),
        profileCompletedAt: timestamp("profile_completed_at", {
            withTimezone: true,
            mode: "string",
        }),

        // Preferences
        preferredTimezone: text("preferred_timezone").default("America/New_York"),
        preferredPhoneNumber: text("preferred_phone_number"),
        use24HourTime: boolean("use_24_hour_time").default(false),
        temperatureUnit: temperatureUnit("temperature_unit").default("fahrenheit"),
        weightUnit: weightUnit("weight_unit").default("lbs"),
        emailReminders: boolean("email_reminders").default(true),
        smsReminders: boolean("sms_reminders").default(false),
        pushNotifications: boolean("push_notifications").default(true),
        reminderLeadTimeMinutes: text("reminder_lead_time_minutes").default("15"),
        emergencyContactName: text("emergency_contact_name"),
        emergencyContactPhone: text("emergency_contact_phone"),
        onboardingComplete: boolean("onboarding_complete").default(false),
        onboardingCompletedAt: timestamp("onboarding_completed_at", {
            withTimezone: true,
            mode: "string",
        }),
        weekStartsOn: integer("week_starts_on").default(0), // 0 = Sunday, 1 = Monday
        defaultHouseholdId: uuid("default_household_id"),
        defaultAnimalId: uuid("default_animal_id"),
        theme: text("theme").default("system"), // system, light, dark
        preferencesBackup: jsonb("preferences_backup"),
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
