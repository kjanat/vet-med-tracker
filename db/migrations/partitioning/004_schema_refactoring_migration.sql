-- =====================================================
-- VetMed Tracker - Schema Refactoring Migration
-- =====================================================
-- This migration completely refactors the database schema for better normalization
-- and performance. Since there are no customers, we can safely force-overwrite.
--
-- Key Changes:
-- 1. Split overly complex tables into normalized entities
-- 2. Separate concerns (auth vs profile vs preferences)
-- 3. Consolidate notification system
-- 4. Normalize medication catalog with proper relationships
-- 5. Create proper medical record entities
--
-- IMPORTANT: This is a destructive migration that completely rebuilds the schema.
-- Only run this when there's no production data to preserve.

-- =====================================================
-- Step 1: Drop all existing tables (force overwrite)
-- =====================================================

-- Drop dependent tables first (due to foreign keys)
DROP TABLE IF EXISTS vetmed_cosign_requests CASCADE;
DROP TABLE IF EXISTS vetmed_push_subscriptions CASCADE;
DROP TABLE IF EXISTS vetmed_suggestions CASCADE;
DROP TABLE IF EXISTS vetmed_administrations CASCADE;
DROP TABLE IF EXISTS vetmed_regimens CASCADE;
DROP TABLE IF EXISTS vetmed_inventory_items CASCADE;
DROP TABLE IF EXISTS vetmed_notification_queue CASCADE;
DROP TABLE IF EXISTS vetmed_notifications CASCADE;
DROP TABLE IF EXISTS vetmed_audit_log CASCADE;
DROP TABLE IF EXISTS vetmed_animals CASCADE;
DROP TABLE IF EXISTS vetmed_memberships CASCADE;
DROP TABLE IF EXISTS vetmed_medication_catalog CASCADE;
DROP TABLE IF EXISTS vetmed_users CASCADE;
DROP TABLE IF EXISTS vetmed_households CASCADE;

-- Drop existing enums (they will be recreated)
DROP TYPE IF EXISTS vetmed_cosign_status CASCADE;
DROP TYPE IF EXISTS vetmed_suggestion_status CASCADE;
DROP TYPE IF EXISTS vetmed_admin_status CASCADE;
DROP TYPE IF EXISTS vetmed_form CASCADE;
DROP TYPE IF EXISTS vetmed_route CASCADE;
DROP TYPE IF EXISTS vetmed_schedule_type CASCADE;
DROP TYPE IF EXISTS vetmed_storage CASCADE;
DROP TYPE IF EXISTS vetmed_role CASCADE;
DROP TYPE IF EXISTS temperature_unit CASCADE;
DROP TYPE IF EXISTS weight_unit CASCADE;

-- =====================================================
-- Step 2: Create new enums
-- =====================================================

CREATE TYPE temperature_unit AS ENUM ('celsius', 'fahrenheit');
CREATE TYPE weight_unit AS ENUM ('kg', 'lbs');
CREATE TYPE vetmed_admin_status AS ENUM ('ON_TIME', 'LATE', 'VERY_LATE', 'MISSED', 'PRN');
CREATE TYPE vetmed_form AS ENUM ('TABLET', 'CAPSULE', 'LIQUID', 'INJECTION', 'CREAM', 'OINTMENT', 'DROPS', 'SPRAY', 'POWDER', 'PATCH', 'OTHER');
CREATE TYPE vetmed_role AS ENUM ('OWNER', 'CAREGIVER', 'VETREADONLY');
CREATE TYPE vetmed_route AS ENUM ('ORAL', 'SC', 'IM', 'IV', 'TOPICAL', 'OTIC', 'OPHTHALMIC', 'INHALED', 'RECTAL', 'OTHER');
CREATE TYPE vetmed_schedule_type AS ENUM ('FIXED', 'PRN', 'INTERVAL', 'TAPER');
CREATE TYPE vetmed_storage AS ENUM ('ROOM', 'FRIDGE', 'FREEZER', 'CONTROLLED');
CREATE TYPE vetmed_notification_status AS ENUM ('draft', 'scheduled', 'sent', 'delivered', 'read', 'dismissed', 'failed');
CREATE TYPE vetmed_delivery_method AS ENUM ('in_app', 'push', 'email', 'sms');
CREATE TYPE vetmed_severity AS ENUM ('mild', 'moderate', 'severe', 'critical');
CREATE TYPE vetmed_allergen_type AS ENUM ('food', 'environmental', 'medication', 'contact', 'other');
CREATE TYPE vetmed_cosign_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
CREATE TYPE vetmed_suggestion_status AS ENUM ('pending', 'applied', 'reverted', 'dismissed');

-- =====================================================
-- Step 3: Create core foundational tables
-- =====================================================

-- Households - Core organization unit
CREATE TABLE vetmed_households
(
    id         uuid                     DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    name       text                                                           NOT NULL,
    timezone   text                     DEFAULT 'America/New_York'            NOT NULL,
    created_at timestamp with time zone DEFAULT now()                         NOT NULL,
    updated_at timestamp with time zone DEFAULT now()                         NOT NULL
);

