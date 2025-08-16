ALTER TABLE "vetmed_inventory_items" DROP CONSTRAINT "vetmed_inventory_items_medication_id_vetmed_medication_catalog_id_fk";
--> statement-breakpoint
ALTER TABLE "vetmed_administrations" DROP CONSTRAINT "vetmed_administrations_source_item_id_vetmed_inventory_items_id_fk";
--> statement-breakpoint
DROP INDEX "animal_household_id_idx";--> statement-breakpoint
DROP INDEX "animal_deleted_at_idx";--> statement-breakpoint
DROP INDEX "audit_user_id_idx";--> statement-breakpoint
DROP INDEX "audit_household_id_idx";--> statement-breakpoint
DROP INDEX "audit_timestamp_idx";--> statement-breakpoint
DROP INDEX "audit_resource_idx";--> statement-breakpoint
DROP INDEX "notification_scheduled_for_idx";--> statement-breakpoint
DROP INDEX "notification_sent_at_idx";--> statement-breakpoint
DROP INDEX "notification_user_id_idx";--> statement-breakpoint
DROP INDEX "membership_user_id_idx";--> statement-breakpoint
DROP INDEX "membership_household_id_idx";--> statement-breakpoint
DROP INDEX "inventory_household_id_idx";--> statement-breakpoint
DROP INDEX "inventory_animal_id_idx";--> statement-breakpoint
DROP INDEX "inventory_expires_on_idx";--> statement-breakpoint
DROP INDEX "inventory_in_use_idx";--> statement-breakpoint
DROP INDEX "inventory_deleted_at_idx";--> statement-breakpoint
DROP INDEX "med_catalog_generic_name_idx";--> statement-breakpoint
DROP INDEX "med_catalog_brand_name_idx";--> statement-breakpoint
DROP INDEX "admin_regimen_id_idx";--> statement-breakpoint
DROP INDEX "admin_animal_id_idx";--> statement-breakpoint
DROP INDEX "admin_household_id_idx";--> statement-breakpoint
DROP INDEX "admin_scheduled_for_idx";--> statement-breakpoint
DROP INDEX "admin_recorded_at_idx";--> statement-breakpoint
DROP INDEX "admin_status_idx";--> statement-breakpoint
DROP INDEX "admin_idempotency_key_idx";--> statement-breakpoint
DROP INDEX "regimen_animal_id_idx";--> statement-breakpoint
DROP INDEX "regimen_active_idx";--> statement-breakpoint
DROP INDEX "regimen_start_date_idx";--> statement-breakpoint
DROP INDEX "regimen_deleted_at_idx";--> statement-breakpoint
ALTER TABLE "vetmed_inventory_items"
    ADD CONSTRAINT "vetmed_inventory_items_medication_id_vetmed_medication_catalog_" FOREIGN KEY ("medication_id") REFERENCES "public"."vetmed_medication_catalog" ("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_administrations"
    ADD CONSTRAINT "vetmed_administrations_source_item_id_vetmed_inventory_items_id" FOREIGN KEY ("source_item_id") REFERENCES "public"."vetmed_inventory_items" ("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "animal_household_id_idx" ON "vetmed_animals" USING btree ("household_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "animal_deleted_at_idx" ON "vetmed_animals" USING btree ("deleted_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "audit_user_id_idx" ON "vetmed_audit_log" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "audit_household_id_idx" ON "vetmed_audit_log" USING btree ("household_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "audit_timestamp_idx" ON "vetmed_audit_log" USING btree ("timestamp" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "audit_resource_idx" ON "vetmed_audit_log" USING btree ("resource_type" text_ops,"resource_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "notification_scheduled_for_idx" ON "vetmed_notification_queue" USING btree ("scheduled_for" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "notification_sent_at_idx" ON "vetmed_notification_queue" USING btree ("sent_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "notification_user_id_idx" ON "vetmed_notification_queue" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "membership_user_id_idx" ON "vetmed_memberships" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "membership_household_id_idx" ON "vetmed_memberships" USING btree ("household_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "inventory_household_id_idx" ON "vetmed_inventory_items" USING btree ("household_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "inventory_animal_id_idx" ON "vetmed_inventory_items" USING btree ("assigned_animal_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "inventory_expires_on_idx" ON "vetmed_inventory_items" USING btree ("expires_on" date_ops);--> statement-breakpoint
CREATE INDEX "inventory_in_use_idx" ON "vetmed_inventory_items" USING btree ("in_use" bool_ops);--> statement-breakpoint
CREATE INDEX "inventory_deleted_at_idx" ON "vetmed_inventory_items" USING btree ("deleted_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "med_catalog_generic_name_idx" ON "vetmed_medication_catalog" USING btree ("generic_name" text_ops);--> statement-breakpoint
CREATE INDEX "med_catalog_brand_name_idx" ON "vetmed_medication_catalog" USING btree ("brand_name" text_ops);--> statement-breakpoint
CREATE INDEX "admin_regimen_id_idx" ON "vetmed_administrations" USING btree ("regimen_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "admin_animal_id_idx" ON "vetmed_administrations" USING btree ("animal_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "admin_household_id_idx" ON "vetmed_administrations" USING btree ("household_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "admin_scheduled_for_idx" ON "vetmed_administrations" USING btree ("scheduled_for" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "admin_recorded_at_idx" ON "vetmed_administrations" USING btree ("recorded_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "admin_status_idx" ON "vetmed_administrations" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "admin_idempotency_key_idx" ON "vetmed_administrations" USING btree ("idempotency_key" text_ops);--> statement-breakpoint
CREATE INDEX "regimen_animal_id_idx" ON "vetmed_regimens" USING btree ("animal_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "regimen_active_idx" ON "vetmed_regimens" USING btree ("active" bool_ops);--> statement-breakpoint
CREATE INDEX "regimen_start_date_idx" ON "vetmed_regimens" USING btree ("start_date" date_ops);--> statement-breakpoint
CREATE INDEX "regimen_deleted_at_idx" ON "vetmed_regimens" USING btree ("deleted_at" timestamptz_ops);