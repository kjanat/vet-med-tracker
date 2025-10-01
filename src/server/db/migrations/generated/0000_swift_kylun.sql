CREATE TYPE "public"."action_type" AS ENUM('CREATE', 'READ', 'UPDATE', 'DELETE', 'BULK_CREATE', 'BULK_UPDATE', 'BULK_DELETE', 'AUTHENTICATE', 'AUTHORIZE', 'IMPORT', 'EXPORT');--> statement-breakpoint
CREATE TYPE "public"."resource_type" AS ENUM('USER', 'HOUSEHOLD', 'ANIMAL', 'MEDICATION', 'REGIMEN', 'ADMINISTRATION', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."severity_level" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."vetmed_admin_status" AS ENUM('ON_TIME', 'LATE', 'VERY_LATE', 'MISSED', 'PRN');--> statement-breakpoint
CREATE TYPE "public"."vetmed_cosign_status" AS ENUM('pending', 'approved', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."vetmed_form" AS ENUM('TABLET', 'CAPSULE', 'LIQUID', 'INJECTION', 'CREAM', 'OINTMENT', 'DROPS', 'SPRAY', 'POWDER', 'PATCH', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."vetmed_role" AS ENUM('OWNER', 'CAREGIVER', 'VETREADONLY');--> statement-breakpoint
CREATE TYPE "public"."vetmed_route" AS ENUM('ORAL', 'SC', 'IM', 'IV', 'TOPICAL', 'OTIC', 'OPHTHALMIC', 'INHALED', 'RECTAL', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."vetmed_schedule_type" AS ENUM('FIXED', 'PRN', 'INTERVAL', 'TAPER');--> statement-breakpoint
CREATE TYPE "public"."vetmed_storage" AS ENUM('ROOM', 'FRIDGE', 'FREEZER', 'CONTROLLED');--> statement-breakpoint
CREATE TYPE "public"."temperature_unit" AS ENUM('celsius', 'fahrenheit');--> statement-breakpoint
CREATE TYPE "public"."vetmed_suggestion_status" AS ENUM('pending', 'applied', 'reverted', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."weight_unit" AS ENUM('kg', 'lbs');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"action" "action_type" NOT NULL,
	"client_ip" text,
	"cpu_usage" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"data_classification" text,
	"duration" integer,
	"endpoint" text,
	"error_message" text,
	"hipaa_logged" boolean DEFAULT false,
	"household_id" uuid,
	"http_method" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"memory_usage" integer,
	"metadata" jsonb,
	"resource_id" uuid,
	"resource_type" "resource_type" NOT NULL,
	"session_id" text,
	"stack_user_id" text,
	"success" boolean NOT NULL,
	"user_agent" text,
	"user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "data_access_logs" (
	"access_type" text NOT NULL,
	"animal_id" uuid,
	"authorized" boolean DEFAULT true NOT NULL,
	"client_ip" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"data_type" text NOT NULL,
	"fields_accessed" jsonb,
	"household_id" uuid,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metadata" jsonb,
	"purpose" text,
	"referrer" text,
	"resource_id" uuid,
	"session_id" text,
	"user_agent" text,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_metrics" (
	"cache_hits" integer,
	"cache_misses" integer,
	"client_ip" text,
	"cpu_usage" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"db_query_count" integer,
	"db_query_duration" integer,
	"duration" integer NOT NULL,
	"endpoint" text NOT NULL,
	"error_type" text,
	"http_method" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"memory_usage" integer,
	"metadata" jsonb,
	"success" boolean NOT NULL,
	"user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "rate_limit_events" (
	"block_duration" integer,
	"blocked" boolean DEFAULT false,
	"block_until" timestamp with time zone,
	"client_ip" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"endpoint" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_private_ip" boolean DEFAULT false,
	"limit_key" text NOT NULL,
	"limit_threshold" integer NOT NULL,
	"limit_type" text NOT NULL,
	"metadata" jsonb,
	"request_count" integer NOT NULL,
	"user_agent" text,
	"user_id" uuid,
	"window_duration" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"alert_sent" boolean DEFAULT false,
	"alert_sent_at" timestamp with time zone,
	"audit_log_id" uuid,
	"client_ip" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text,
	"event_type" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metadata" jsonb,
	"resolution_notes" text,
	"resolved" boolean DEFAULT false,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"session_id" text,
	"severity" "severity_level" NOT NULL,
	"user_agent" text,
	"user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "vetmed_administrations" (
	"adverse_event" boolean DEFAULT false NOT NULL,
	"adverse_event_description" text,
	"animal_id" uuid NOT NULL,
	"caregiver_id" uuid NOT NULL,
	"co_signed_at" timestamp with time zone,
	"co_sign_notes" text,
	"co_sign_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dose" text,
	"household_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" text NOT NULL,
	"media_urls" text[],
	"notes" text,
	"recorded_at" timestamp with time zone NOT NULL,
	"regimen_id" uuid NOT NULL,
	"scheduled_for" timestamp with time zone,
	"site" text,
	"source_item_id" uuid,
	"status" "vetmed_admin_status" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vetmed_administrations_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "vetmed_animals" (
	"allergies" text[],
	"breed" text,
	"clinic_name" text,
	"color" text,
	"conditions" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"dob" date,
	"household_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"microchip_id" text,
	"name" text NOT NULL,
	"neutered" boolean DEFAULT false NOT NULL,
	"notes" text,
	"photo_url" text,
	"sex" text,
	"species" text NOT NULL,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"vet_email" text,
	"vet_name" text,
	"vet_phone" text,
	"weight_kg" numeric(5, 2)
);
--> statement-breakpoint
CREATE TABLE "vetmed_audit_log" (
	"action" text NOT NULL,
	"details" jsonb,
	"household_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_address" text,
	"new_values" jsonb,
	"old_values" jsonb,
	"resource_id" uuid,
	"resource_type" text NOT NULL,
	"session_id" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vetmed_cosign_requests" (
	"administration_id" uuid NOT NULL,
	"cosigner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"household_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rejection_reason" text,
	"requester_id" uuid NOT NULL,
	"signature" text,
	"signed_at" timestamp with time zone,
	"status" "vetmed_cosign_status" DEFAULT 'pending' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vetmed_cosign_requests_administration_id_unique" UNIQUE("administration_id")
);
--> statement-breakpoint
CREATE TABLE "vetmed_households" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vetmed_inventory_items" (
	"assigned_animal_id" uuid,
	"barcode" text,
	"brand_override" text,
	"concentration" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"expires_on" timestamp with time zone NOT NULL,
	"household_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"in_use" boolean DEFAULT false NOT NULL,
	"is_custom_medication" boolean DEFAULT false NOT NULL,
	"lot" text,
	"medication_id" uuid,
	"medication_name" text,
	"notes" text,
	"opened_on" timestamp with time zone,
	"purchase_date" timestamp with time zone,
	"purchase_price" numeric(10, 2),
	"quantity_units" integer,
	"storage" "vetmed_storage" DEFAULT 'ROOM' NOT NULL,
	"supplier" text,
	"units_remaining" integer,
	"unit_type" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vetmed_medication_catalog" (
	"age_adjustments" jsonb,
	"brand_name" text,
	"breed_considerations" jsonb,
	"common_dosing" text,
	"concentration_mg_ml" numeric(10, 4),
	"contraindications" text[],
	"controlled_substance" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dosage_max_mg_kg" numeric(10, 4),
	"dosage_min_mg_kg" numeric(10, 4),
	"dosage_typical_mg_kg" numeric(10, 4),
	"form" "vetmed_form" NOT NULL,
	"generic_name" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"max_daily_dose_mg" numeric(10, 2),
	"max_frequency_per_day" integer,
	"route" "vetmed_route" NOT NULL,
	"route_adjustments" jsonb,
	"species_adjustments" jsonb,
	"strength" text,
	"typical_frequency_hours" integer,
	"units_per_tablet" numeric(10, 4),
	"unit_type" text DEFAULT 'mg',
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"warnings" text
);
--> statement-breakpoint
CREATE TABLE "vetmed_memberships" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"household_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "vetmed_role" DEFAULT 'CAREGIVER' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "vetmed_memberships_user_id_household_id_unique" UNIQUE("user_id","household_id")
);
--> statement-breakpoint
CREATE TABLE "vetmed_notification_queue" (
	"attempts" integer DEFAULT 0 NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"data" jsonb,
	"dismissed_at" timestamp with time zone,
	"error" text,
	"failed_at" timestamp with time zone,
	"household_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"read_at" timestamp with time zone,
	"scheduled_for" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"snoozed_until" timestamp with time zone,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vetmed_notifications" (
	"action_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"data" jsonb,
	"dismissed" boolean DEFAULT false NOT NULL,
	"dismissed_at" timestamp with time zone,
	"household_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vetmed_push_subscriptions" (
	"auth_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"device_name" text,
	"endpoint" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used" timestamp with time zone DEFAULT now() NOT NULL,
	"p256dh_key" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	CONSTRAINT "vetmed_push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "vetmed_regimens" (
	"active" boolean DEFAULT true NOT NULL,
	"animal_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cutoff_minutes" integer DEFAULT 240 NOT NULL,
	"deleted_at" timestamp with time zone,
	"dose" text,
	"end_date" timestamp with time zone,
	"high_risk" boolean DEFAULT false NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instructions" text,
	"interval_hours" integer,
	"is_custom_medication" boolean DEFAULT false NOT NULL,
	"max_daily_doses" integer,
	"medication_id" uuid,
	"medication_name" text,
	"name" text,
	"paused_at" timestamp with time zone,
	"pause_reason" text,
	"prn_reason" text,
	"requires_co_sign" boolean DEFAULT false NOT NULL,
	"route" text,
	"schedule_type" "vetmed_schedule_type" NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"times_local" time[],
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vetmed_suggestions" (
	"action" jsonb NOT NULL,
	"applied_at" timestamp with time zone,
	"applied_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dismissed_at" timestamp with time zone,
	"dismissed_by_user_id" uuid,
	"estimated_impact" text,
	"expires_at" timestamp with time zone,
	"household_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_values" jsonb,
	"priority" text DEFAULT 'medium' NOT NULL,
	"rationale" text NOT NULL,
	"reverted_at" timestamp with time zone,
	"reverted_by_user_id" uuid,
	"status" "vetmed_suggestion_status" DEFAULT 'pending' NOT NULL,
	"summary" text NOT NULL,
	"type" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vetmed_users" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"default_animal_id" uuid,
	"default_household_id" uuid,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"image" text,
	"name" text,
	"onboarding_complete" boolean DEFAULT false,
	"onboarding_completed_at" timestamp with time zone,
	"preferences" jsonb DEFAULT '{"defaultTimezone":"America/New_York","preferredPhoneNumber":null,"emergencyContactName":null,"emergencyContactPhone":null,"notificationPreferences":{"emailReminders":true,"smsReminders":false,"pushNotifications":true,"reminderLeadTime":15},"displayPreferences":{"temperatureUnit":"fahrenheit","weightUnit":"lbs","use24HourTime":false,"weekStartsOn":0,"theme":"system"},"defaultHouseholdId":null,"defaultAnimalId":null}'::jsonb NOT NULL,
	"profile" jsonb DEFAULT '{"firstName":null,"lastName":null,"bio":null,"pronouns":null,"location":null,"website":null,"socialLinks":{},"profileVisibility":{"name":true,"email":false,"bio":true,"location":true},"profileCompletedAt":null}'::jsonb NOT NULL,
	"stack_user_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vetmed_users_email_unique" UNIQUE("email"),
	CONSTRAINT "vetmed_users_stack_user_id_unique" UNIQUE("stack_user_id")
);
--> statement-breakpoint
ALTER TABLE "vetmed_administrations" ADD CONSTRAINT "vetmed_administrations_regimen_id_vetmed_regimens_id_fk" FOREIGN KEY ("regimen_id") REFERENCES "public"."vetmed_regimens"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_administrations" ADD CONSTRAINT "vetmed_administrations_animal_id_vetmed_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."vetmed_animals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_administrations" ADD CONSTRAINT "vetmed_administrations_household_id_vetmed_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."vetmed_households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_administrations" ADD CONSTRAINT "vetmed_administrations_caregiver_id_vetmed_users_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."vetmed_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_administrations" ADD CONSTRAINT "vetmed_administrations_co_sign_user_id_vetmed_users_id_fk" FOREIGN KEY ("co_sign_user_id") REFERENCES "public"."vetmed_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_administrations" ADD CONSTRAINT "vetmed_administrations_source_item_id_vetmed_inventory_items_id" FOREIGN KEY ("source_item_id") REFERENCES "public"."vetmed_inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_animals" ADD CONSTRAINT "vetmed_animals_household_id_vetmed_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."vetmed_households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_audit_log" ADD CONSTRAINT "vetmed_audit_log_user_id_vetmed_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."vetmed_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_audit_log" ADD CONSTRAINT "vetmed_audit_log_household_id_vetmed_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."vetmed_households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_cosign_requests" ADD CONSTRAINT "vetmed_cosign_requests_administration_id_vetmed_administrations_id_fk" FOREIGN KEY ("administration_id") REFERENCES "public"."vetmed_administrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_cosign_requests" ADD CONSTRAINT "vetmed_cosign_requests_requester_id_vetmed_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."vetmed_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_cosign_requests" ADD CONSTRAINT "vetmed_cosign_requests_cosigner_id_vetmed_users_id_fk" FOREIGN KEY ("cosigner_id") REFERENCES "public"."vetmed_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_cosign_requests" ADD CONSTRAINT "vetmed_cosign_requests_household_id_vetmed_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."vetmed_households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_inventory_items" ADD CONSTRAINT "vetmed_inventory_items_household_id_vetmed_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."vetmed_households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_inventory_items" ADD CONSTRAINT "vetmed_inventory_items_assigned_animal_id_vetmed_animals_id_fk" FOREIGN KEY ("assigned_animal_id") REFERENCES "public"."vetmed_animals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_inventory_items" ADD CONSTRAINT "vetmed_inventory_items_medication_id_vetmed_medication_catalog_" FOREIGN KEY ("medication_id") REFERENCES "public"."vetmed_medication_catalog"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_memberships" ADD CONSTRAINT "vetmed_memberships_user_id_vetmed_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."vetmed_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_memberships" ADD CONSTRAINT "vetmed_memberships_household_id_vetmed_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."vetmed_households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_notification_queue" ADD CONSTRAINT "vetmed_notification_queue_user_id_vetmed_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."vetmed_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_notification_queue" ADD CONSTRAINT "vetmed_notification_queue_household_id_vetmed_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."vetmed_households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_notifications" ADD CONSTRAINT "vetmed_notifications_user_id_vetmed_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."vetmed_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_notifications" ADD CONSTRAINT "vetmed_notifications_household_id_vetmed_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."vetmed_households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_push_subscriptions" ADD CONSTRAINT "vetmed_push_subscriptions_user_id_vetmed_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."vetmed_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_regimens" ADD CONSTRAINT "vetmed_regimens_animal_id_vetmed_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."vetmed_animals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_regimens" ADD CONSTRAINT "vetmed_regimens_medication_id_vetmed_medication_catalog_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."vetmed_medication_catalog"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_suggestions" ADD CONSTRAINT "vetmed_suggestions_household_id_vetmed_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."vetmed_households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_suggestions" ADD CONSTRAINT "vetmed_suggestions_applied_by_user_id_vetmed_users_id_fk" FOREIGN KEY ("applied_by_user_id") REFERENCES "public"."vetmed_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_suggestions" ADD CONSTRAINT "vetmed_suggestions_reverted_by_user_id_vetmed_users_id_fk" FOREIGN KEY ("reverted_by_user_id") REFERENCES "public"."vetmed_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_suggestions" ADD CONSTRAINT "vetmed_suggestions_dismissed_by_user_id_vetmed_users_id_fk" FOREIGN KEY ("dismissed_by_user_id") REFERENCES "public"."vetmed_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_users" ADD CONSTRAINT "vetmed_users_default_household_id_fk" FOREIGN KEY ("default_household_id") REFERENCES "public"."vetmed_households"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_users" ADD CONSTRAINT "vetmed_users_default_animal_id_fk" FOREIGN KEY ("default_animal_id") REFERENCES "public"."vetmed_animals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_hipaa_idx" ON "audit_logs" USING btree ("hipaa_logged","data_classification");--> statement-breakpoint
CREATE INDEX "audit_logs_household_id_idx" ON "audit_logs" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_action_idx" ON "audit_logs" USING btree ("resource_type","action");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_type_idx" ON "audit_logs" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX "audit_logs_success_idx" ON "audit_logs" USING btree ("success");--> statement-breakpoint
CREATE INDEX "audit_logs_time_range_idx" ON "audit_logs" USING btree ("created_at","success");--> statement-breakpoint
CREATE INDEX "audit_logs_user_action_idx" ON "audit_logs" USING btree ("user_id","action");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "data_access_logs_access_type_idx" ON "data_access_logs" USING btree ("access_type");--> statement-breakpoint
CREATE INDEX "data_access_logs_authorized_idx" ON "data_access_logs" USING btree ("authorized");--> statement-breakpoint
CREATE INDEX "data_access_logs_created_at_idx" ON "data_access_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "data_access_logs_data_type_idx" ON "data_access_logs" USING btree ("data_type");--> statement-breakpoint
CREATE INDEX "data_access_logs_household_id_idx" ON "data_access_logs" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "data_access_logs_user_id_idx" ON "data_access_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "performance_metrics_created_at_idx" ON "performance_metrics" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "performance_metrics_duration_idx" ON "performance_metrics" USING btree ("duration");--> statement-breakpoint
CREATE INDEX "performance_metrics_endpoint_idx" ON "performance_metrics" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "performance_metrics_slow_queries_idx" ON "performance_metrics" USING btree ("duration","success");--> statement-breakpoint
CREATE INDEX "performance_metrics_success_idx" ON "performance_metrics" USING btree ("success");--> statement-breakpoint
CREATE INDEX "rate_limit_events_blocked_idx" ON "rate_limit_events" USING btree ("blocked");--> statement-breakpoint
CREATE INDEX "rate_limit_events_client_ip_idx" ON "rate_limit_events" USING btree ("client_ip");--> statement-breakpoint
CREATE INDEX "rate_limit_events_created_at_idx" ON "rate_limit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "rate_limit_events_endpoint_idx" ON "rate_limit_events" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "rate_limit_events_limit_key_idx" ON "rate_limit_events" USING btree ("limit_key");--> statement-breakpoint
CREATE INDEX "rate_limit_events_limit_type_idx" ON "rate_limit_events" USING btree ("limit_type");--> statement-breakpoint
CREATE INDEX "security_events_alert_idx" ON "security_events" USING btree ("alert_sent","severity");--> statement-breakpoint
CREATE INDEX "security_events_client_ip_idx" ON "security_events" USING btree ("client_ip");--> statement-breakpoint
CREATE INDEX "security_events_created_at_idx" ON "security_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "security_events_event_type_idx" ON "security_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "security_events_resolved_idx" ON "security_events" USING btree ("resolved");--> statement-breakpoint
CREATE INDEX "security_events_severity_idx" ON "security_events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "admin_animal_id_idx" ON "vetmed_administrations" USING btree ("animal_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "admin_household_id_idx" ON "vetmed_administrations" USING btree ("household_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "admin_idempotency_key_idx" ON "vetmed_administrations" USING btree ("idempotency_key" text_ops);--> statement-breakpoint
CREATE INDEX "admin_recorded_at_idx" ON "vetmed_administrations" USING btree ("recorded_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "admin_regimen_id_idx" ON "vetmed_administrations" USING btree ("regimen_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "admin_scheduled_for_idx" ON "vetmed_administrations" USING btree ("scheduled_for" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "admin_status_idx" ON "vetmed_administrations" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "animal_deleted_at_idx" ON "vetmed_animals" USING btree ("deleted_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "animal_household_id_idx" ON "vetmed_animals" USING btree ("household_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "audit_household_id_idx" ON "vetmed_audit_log" USING btree ("household_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "audit_resource_idx" ON "vetmed_audit_log" USING btree ("resource_type" text_ops,"resource_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "audit_timestamp_idx" ON "vetmed_audit_log" USING btree ("timestamp" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "audit_user_id_idx" ON "vetmed_audit_log" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "cosign_requests_administration_id_idx" ON "vetmed_cosign_requests" USING btree ("administration_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "cosign_requests_requester_id_idx" ON "vetmed_cosign_requests" USING btree ("requester_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "cosign_requests_cosigner_id_idx" ON "vetmed_cosign_requests" USING btree ("cosigner_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "cosign_requests_household_id_idx" ON "vetmed_cosign_requests" USING btree ("household_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "cosign_requests_status_idx" ON "vetmed_cosign_requests" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "cosign_requests_expires_at_idx" ON "vetmed_cosign_requests" USING btree ("expires_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "inventory_animal_id_idx" ON "vetmed_inventory_items" USING btree ("assigned_animal_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "inventory_deleted_at_idx" ON "vetmed_inventory_items" USING btree ("deleted_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "inventory_expires_on_idx" ON "vetmed_inventory_items" USING btree ("expires_on" date_ops);--> statement-breakpoint
CREATE INDEX "inventory_household_id_idx" ON "vetmed_inventory_items" USING btree ("household_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "inventory_in_use_idx" ON "vetmed_inventory_items" USING btree ("in_use" bool_ops);--> statement-breakpoint
CREATE INDEX "med_catalog_brand_name_idx" ON "vetmed_medication_catalog" USING btree ("brand_name" text_ops);--> statement-breakpoint
CREATE INDEX "med_catalog_generic_name_idx" ON "vetmed_medication_catalog" USING btree ("generic_name" text_ops);--> statement-breakpoint
CREATE INDEX "med_catalog_dosage_range_idx" ON "vetmed_medication_catalog" USING btree ("dosage_min_mg_kg" numeric_ops,"dosage_max_mg_kg" numeric_ops);--> statement-breakpoint
CREATE INDEX "membership_household_id_idx" ON "vetmed_memberships" USING btree ("household_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "membership_user_id_idx" ON "vetmed_memberships" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "notification_scheduled_for_idx" ON "vetmed_notification_queue" USING btree ("scheduled_for" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "notification_sent_at_idx" ON "vetmed_notification_queue" USING btree ("sent_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "notification_user_id_idx" ON "vetmed_notification_queue" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "notification_user_read_idx" ON "vetmed_notifications" USING btree ("user_id" uuid_ops,"read" bool_ops);--> statement-breakpoint
CREATE INDEX "notification_household_idx" ON "vetmed_notifications" USING btree ("household_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "notification_created_at_idx" ON "vetmed_notifications" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "notification_type_idx" ON "vetmed_notifications" USING btree ("type" text_ops);--> statement-breakpoint
CREATE INDEX "push_subscription_user_idx" ON "vetmed_push_subscriptions" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "push_subscription_endpoint_idx" ON "vetmed_push_subscriptions" USING btree ("endpoint" text_ops);--> statement-breakpoint
CREATE INDEX "push_subscription_active_idx" ON "vetmed_push_subscriptions" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "regimen_active_idx" ON "vetmed_regimens" USING btree ("active" bool_ops);--> statement-breakpoint
CREATE INDEX "regimen_animal_id_idx" ON "vetmed_regimens" USING btree ("animal_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "regimen_deleted_at_idx" ON "vetmed_regimens" USING btree ("deleted_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "regimen_start_date_idx" ON "vetmed_regimens" USING btree ("start_date" date_ops);--> statement-breakpoint
CREATE INDEX "suggestions_household_id_idx" ON "vetmed_suggestions" USING btree ("household_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "suggestions_status_idx" ON "vetmed_suggestions" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "suggestions_type_idx" ON "vetmed_suggestions" USING btree ("type" text_ops);--> statement-breakpoint
CREATE INDEX "suggestions_created_at_idx" ON "vetmed_suggestions" USING btree ("created_at" timestamptz_ops);