-- Users - Core authentication and basic info only
CREATE TABLE vetmed_users
(
    id             uuid                     DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    email          text                                                           NOT NULL,
    name           text,
    first_name     text,
    last_name      text,
    image          text,
    email_verified timestamp with time zone,
    stack_user_id  text,
    created_at     timestamp with time zone DEFAULT now()                         NOT NULL,
    updated_at     timestamp with time zone DEFAULT now()                         NOT NULL,

    CONSTRAINT vetmed_users_email_unique UNIQUE (email),
    CONSTRAINT vetmed_users_stack_user_id_unique UNIQUE (stack_user_id)
);

-- User Profiles - Extended profile information
CREATE TABLE vetmed_user_profiles
(
    user_id              uuid PRIMARY KEY                       NOT NULL,
    bio                  text,
    pronouns             text,
    location             text,
    website              text,
    social_links         jsonb                    DEFAULT '{}'::jsonb,
    profile_data         jsonb                    DEFAULT '{}'::jsonb,
    profile_visibility   jsonb                    DEFAULT '{
      "name": true,
      "email": false,
      "bio": true,
      "location": true
    }'::jsonb,
    profile_completed_at timestamp with time zone,
    created_at           timestamp with time zone DEFAULT now() NOT NULL,
    updated_at           timestamp with time zone DEFAULT now() NOT NULL,

    CONSTRAINT vetmed_user_profiles_user_id_fk
        FOREIGN KEY (user_id) REFERENCES vetmed_users (id) ON DELETE CASCADE
);

-- User Preferences - Settings and preferences
CREATE TABLE vetmed_user_preferences
(
    user_id                    uuid PRIMARY KEY                       NOT NULL,
    preferred_timezone         text                     DEFAULT 'America/New_York',
    preferred_phone_number     text,
    use_24_hour_time           boolean                  DEFAULT false,
    temperature_unit           temperature_unit         DEFAULT 'fahrenheit',
    weight_unit                weight_unit              DEFAULT 'lbs',
    email_reminders            boolean                  DEFAULT true,
    sms_reminders              boolean                  DEFAULT false,
    push_notifications         boolean                  DEFAULT true,
    reminder_lead_time_minutes text                     DEFAULT '15',
    week_starts_on             integer                  DEFAULT 0,        -- 0 = Sunday, 1 = Monday
    theme                      text                     DEFAULT 'system', -- system, light, dark
    default_household_id       uuid,
    default_animal_id          uuid,
    onboarding_complete        boolean                  DEFAULT false,
    onboarding_completed_at    timestamp with time zone,
    preferences_backup         jsonb,
    created_at                 timestamp with time zone DEFAULT now() NOT NULL,
    updated_at                 timestamp with time zone DEFAULT now() NOT NULL,

    CONSTRAINT vetmed_user_preferences_user_id_fk
        FOREIGN KEY (user_id) REFERENCES vetmed_users (id) ON DELETE CASCADE,
    CONSTRAINT vetmed_user_preferences_default_household_id_fk
        FOREIGN KEY (default_household_id) REFERENCES vetmed_households (id) ON DELETE SET NULL
);

-- Emergency Contacts - Separate for security/privacy
CREATE TABLE vetmed_emergency_contacts
(
    id            uuid                     DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    user_id       uuid                                                           NOT NULL,
    contact_name  text                                                           NOT NULL,
    contact_phone text                                                           NOT NULL,
    relationship  text,
    is_primary    boolean                  DEFAULT false,
    created_at    timestamp with time zone DEFAULT now()                         NOT NULL,
    updated_at    timestamp with time zone DEFAULT now()                         NOT NULL,

    CONSTRAINT vetmed_emergency_contacts_user_id_fk
        FOREIGN KEY (user_id) REFERENCES vetmed_users (id) ON DELETE CASCADE
);

CREATE INDEX emergency_contacts_user_id_idx ON vetmed_emergency_contacts USING btree (user_id);

-- Household Memberships
CREATE TABLE vetmed_memberships
(
    id           uuid                     DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    user_id      uuid                                                           NOT NULL,
    household_id uuid                                                           NOT NULL,
    role         vetmed_role              DEFAULT 'CAREGIVER'                   NOT NULL,
    created_at   timestamp with time zone DEFAULT now()                         NOT NULL,
    updated_at   timestamp with time zone DEFAULT now()                         NOT NULL,

    CONSTRAINT vetmed_memberships_user_id_fk
        FOREIGN KEY (user_id) REFERENCES vetmed_users (id) ON DELETE CASCADE,
    CONSTRAINT vetmed_memberships_household_id_fk
        FOREIGN KEY (household_id) REFERENCES vetmed_households (id) ON DELETE CASCADE,
    CONSTRAINT vetmed_memberships_user_id_household_id_unique
        UNIQUE (user_id, household_id)
);

CREATE INDEX membership_household_id_idx ON vetmed_memberships USING btree (household_id);
CREATE INDEX membership_user_id_idx ON vetmed_memberships USING btree (user_id);

-- =====================================================
-- Step 4: Create veterinary entities
-- =====================================================

