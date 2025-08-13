CREATE TYPE "public"."vetmed_admin_status" AS ENUM('ON_TIME', 'LATE', 'VERY_LATE', 'MISSED', 'PRN');--> statement-breakpoint
CREATE TYPE "public"."vetmed_form" AS ENUM('TABLET', 'CAPSULE', 'LIQUID', 'INJECTION', 'CREAM', 'OINTMENT', 'DROPS', 'SPRAY', 'POWDER', 'PATCH', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."vetmed_role" AS ENUM('OWNER', 'CAREGIVER', 'VETREADONLY');--> statement-breakpoint
CREATE TYPE "public"."vetmed_route" AS ENUM('ORAL', 'SC', 'IM', 'IV', 'TOPICAL', 'OTIC', 'OPHTHALMIC', 'INHALED', 'RECTAL', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."vetmed_schedule_type" AS ENUM('FIXED', 'PRN', 'INTERVAL', 'TAPER');--> statement-breakpoint
CREATE TYPE "public"."vetmed_storage" AS ENUM('ROOM', 'FRIDGE', 'FREEZER', 'CONTROLLED');--> statement-breakpoint
CREATE TYPE "public"."temperature_unit" AS ENUM('celsius', 'fahrenheit');--> statement-breakpoint
CREATE TYPE "public"."weight_unit" AS ENUM('kg', 'lbs');--> statement-breakpoint
CREATE TABLE "vetmed_animals"
(
    "id"           uuid PRIMARY KEY         DEFAULT gen_random_uuid()  NOT NULL,
    "household_id" uuid                                                NOT NULL,
    "name"         text                                                NOT NULL,
    "species"      text                                                NOT NULL,
    "breed"        text,
    "sex"          text,
    "neutered"     boolean                  DEFAULT false              NOT NULL,
    "dob"          date,
    "weight_kg"    numeric(5, 2),
    "microchip_id" text,
    "color"        text,
    "photo_url"    text,
    "timezone"     text                     DEFAULT 'America/New_York' NOT NULL,
    "vet_name"     text,
    "vet_phone"    text,
    "vet_email"    text,
    "clinic_name"  text,
    "allergies"    text[],
    "conditions"   text[],
    "notes"        text,
    "created_at"   timestamp with time zone DEFAULT now()              NOT NULL,
    "updated_at"   timestamp with time zone DEFAULT now()              NOT NULL,
    "deleted_at"   timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vetmed_audit_log"
(
    "id"            uuid PRIMARY KEY         DEFAULT gen_random_uuid() NOT NULL,
    "user_id"       uuid                                               NOT NULL,
    "household_id"  uuid                                               NOT NULL,
    "action"        text                                               NOT NULL,
    "resource_type" text                                               NOT NULL,
    "resource_id"   uuid,
    "old_values"    jsonb,
    "new_values"    jsonb,
    "details"       jsonb,
    "ip_address"    text,
    "user_agent"    text,
    "session_id"    text,
    "timestamp"     timestamp with time zone DEFAULT now()             NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vetmed_notification_queue"
(
    "id"            uuid PRIMARY KEY         DEFAULT gen_random_uuid() NOT NULL,
    "user_id"       uuid                                               NOT NULL,
    "household_id"  uuid                                               NOT NULL,
    "type"          text                                               NOT NULL,
    "title"         text                                               NOT NULL,
    "body"          text                                               NOT NULL,
    "data"          jsonb,
    "scheduled_for" timestamp with time zone                           NOT NULL,
    "sent_at"       timestamp with time zone,
    "failed_at"     timestamp with time zone,
    "error"         text,
    "attempts"      integer                  DEFAULT 0                 NOT NULL,
    "read_at"       timestamp with time zone,
    "dismissed_at"  timestamp with time zone,
    "snoozed_until" timestamp with time zone,
    "created_at"    timestamp with time zone DEFAULT now()             NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vetmed_households"
(
    "id"         uuid PRIMARY KEY         DEFAULT gen_random_uuid()  NOT NULL,
    "name"       text                                                NOT NULL,
    "timezone"   text                     DEFAULT 'America/New_York' NOT NULL,
    "created_at" timestamp with time zone DEFAULT now()              NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now()              NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vetmed_memberships"
(
    "id"           uuid PRIMARY KEY         DEFAULT gen_random_uuid() NOT NULL,
    "user_id"      uuid                                               NOT NULL,
    "household_id" uuid                                               NOT NULL,
    "role"         "vetmed_role"            DEFAULT 'CAREGIVER'       NOT NULL,
    "created_at"   timestamp with time zone DEFAULT now()             NOT NULL,
    "updated_at"   timestamp with time zone DEFAULT now()             NOT NULL,
    CONSTRAINT "vetmed_memberships_user_id_household_id_unique" UNIQUE ("user_id", "household_id")
);
--> statement-breakpoint
CREATE TABLE "vetmed_inventory_items"
(
    "id"                 uuid PRIMARY KEY         DEFAULT gen_random_uuid() NOT NULL,
    "household_id"       uuid                                               NOT NULL,
    "medication_id"      uuid                                               NOT NULL,
    "assigned_animal_id" uuid,
    "brand_override"     text,
    "concentration"      text,
    "lot"                text,
    "expires_on"         date                                               NOT NULL,
    "storage"            "vetmed_storage"         DEFAULT 'ROOM'            NOT NULL,
    "quantity_units"     integer,
    "units_remaining"    integer,
    "unit_type"          text,
    "opened_on"          date,
    "in_use"             boolean                  DEFAULT false             NOT NULL,
    "barcode"            text,
    "purchase_date"      date,
    "purchase_price"     numeric(10, 2),
    "supplier"           text,
    "notes"              text,
    "created_at"         timestamp with time zone DEFAULT now()             NOT NULL,
    "updated_at"         timestamp with time zone DEFAULT now()             NOT NULL,
    "deleted_at"         timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vetmed_medication_catalog"
(
    "id"                   uuid PRIMARY KEY         DEFAULT gen_random_uuid() NOT NULL,
    "generic_name"         text                                               NOT NULL,
    "brand_name"           text,
    "strength"             text,
    "route"                "vetmed_route"                                     NOT NULL,
    "form"                 "vetmed_form"                                      NOT NULL,
    "controlled_substance" boolean                  DEFAULT false             NOT NULL,
    "common_dosing"        text,
    "warnings"             text,
    "created_at"           timestamp with time zone DEFAULT now()             NOT NULL,
    "updated_at"           timestamp with time zone DEFAULT now()             NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vetmed_administrations"
(
    "id"                        uuid PRIMARY KEY         DEFAULT gen_random_uuid() NOT NULL,
    "regimen_id"                uuid                                               NOT NULL,
    "animal_id"                 uuid                                               NOT NULL,
    "household_id"              uuid                                               NOT NULL,
    "caregiver_id"              uuid                                               NOT NULL,
    "scheduled_for"             timestamp with time zone,
    "recorded_at"               timestamp with time zone                           NOT NULL,
    "status"                    "vetmed_admin_status"                              NOT NULL,
    "source_item_id"            uuid,
    "site"                      text,
    "dose"                      text,
    "notes"                     text,
    "media_urls"                text[],
    "co_sign_user_id"           uuid,
    "co_signed_at"              timestamp with time zone,
    "co_sign_notes"             text,
    "adverse_event"             boolean                  DEFAULT false             NOT NULL,
    "adverse_event_description" text,
    "idempotency_key"           text                                               NOT NULL,
    "created_at"                timestamp with time zone DEFAULT now()             NOT NULL,
    "updated_at"                timestamp with time zone DEFAULT now()             NOT NULL,
    CONSTRAINT "vetmed_administrations_idempotency_key_unique" UNIQUE ("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "vetmed_regimens"
(
    "id"               uuid PRIMARY KEY         DEFAULT gen_random_uuid() NOT NULL,
    "animal_id"        uuid                                               NOT NULL,
    "medication_id"    uuid                                               NOT NULL,
    "name"             text,
    "instructions"     text,
    "schedule_type"    "vetmed_schedule_type"                             NOT NULL,
    "times_local"      time[],
    "interval_hours"   integer,
    "start_date"       date                                               NOT NULL,
    "end_date"         date,
    "prn_reason"       text,
    "max_daily_doses"  integer,
    "cutoff_minutes"   integer                  DEFAULT 240               NOT NULL,
    "high_risk"        boolean                  DEFAULT false             NOT NULL,
    "requires_co_sign" boolean                  DEFAULT false             NOT NULL,
    "active"           boolean                  DEFAULT true              NOT NULL,
    "paused_at"        timestamp with time zone,
    "pause_reason"     text,
    "dose"             text,
    "route"            text,
    "created_at"       timestamp with time zone DEFAULT now()             NOT NULL,
    "updated_at"       timestamp with time zone DEFAULT now()             NOT NULL,
    "deleted_at"       timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vetmed_users"
(
    "id"                         uuid PRIMARY KEY         DEFAULT gen_random_uuid() NOT NULL,
    "clerk_user_id"              text,
    "email"                      text                                               NOT NULL,
    "name"                       text,
    "image"                      text,
    "email_verified"             timestamp with time zone,
    "preferred_timezone"         text                     DEFAULT 'America/New_York',
    "preferred_phone_number"     text,
    "use_24_hour_time"           boolean                  DEFAULT false,
    "temperature_unit"           "temperature_unit"       DEFAULT 'fahrenheit',
    "weight_unit"                "weight_unit"            DEFAULT 'lbs',
    "email_reminders"            boolean                  DEFAULT true,
    "sms_reminders"              boolean                  DEFAULT false,
    "push_notifications"         boolean                  DEFAULT true,
    "reminder_lead_time_minutes" text                     DEFAULT '15',
    "emergency_contact_name"     text,
    "emergency_contact_phone"    text,
    "onboarding_complete"        boolean                  DEFAULT false,
    "onboarding_completed_at"    timestamp with time zone,
    "preferences_backup"         jsonb,
    "created_at"                 timestamp with time zone DEFAULT now()             NOT NULL,
    "updated_at"                 timestamp with time zone DEFAULT now()             NOT NULL,
    CONSTRAINT "vetmed_users_clerk_user_id_unique" UNIQUE ("clerk_user_id"),
    CONSTRAINT "vetmed_users_email_unique" UNIQUE ("email")
);
--> statement-breakpoint
ALTER TABLE "vetmed_animals"
    ADD CONSTRAINT "vetmed_animals_household_id_vetmed_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."vetmed_households" ("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_audit_log"
    ADD CONSTRAINT "vetmed_audit_log_user_id_vetmed_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."vetmed_users" ("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_audit_log"
    ADD CONSTRAINT "vetmed_audit_log_household_id_vetmed_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."vetmed_households" ("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_notification_queue"
    ADD CONSTRAINT "vetmed_notification_queue_user_id_vetmed_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."vetmed_users" ("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_notification_queue"
    ADD CONSTRAINT "vetmed_notification_queue_household_id_vetmed_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."vetmed_households" ("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_memberships"
    ADD CONSTRAINT "vetmed_memberships_user_id_vetmed_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."vetmed_users" ("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_memberships"
    ADD CONSTRAINT "vetmed_memberships_household_id_vetmed_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."vetmed_households" ("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_inventory_items"
    ADD CONSTRAINT "vetmed_inventory_items_household_id_vetmed_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."vetmed_households" ("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_inventory_items"
    ADD CONSTRAINT "vetmed_inventory_items_medication_id_vetmed_medication_catalog_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."vetmed_medication_catalog" ("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_inventory_items"
    ADD CONSTRAINT "vetmed_inventory_items_assigned_animal_id_vetmed_animals_id_fk" FOREIGN KEY ("assigned_animal_id") REFERENCES "public"."vetmed_animals" ("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_administrations"
    ADD CONSTRAINT "vetmed_administrations_regimen_id_vetmed_regimens_id_fk" FOREIGN KEY ("regimen_id") REFERENCES "public"."vetmed_regimens" ("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_administrations"
    ADD CONSTRAINT "vetmed_administrations_animal_id_vetmed_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."vetmed_animals" ("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_administrations"
    ADD CONSTRAINT "vetmed_administrations_household_id_vetmed_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."vetmed_households" ("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_administrations"
    ADD CONSTRAINT "vetmed_administrations_caregiver_id_vetmed_users_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."vetmed_users" ("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_administrations"
    ADD CONSTRAINT "vetmed_administrations_source_item_id_vetmed_inventory_items_id_fk" FOREIGN KEY ("source_item_id") REFERENCES "public"."vetmed_inventory_items" ("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_administrations"
    ADD CONSTRAINT "vetmed_administrations_co_sign_user_id_vetmed_users_id_fk" FOREIGN KEY ("co_sign_user_id") REFERENCES "public"."vetmed_users" ("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_regimens"
    ADD CONSTRAINT "vetmed_regimens_animal_id_vetmed_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."vetmed_animals" ("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_regimens"
    ADD CONSTRAINT "vetmed_regimens_medication_id_vetmed_medication_catalog_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."vetmed_medication_catalog" ("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "animal_household_id_idx" ON "vetmed_animals" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "animal_deleted_at_idx" ON "vetmed_animals" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "audit_user_id_idx" ON "vetmed_audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_household_id_idx" ON "vetmed_audit_log" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "audit_timestamp_idx" ON "vetmed_audit_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "audit_resource_idx" ON "vetmed_audit_log" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "notification_scheduled_for_idx" ON "vetmed_notification_queue" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "notification_sent_at_idx" ON "vetmed_notification_queue" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "notification_user_id_idx" ON "vetmed_notification_queue" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "membership_user_id_idx" ON "vetmed_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "membership_household_id_idx" ON "vetmed_memberships" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "inventory_household_id_idx" ON "vetmed_inventory_items" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "inventory_animal_id_idx" ON "vetmed_inventory_items" USING btree ("assigned_animal_id");--> statement-breakpoint
CREATE INDEX "inventory_expires_on_idx" ON "vetmed_inventory_items" USING btree ("expires_on");--> statement-breakpoint
CREATE INDEX "inventory_in_use_idx" ON "vetmed_inventory_items" USING btree ("in_use");--> statement-breakpoint
CREATE INDEX "inventory_deleted_at_idx" ON "vetmed_inventory_items" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "med_catalog_generic_name_idx" ON "vetmed_medication_catalog" USING btree ("generic_name");--> statement-breakpoint
CREATE INDEX "med_catalog_brand_name_idx" ON "vetmed_medication_catalog" USING btree ("brand_name");--> statement-breakpoint
CREATE INDEX "admin_regimen_id_idx" ON "vetmed_administrations" USING btree ("regimen_id");--> statement-breakpoint
CREATE INDEX "admin_animal_id_idx" ON "vetmed_administrations" USING btree ("animal_id");--> statement-breakpoint
CREATE INDEX "admin_household_id_idx" ON "vetmed_administrations" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "admin_scheduled_for_idx" ON "vetmed_administrations" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "admin_recorded_at_idx" ON "vetmed_administrations" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "admin_status_idx" ON "vetmed_administrations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "admin_idempotency_key_idx" ON "vetmed_administrations" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "regimen_animal_id_idx" ON "vetmed_regimens" USING btree ("animal_id");--> statement-breakpoint
CREATE INDEX "regimen_active_idx" ON "vetmed_regimens" USING btree ("active");--> statement-breakpoint
CREATE INDEX "regimen_start_date_idx" ON "vetmed_regimens" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "regimen_deleted_at_idx" ON "vetmed_regimens" USING btree ("deleted_at");