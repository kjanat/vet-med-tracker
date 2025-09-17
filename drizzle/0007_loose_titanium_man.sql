CREATE TYPE "public"."vetmed_cosign_status" AS ENUM('pending', 'approved', 'rejected', 'expired');--> statement-breakpoint
CREATE TABLE "vetmed_cosign_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"administration_id" uuid NOT NULL,
	"requester_id" uuid NOT NULL,
	"cosigner_id" uuid NOT NULL,
	"household_id" uuid NOT NULL,
	"status" "vetmed_cosign_status" DEFAULT 'pending' NOT NULL,
	"signature" text,
	"rejection_reason" text,
	"signed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vetmed_cosign_requests_administration_id_unique" UNIQUE("administration_id")
);
--> statement-breakpoint
CREATE TABLE "vetmed_push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh_key" text NOT NULL,
	"auth_key" text NOT NULL,
	"user_agent" text,
	"device_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vetmed_push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
ALTER TABLE "vetmed_users" RENAME COLUMN "clerk_user_id" TO "stack_user_id";--> statement-breakpoint
ALTER TABLE "vetmed_users" DROP CONSTRAINT "vetmed_users_clerk_user_id_unique";--> statement-breakpoint
ALTER TABLE "vetmed_inventory_items" DROP CONSTRAINT "vetmed_inventory_items_medication_id_vetmed_medication_catalog_";
--> statement-breakpoint
ALTER TABLE "vetmed_regimens" DROP CONSTRAINT "vetmed_regimens_medication_id_vetmed_medication_catalog_id_fk";
--> statement-breakpoint
ALTER TABLE "vetmed_inventory_items" ALTER COLUMN "medication_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "vetmed_regimens" ALTER COLUMN "medication_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "vetmed_inventory_items" ADD COLUMN "medication_name" text;--> statement-breakpoint
ALTER TABLE "vetmed_inventory_items" ADD COLUMN "is_custom_medication" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vetmed_medication_catalog" ADD COLUMN "dosage_min_mg_kg" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "vetmed_medication_catalog" ADD COLUMN "dosage_max_mg_kg" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "vetmed_medication_catalog" ADD COLUMN "dosage_typical_mg_kg" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "vetmed_medication_catalog" ADD COLUMN "max_daily_dose_mg" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "vetmed_medication_catalog" ADD COLUMN "species_adjustments" jsonb;--> statement-breakpoint
ALTER TABLE "vetmed_medication_catalog" ADD COLUMN "route_adjustments" jsonb;--> statement-breakpoint
ALTER TABLE "vetmed_medication_catalog" ADD COLUMN "contraindications" text[];--> statement-breakpoint
ALTER TABLE "vetmed_medication_catalog" ADD COLUMN "age_adjustments" jsonb;--> statement-breakpoint
ALTER TABLE "vetmed_medication_catalog" ADD COLUMN "breed_considerations" jsonb;--> statement-breakpoint
ALTER TABLE "vetmed_medication_catalog" ADD COLUMN "concentration_mg_ml" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "vetmed_medication_catalog" ADD COLUMN "units_per_tablet" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "vetmed_medication_catalog" ADD COLUMN "unit_type" text DEFAULT 'mg';--> statement-breakpoint
ALTER TABLE "vetmed_medication_catalog" ADD COLUMN "typical_frequency_hours" integer;--> statement-breakpoint
ALTER TABLE "vetmed_medication_catalog" ADD COLUMN "max_frequency_per_day" integer;--> statement-breakpoint
ALTER TABLE "vetmed_regimens" ADD COLUMN "medication_name" text;--> statement-breakpoint
ALTER TABLE "vetmed_regimens" ADD COLUMN "is_custom_medication" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vetmed_users" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "vetmed_users" ADD COLUMN "pronouns" text;--> statement-breakpoint
ALTER TABLE "vetmed_users" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "vetmed_users" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "vetmed_users" ADD COLUMN "social_links" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "vetmed_users" ADD COLUMN "profile_data" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "vetmed_users" ADD COLUMN "profile_visibility" jsonb DEFAULT '{"name": true, "email": false, "bio": true, "location": true}'::jsonb;--> statement-breakpoint
ALTER TABLE "vetmed_users" ADD COLUMN "profile_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "vetmed_cosign_requests" ADD CONSTRAINT "vetmed_cosign_requests_administration_id_vetmed_administrations_id_fk" FOREIGN KEY ("administration_id") REFERENCES "public"."vetmed_administrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_cosign_requests" ADD CONSTRAINT "vetmed_cosign_requests_requester_id_vetmed_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."vetmed_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_cosign_requests" ADD CONSTRAINT "vetmed_cosign_requests_cosigner_id_vetmed_users_id_fk" FOREIGN KEY ("cosigner_id") REFERENCES "public"."vetmed_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_cosign_requests" ADD CONSTRAINT "vetmed_cosign_requests_household_id_vetmed_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."vetmed_households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_push_subscriptions" ADD CONSTRAINT "vetmed_push_subscriptions_user_id_vetmed_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."vetmed_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cosign_requests_administration_id_idx" ON "vetmed_cosign_requests" USING btree ("administration_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "cosign_requests_requester_id_idx" ON "vetmed_cosign_requests" USING btree ("requester_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "cosign_requests_cosigner_id_idx" ON "vetmed_cosign_requests" USING btree ("cosigner_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "cosign_requests_household_id_idx" ON "vetmed_cosign_requests" USING btree ("household_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "cosign_requests_status_idx" ON "vetmed_cosign_requests" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "cosign_requests_expires_at_idx" ON "vetmed_cosign_requests" USING btree ("expires_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "push_subscription_user_idx" ON "vetmed_push_subscriptions" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "push_subscription_endpoint_idx" ON "vetmed_push_subscriptions" USING btree ("endpoint" text_ops);--> statement-breakpoint
CREATE INDEX "push_subscription_active_idx" ON "vetmed_push_subscriptions" USING btree ("is_active" bool_ops);--> statement-breakpoint
ALTER TABLE "vetmed_inventory_items" ADD CONSTRAINT "vetmed_inventory_items_medication_id_vetmed_medication_catalog_" FOREIGN KEY ("medication_id") REFERENCES "public"."vetmed_medication_catalog"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_regimens" ADD CONSTRAINT "vetmed_regimens_medication_id_vetmed_medication_catalog_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."vetmed_medication_catalog"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "med_catalog_dosage_range_idx" ON "vetmed_medication_catalog" USING btree ("dosage_min_mg_kg" numeric_ops,"dosage_max_mg_kg" numeric_ops);--> statement-breakpoint
ALTER TABLE "vetmed_users" ADD CONSTRAINT "vetmed_users_stack_user_id_unique" UNIQUE("stack_user_id");