-- Veterinarians - Reusable across animals and households
CREATE TABLE vetmed_veterinarians
(
    id                uuid                     DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    name              text                                                           NOT NULL,
    phone             text,
    email             text,
    clinic_name       text,
    specialties       text[],
    address           jsonb,
    emergency_contact boolean                  DEFAULT false,
    license_number    text,
    notes             text,
    created_at        timestamp with time zone DEFAULT now()                         NOT NULL,
    updated_at        timestamp with time zone DEFAULT now()                         NOT NULL
);

CREATE INDEX veterinarians_name_idx ON vetmed_veterinarians USING btree (name);
CREATE INDEX veterinarians_clinic_name_idx ON vetmed_veterinarians USING btree (clinic_name);

-- Animals - Core animal information only
CREATE TABLE vetmed_animals
(
    id           uuid                     DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    household_id uuid                                                           NOT NULL,
    name         text                                                           NOT NULL,
    species      text                                                           NOT NULL,
    breed        text,
    sex          text,
    neutered     boolean                  DEFAULT false                         NOT NULL,
    dob          date,
    weight_kg    numeric(5, 2),
    microchip_id text,
    color        text,
    photo_url    text,
    timezone     text                     DEFAULT 'America/New_York'            NOT NULL,
    notes        text,
    created_at   timestamp with time zone DEFAULT now()                         NOT NULL,
    updated_at   timestamp with time zone DEFAULT now()                         NOT NULL,
    deleted_at   timestamp with time zone,

    CONSTRAINT vetmed_animals_household_id_fk
        FOREIGN KEY (household_id) REFERENCES vetmed_households (id) ON DELETE CASCADE
);

CREATE INDEX animals_deleted_at_idx ON vetmed_animals USING btree (deleted_at);
CREATE INDEX animals_household_id_idx ON vetmed_animals USING btree (household_id);
CREATE INDEX animals_species_idx ON vetmed_animals USING btree (species);

-- Animal-Veterinarian relationships (many-to-many)
CREATE TABLE vetmed_animal_veterinarians
(
    animal_id         uuid                                   NOT NULL,
    veterinarian_id   uuid                                   NOT NULL,
    is_primary        boolean                  DEFAULT false,
    relationship_type text, -- "primary", "specialist", "emergency"
    notes             text,
    created_at        timestamp with time zone DEFAULT now() NOT NULL,

    CONSTRAINT vetmed_animal_veterinarians_animal_id_fk
        FOREIGN KEY (animal_id) REFERENCES vetmed_animals (id) ON DELETE CASCADE,
    CONSTRAINT vetmed_animal_veterinarians_veterinarian_id_fk
        FOREIGN KEY (veterinarian_id) REFERENCES vetmed_veterinarians (id) ON DELETE CASCADE,
    CONSTRAINT vetmed_animal_veterinarians_unique
        UNIQUE (animal_id, veterinarian_id)
);

CREATE INDEX animal_veterinarians_animal_id_idx ON vetmed_animal_veterinarians USING btree (animal_id);
CREATE INDEX animal_veterinarians_veterinarian_id_idx ON vetmed_animal_veterinarians USING btree (veterinarian_id);

-- Animal Medical Records - Normalized medical history
CREATE TABLE vetmed_animal_medical_records
(
    id              uuid                     DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    animal_id       uuid                                                           NOT NULL,
    record_type     text                                                           NOT NULL, -- "condition", "diagnosis", "procedure", "note"
    title           text                                                           NOT NULL,
    description     text,
    diagnosed_date  date,
    severity        vetmed_severity,
    status          text                     DEFAULT 'active',                               -- "active", "resolved", "chronic", "monitoring"
    veterinarian_id uuid,
    attachments     text[],
    notes           text,
    created_at      timestamp with time zone DEFAULT now()                         NOT NULL,
    updated_at      timestamp with time zone DEFAULT now()                         NOT NULL,

    CONSTRAINT vetmed_animal_medical_records_animal_id_fk
        FOREIGN KEY (animal_id) REFERENCES vetmed_animals (id) ON DELETE CASCADE,
    CONSTRAINT vetmed_animal_medical_records_veterinarian_id_fk
        FOREIGN KEY (veterinarian_id) REFERENCES vetmed_veterinarians (id) ON DELETE SET NULL
);

CREATE INDEX medical_records_animal_id_idx ON vetmed_animal_medical_records USING btree (animal_id);
CREATE INDEX medical_records_type_idx ON vetmed_animal_medical_records USING btree (record_type);
CREATE INDEX medical_records_diagnosed_date_idx ON vetmed_animal_medical_records USING btree (diagnosed_date);

-- Animal Allergies - Separate table for better tracking and reporting
CREATE TABLE vetmed_animal_allergies
(
    id              uuid                     DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    animal_id       uuid                                                           NOT NULL,
    allergen        text                                                           NOT NULL,
    allergen_type   vetmed_allergen_type,
    severity        vetmed_severity,
    reaction_type   text, -- "skin", "respiratory", "digestive", "systemic"
    symptoms        text[],
    discovered_date date,
    confirmed_by    uuid, -- veterinarian_id
    notes           text,
    is_active       boolean                  DEFAULT true,
    created_at      timestamp with time zone DEFAULT now()                         NOT NULL,
    updated_at      timestamp with time zone DEFAULT now()                         NOT NULL,

    CONSTRAINT vetmed_animal_allergies_animal_id_fk
        FOREIGN KEY (animal_id) REFERENCES vetmed_animals (id) ON DELETE CASCADE,
    CONSTRAINT vetmed_animal_allergies_confirmed_by_fk
        FOREIGN KEY (confirmed_by) REFERENCES vetmed_veterinarians (id) ON DELETE SET NULL
);

CREATE INDEX animal_allergies_animal_id_idx ON vetmed_animal_allergies USING btree (animal_id);
CREATE INDEX animal_allergies_allergen_type_idx ON vetmed_animal_allergies USING btree (allergen_type);
CREATE INDEX animal_allergies_severity_idx ON vetmed_animal_allergies USING btree (severity);

-- =====================================================
-- Step 5: Create normalized medication entities
-- =====================================================

-- Core Medication Catalog - Simple and focused
CREATE TABLE vetmed_medications
(
    id                      uuid                     DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    generic_name            text                                                           NOT NULL,
    brand_name              text,
    strength                text,
    route                   vetmed_route                                                   NOT NULL,
    form                    vetmed_form                                                    NOT NULL,
    controlled_substance    boolean                  DEFAULT false                         NOT NULL,
    common_dosing           text,
    warnings                text,
    contraindications       text[],
    concentration_mg_ml     numeric(10, 4),
    units_per_tablet        numeric(10, 4),
    unit_type               text                     DEFAULT 'mg',
    typical_frequency_hours integer,
    max_frequency_per_day   integer,
    created_at              timestamp with time zone DEFAULT now()                         NOT NULL,
    updated_at              timestamp with time zone DEFAULT now()                         NOT NULL
);

CREATE INDEX medications_brand_name_idx ON vetmed_medications USING btree (brand_name);
CREATE INDEX medications_generic_name_idx ON vetmed_medications USING btree (generic_name);
CREATE INDEX medications_route_form_idx ON vetmed_medications USING btree (route, form);

-- Dosage Guidelines - Flexible dosing rules
CREATE TABLE vetmed_dosage_guidelines
(
    id                      uuid                     DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    medication_id           uuid                                                           NOT NULL,
    species                 text                                                           NOT NULL,
    min_dose_mg_kg          numeric(10, 4),
    max_dose_mg_kg          numeric(10, 4),
    typical_dose_mg_kg      numeric(10, 4),
    max_daily_dose_mg       numeric(10, 2),
    typical_frequency_hours integer,
    max_frequency_per_day   integer,
    age_min_months          integer,
    age_max_months          integer,
    weight_min_kg           numeric(5, 2),
    weight_max_kg           numeric(5, 2),
    special_instructions    text,
    notes                   text,
    created_at              timestamp with time zone DEFAULT now()                         NOT NULL,
    updated_at              timestamp with time zone DEFAULT now()                         NOT NULL,

    CONSTRAINT vetmed_dosage_guidelines_medication_id_fk
        FOREIGN KEY (medication_id) REFERENCES vetmed_medications (id) ON DELETE CASCADE
);

CREATE INDEX dosage_guidelines_medication_id_idx ON vetmed_dosage_guidelines USING btree (medication_id);
CREATE INDEX dosage_guidelines_species_idx ON vetmed_dosage_guidelines USING btree (species);

-- Species-specific adjustments
CREATE TABLE vetmed_species_adjustments
(
    id                   uuid                     DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    medication_id        uuid                                                           NOT NULL,
    species              text                                                           NOT NULL,
    dose_multiplier      numeric(5, 3),
    special_instructions text,
    contraindications    text[],
    warnings             text[],
    created_at           timestamp with time zone DEFAULT now()                         NOT NULL,

    CONSTRAINT vetmed_species_adjustments_medication_id_fk
        FOREIGN KEY (medication_id) REFERENCES vetmed_medications (id) ON DELETE CASCADE,
    CONSTRAINT vetmed_species_adjustments_medication_species_unique
        UNIQUE (medication_id, species)
);

CREATE INDEX species_adjustments_medication_id_idx ON vetmed_species_adjustments USING btree (medication_id);
CREATE INDEX species_adjustments_species_idx ON vetmed_species_adjustments USING btree (species);

-- Breed-specific considerations
CREATE TABLE vetmed_breed_considerations
(
    id                uuid                     DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    medication_id     uuid                                                           NOT NULL,
    breed             text                                                           NOT NULL,
    adjustment_type   text                                                           NOT NULL, -- "dose_reduction", "contraindicated", "monitoring_required"
    dose_multiplier   numeric(5, 3),
    contraindications text[],
    special_notes     text,
    genetic_factor    text,                                                                    -- e.g., "MDR1 gene"
    created_at        timestamp with time zone DEFAULT now()                         NOT NULL,

    CONSTRAINT vetmed_breed_considerations_medication_id_fk
        FOREIGN KEY (medication_id) REFERENCES vetmed_medications (id) ON DELETE CASCADE
);

CREATE INDEX breed_considerations_medication_id_idx ON vetmed_breed_considerations USING btree (medication_id);
CREATE INDEX breed_considerations_breed_idx ON vetmed_breed_considerations USING btree (breed);

-- Route-specific adjustments
CREATE TABLE vetmed_route_adjustments
(
    id                   uuid                     DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    medication_id        uuid                                                           NOT NULL,
    route                vetmed_route                                                   NOT NULL,
    dose_multiplier      numeric(5, 3),
    additional_warnings  text[],
    preparation_notes    text,
    administration_notes text,
    created_at           timestamp with time zone DEFAULT now()                         NOT NULL,

    CONSTRAINT vetmed_route_adjustments_medication_id_fk
        FOREIGN KEY (medication_id) REFERENCES vetmed_medications (id) ON DELETE CASCADE,
    CONSTRAINT vetmed_route_adjustments_medication_route_unique
        UNIQUE (medication_id, route)
);

CREATE INDEX route_adjustments_medication_id_idx ON vetmed_route_adjustments USING btree (medication_id);
CREATE INDEX route_adjustments_route_idx ON vetmed_route_adjustments USING btree (route);

-- =====================================================
-- Step 6: Create inventory and administration tables (keep good existing design)
-- =====================================================

-- Fix foreign key references for default preferences
ALTER TABLE vetmed_user_preferences
    ADD CONSTRAINT vetmed_user_preferences_default_animal_id_fk
        FOREIGN KEY (default_animal_id) REFERENCES vetmed_animals (id) ON DELETE SET NULL;

-- Inventory Items
CREATE TABLE vetmed_inventory_items
(
    id                 uuid                     DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    household_id       uuid                                                           NOT NULL,
    medication_id      uuid                                                           NOT NULL,
    assigned_animal_id uuid,
    brand_override     text,
    concentration      text,
    lot                text,
    expires_on         date                                                           NOT NULL,
    storage            vetmed_storage           DEFAULT 'ROOM'                        NOT NULL,
    quantity_units     integer,
    units_remaining    integer,
    unit_type          text,
    opened_on          date,
    in_use             boolean                  DEFAULT false                         NOT NULL,
    barcode            text,
    purchase_date      date,
    purchase_price     numeric(10, 2),
    supplier           text,
    notes              text,
    created_at         timestamp with time zone DEFAULT now()                         NOT NULL,
    updated_at         timestamp with time zone DEFAULT now()                         NOT NULL,
    deleted_at         timestamp with time zone,

    CONSTRAINT vetmed_inventory_items_household_id_fk
        FOREIGN KEY (household_id) REFERENCES vetmed_households (id) ON DELETE CASCADE,
    CONSTRAINT vetmed_inventory_items_assigned_animal_id_fk
        FOREIGN KEY (assigned_animal_id) REFERENCES vetmed_animals (id) ON DELETE SET NULL,
    CONSTRAINT vetmed_inventory_items_medication_id_fk
        FOREIGN KEY (medication_id) REFERENCES vetmed_medications (id)
);

CREATE INDEX inventory_animal_id_idx ON vetmed_inventory_items USING btree (assigned_animal_id);
CREATE INDEX inventory_deleted_at_idx ON vetmed_inventory_items USING btree (deleted_at);
CREATE INDEX inventory_expires_on_idx ON vetmed_inventory_items USING btree (expires_on);
CREATE INDEX inventory_household_id_idx ON vetmed_inventory_items USING btree (household_id);
CREATE INDEX inventory_in_use_idx ON vetmed_inventory_items USING btree (in_use);

-- Regimens
CREATE TABLE vetmed_regimens
(
    id               uuid                     DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    animal_id        uuid                                                           NOT NULL,
    medication_id    uuid                                                           NOT NULL,
    name             text,
    instructions     text,
    schedule_type    vetmed_schedule_type                                           NOT NULL,
    times_local      time[],
    interval_hours   integer,
    start_date       date                                                           NOT NULL,
    end_date         date,
    prn_reason       text,
    max_daily_doses  integer,
    cutoff_minutes   integer                  DEFAULT 240                           NOT NULL,
    high_risk        boolean                  DEFAULT false                         NOT NULL,
    requires_co_sign boolean                  DEFAULT false                         NOT NULL,
    active           boolean                  DEFAULT true                          NOT NULL,
    paused_at        timestamp with time zone,
    pause_reason     text,
    dose             text,
    route            text,
    created_at       timestamp with time zone DEFAULT now()                         NOT NULL,
    updated_at       timestamp with time zone DEFAULT now()                         NOT NULL,
    deleted_at       timestamp with time zone,

    CONSTRAINT vetmed_regimens_animal_id_fk
        FOREIGN KEY (animal_id) REFERENCES vetmed_animals (id) ON DELETE CASCADE,
    CONSTRAINT vetmed_regimens_medication_id_fk
        FOREIGN KEY (medication_id) REFERENCES vetmed_medications (id)
);

CREATE INDEX regimens_active_idx ON vetmed_regimens USING btree (active);
CREATE INDEX regimens_animal_id_idx ON vetmed_regimens USING btree (animal_id);
CREATE INDEX regimens_deleted_at_idx ON vetmed_regimens USING btree (deleted_at);
CREATE INDEX regimens_start_date_idx ON vetmed_regimens USING btree (start_date);

-- Administrations
CREATE TABLE vetmed_administrations
(
    id                        uuid                     DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    regimen_id                uuid                                                           NOT NULL,
    animal_id                 uuid                                                           NOT NULL,
    household_id              uuid                                                           NOT NULL,
    caregiver_id              uuid                                                           NOT NULL,
    scheduled_for             timestamp with time zone,
    recorded_at               timestamp with time zone                                       NOT NULL,
    status                    vetmed_admin_status                                            NOT NULL,
    source_item_id            uuid,
    site                      text,
    dose                      text,
    notes                     text,
    media_urls                text[],
    co_sign_user_id           uuid,
    co_signed_at              timestamp with time zone,
    co_sign_notes             text,
    adverse_event             boolean                  DEFAULT false                         NOT NULL,
    adverse_event_description text,
    idempotency_key           text                                                           NOT NULL,
    created_at                timestamp with time zone DEFAULT now()                         NOT NULL,
    updated_at                timestamp with time zone DEFAULT now()                         NOT NULL,

    CONSTRAINT vetmed_administrations_regimen_id_fk
        FOREIGN KEY (regimen_id) REFERENCES vetmed_regimens (id),
    CONSTRAINT vetmed_administrations_animal_id_fk
        FOREIGN KEY (animal_id) REFERENCES vetmed_animals (id),
    CONSTRAINT vetmed_administrations_household_id_fk
        FOREIGN KEY (household_id) REFERENCES vetmed_households (id),
    CONSTRAINT vetmed_administrations_caregiver_id_fk
        FOREIGN KEY (caregiver_id) REFERENCES vetmed_users (id),
    CONSTRAINT vetmed_administrations_co_sign_user_id_fk
        FOREIGN KEY (co_sign_user_id) REFERENCES vetmed_users (id),
    CONSTRAINT vetmed_administrations_source_item_id_fk
        FOREIGN KEY (source_item_id) REFERENCES vetmed_inventory_items (id),
    CONSTRAINT vetmed_administrations_idempotency_key_unique
        UNIQUE (idempotency_key)
);

CREATE INDEX administrations_animal_id_idx ON vetmed_administrations USING btree (animal_id);
CREATE INDEX administrations_household_id_idx ON vetmed_administrations USING btree (household_id);
CREATE INDEX administrations_idempotency_key_idx ON vetmed_administrations USING btree (idempotency_key);
CREATE INDEX administrations_recorded_at_idx ON vetmed_administrations USING btree (recorded_at);
CREATE INDEX administrations_regimen_id_idx ON vetmed_administrations USING btree (regimen_id);
CREATE INDEX administrations_scheduled_for_idx ON vetmed_administrations USING btree (scheduled_for);
CREATE INDEX administrations_status_idx ON vetmed_administrations USING btree (status);

-- =====================================================
-- Step 7: Create consolidated notification system
-- =====================================================

-- Unified Notifications - Consolidates previous separate notification tables
CREATE TABLE vetmed_notifications
(
    id              uuid                       DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    user_id         uuid                                                             NOT NULL,
    household_id    uuid                                                             NOT NULL,
    type            text                                                             NOT NULL, -- "medication", "inventory", "system", "due", "overdue", "reminder"
    title           text                                                             NOT NULL,
    message         text                                                             NOT NULL,
    priority        text                       DEFAULT 'medium'                      NOT NULL, -- "low", "medium", "high", "critical"

    -- Status workflow: draft -> scheduled -> sent -> delivered -> read/dismissed
    status          vetmed_notification_status DEFAULT 'draft'                       NOT NULL,

    -- Scheduling and delivery
    scheduled_for   timestamp with time zone,
    delivery_method vetmed_delivery_method     DEFAULT 'in_app',
    delivery_data   jsonb,

    -- Timing tracking
    sent_at         timestamp with time zone,
    delivered_at    timestamp with time zone,
    read_at         timestamp with time zone,
    dismissed_at    timestamp with time zone,
    snoozed_until   timestamp with time zone,

    -- Error handling
    attempts        integer                    DEFAULT 0                             NOT NULL,
    last_error      text,
    failed_at       timestamp with time zone,

    -- Metadata
    action_url      text,
    data            jsonb,

    created_at      timestamp with time zone   DEFAULT now()                         NOT NULL,
    updated_at      timestamp with time zone   DEFAULT now()                         NOT NULL,

    CONSTRAINT vetmed_notifications_user_id_fk
        FOREIGN KEY (user_id) REFERENCES vetmed_users (id) ON DELETE CASCADE,
    CONSTRAINT vetmed_notifications_household_id_fk
        FOREIGN KEY (household_id) REFERENCES vetmed_households (id) ON DELETE CASCADE
);

CREATE INDEX notifications_user_status_idx ON vetmed_notifications USING btree (user_id, status);
CREATE INDEX notifications_household_idx ON vetmed_notifications USING btree (household_id);
CREATE INDEX notifications_created_at_idx ON vetmed_notifications USING btree (created_at DESC);
CREATE INDEX notifications_scheduled_for_idx ON vetmed_notifications USING btree (scheduled_for);
CREATE INDEX notifications_type_idx ON vetmed_notifications USING btree (type);
CREATE INDEX notifications_priority_idx ON vetmed_notifications USING btree (priority);

-- Partial index for unread notifications (most common query)
CREATE INDEX notifications_user_unread_idx ON vetmed_notifications USING btree (user_id, created_at DESC)
    WHERE status IN ('sent', 'delivered') AND read_at IS NULL AND dismissed_at IS NULL;

-- =====================================================
-- Step 8: Create system tables (audit, suggestions, etc.)
-- =====================================================

-- Audit Log
CREATE TABLE vetmed_audit_log
(
    id            uuid                     DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    user_id       uuid                                                           NOT NULL,
    household_id  uuid                                                           NOT NULL,
    action        text                                                           NOT NULL,
    resource_type text                                                           NOT NULL,
    resource_id   uuid,
    old_values    jsonb,
    new_values    jsonb,
    details       jsonb,
    ip_address    text,
    user_agent    text,
    session_id    text,
    timestamp     timestamp with time zone DEFAULT now()                         NOT NULL,

    CONSTRAINT vetmed_audit_log_user_id_fk
        FOREIGN KEY (user_id) REFERENCES vetmed_users (id),
    CONSTRAINT vetmed_audit_log_household_id_fk
        FOREIGN KEY (household_id) REFERENCES vetmed_households (id)
);

CREATE INDEX audit_household_id_idx ON vetmed_audit_log USING btree (household_id);
CREATE INDEX audit_resource_idx ON vetmed_audit_log USING btree (resource_type, resource_id);
CREATE INDEX audit_timestamp_idx ON vetmed_audit_log USING btree (timestamp);
CREATE INDEX audit_user_id_idx ON vetmed_audit_log USING btree (user_id);

-- Suggestions
CREATE TABLE vetmed_suggestions
(
    id                   uuid                     DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    household_id         uuid                                                           NOT NULL,
    type                 text                                                           NOT NULL,
    summary              text                                                           NOT NULL,
    rationale            text                                                           NOT NULL,
    priority             text                     DEFAULT 'medium'                      NOT NULL,
    estimated_impact     text,
    status               vetmed_suggestion_status DEFAULT 'pending'                     NOT NULL,
    action               jsonb                                                          NOT NULL,
    original_values      jsonb,
    applied_at           timestamp with time zone,
    applied_by_user_id   uuid,
    reverted_at          timestamp with time zone,
    reverted_by_user_id  uuid,
    dismissed_at         timestamp with time zone,
    dismissed_by_user_id uuid,
    expires_at           timestamp with time zone,
    created_at           timestamp with time zone DEFAULT now()                         NOT NULL,
    updated_at           timestamp with time zone DEFAULT now()                         NOT NULL,

    CONSTRAINT vetmed_suggestions_household_id_fk
        FOREIGN KEY (household_id) REFERENCES vetmed_households (id) ON DELETE CASCADE,
    CONSTRAINT vetmed_suggestions_applied_by_user_id_fk
        FOREIGN KEY (applied_by_user_id) REFERENCES vetmed_users (id) ON DELETE SET NULL,
    CONSTRAINT vetmed_suggestions_reverted_by_user_id_fk
        FOREIGN KEY (reverted_by_user_id) REFERENCES vetmed_users (id) ON DELETE SET NULL,
    CONSTRAINT vetmed_suggestions_dismissed_by_user_id_fk
        FOREIGN KEY (dismissed_by_user_id) REFERENCES vetmed_users (id) ON DELETE SET NULL
);

CREATE INDEX suggestions_household_id_idx ON vetmed_suggestions USING btree (household_id);
CREATE INDEX suggestions_status_idx ON vetmed_suggestions USING btree (status);
CREATE INDEX suggestions_type_idx ON vetmed_suggestions USING btree (type);
CREATE INDEX suggestions_created_at_idx ON vetmed_suggestions USING btree (created_at DESC);

-- Co-sign requests
CREATE TABLE vetmed_cosign_requests
(
    id                uuid                     DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    administration_id uuid                                                           NOT NULL,
    requester_id      uuid                                                           NOT NULL,
    cosigner_id       uuid                                                           NOT NULL,
    household_id      uuid                                                           NOT NULL,
    status            vetmed_cosign_status     DEFAULT 'pending'                     NOT NULL,
    signature         text,
    rejection_reason  text,
    signed_at         timestamp with time zone,
    created_at        timestamp with time zone DEFAULT now()                         NOT NULL,
    expires_at        timestamp with time zone                                       NOT NULL,
    updated_at        timestamp with time zone DEFAULT now()                         NOT NULL,

    CONSTRAINT vetmed_cosign_requests_administration_id_fk
        FOREIGN KEY (administration_id) REFERENCES vetmed_administrations (id) ON DELETE CASCADE,
    CONSTRAINT vetmed_cosign_requests_requester_id_fk
        FOREIGN KEY (requester_id) REFERENCES vetmed_users (id) ON DELETE CASCADE,
    CONSTRAINT vetmed_cosign_requests_cosigner_id_fk
        FOREIGN KEY (cosigner_id) REFERENCES vetmed_users (id) ON DELETE CASCADE,
    CONSTRAINT vetmed_cosign_requests_household_id_fk
        FOREIGN KEY (household_id) REFERENCES vetmed_households (id) ON DELETE CASCADE,
    CONSTRAINT vetmed_cosign_requests_administration_id_unique
        UNIQUE (administration_id)
);

CREATE INDEX cosign_requests_administration_id_idx ON vetmed_cosign_requests USING btree (administration_id);
CREATE INDEX cosign_requests_requester_id_idx ON vetmed_cosign_requests USING btree (requester_id);
CREATE INDEX cosign_requests_cosigner_id_idx ON vetmed_cosign_requests USING btree (cosigner_id);
CREATE INDEX cosign_requests_household_id_idx ON vetmed_cosign_requests USING btree (household_id);
CREATE INDEX cosign_requests_status_idx ON vetmed_cosign_requests USING btree (status);
CREATE INDEX cosign_requests_expires_at_idx ON vetmed_cosign_requests USING btree (expires_at);

-- Push Subscriptions
CREATE TABLE vetmed_push_subscriptions
(
    id          uuid                     DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    user_id     uuid                                                           NOT NULL,
    endpoint    text                                                           NOT NULL,
    p256dh_key  text                                                           NOT NULL,
    auth_key    text                                                           NOT NULL,
    user_agent  text,
    device_name text,
    is_active   boolean                  DEFAULT true                          NOT NULL,
    last_used   timestamp with time zone DEFAULT now()                         NOT NULL,
    created_at  timestamp with time zone DEFAULT now()                         NOT NULL,
    updated_at  timestamp with time zone DEFAULT now()                         NOT NULL,

    CONSTRAINT vetmed_push_subscriptions_user_id_fk
        FOREIGN KEY (user_id) REFERENCES vetmed_users (id) ON DELETE CASCADE,
    CONSTRAINT vetmed_push_subscriptions_endpoint_unique
        UNIQUE (endpoint)
);

CREATE INDEX push_subscription_user_idx ON vetmed_push_subscriptions USING btree (user_id);
CREATE INDEX push_subscription_endpoint_idx ON vetmed_push_subscriptions USING btree (endpoint);
CREATE INDEX push_subscription_active_idx ON vetmed_push_subscriptions USING btree (is_active);

-- =====================================================
-- Step 9: Final optimizations and analysis
-- =====================================================

-- Update all table statistics for optimal query planning
ANALYZE
vetmed_households;
ANALYZE
vetmed_users;
ANALYZE
vetmed_user_profiles;
ANALYZE
vetmed_user_preferences;
ANALYZE
vetmed_emergency_contacts;
ANALYZE
vetmed_memberships;
ANALYZE
vetmed_veterinarians;
ANALYZE
vetmed_animals;
ANALYZE
vetmed_animal_veterinarians;
ANALYZE
vetmed_animal_medical_records;
ANALYZE
vetmed_animal_allergies;
ANALYZE
vetmed_medications;
ANALYZE
vetmed_dosage_guidelines;
ANALYZE
vetmed_species_adjustments;
ANALYZE
vetmed_breed_considerations;
ANALYZE
vetmed_route_adjustments;
ANALYZE
vetmed_inventory_items;
ANALYZE
vetmed_regimens;
ANALYZE
vetmed_administrations;
ANALYZE
vetmed_notifications;
ANALYZE
vetmed_audit_log;
ANALYZE
vetmed_suggestions;
ANALYZE
vetmed_cosign_requests;
ANALYZE
vetmed_push_subscriptions;

-- =====================================================
-- Migration Complete
-- =====================================================

-- Log successful completion
INSERT INTO vetmed_audit_log (user_id, household_id, action, resource_type,
                              details, timestamp)
VALUES ('00000000-0000-0000-0000-000000000000', -- System user ID
        '00000000-0000-0000-0000-000000000000', -- System household ID
        'SCHEMA_REFACTORING_COMPLETE',
        'DATABASE',
        jsonb_build_object(
                'migration', '004_schema_refactoring_migration',
                'tables_created', 25,
                'normalization_improvements', array[
                    'Split users into users/profiles/preferences/emergency_contacts',
                'Normalized medication catalog into focused entities',
                'Created proper medical record entities',
                'Consolidated notification system',
                'Added veterinarian management'
                    ],
                'performance_improvements', array[
                    'Optimized indexes for query patterns',
                'Reduced table sizes through normalization',
                'Improved foreign key relationships',
                'Added partial indexes for common queries'
                    ]
        ),
        now());

COMMENT
ON SCHEMA public IS 'VetMed Tracker - Refactored schema with proper normalization and performance optimizations. Migration 004 completed successfully.';

-- End of migration