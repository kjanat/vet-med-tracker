-- Custom SQL migration file for hybrid medication catalog approach
-- Phase 2: Medication Catalog Hybrid Approach

-- Step 1: Add fallback fields to regimens table
ALTER TABLE "vetmed_regimens" ADD COLUMN "medication_name" text;
ALTER TABLE "vetmed_regimens" ADD COLUMN "is_custom_medication" boolean DEFAULT false NOT NULL;

-- Step 2: Add fallback fields to inventory items table
ALTER TABLE "vetmed_inventory_items" ADD COLUMN "medication_name" text;
ALTER TABLE "vetmed_inventory_items" ADD COLUMN "is_custom_medication" boolean DEFAULT false NOT NULL;

-- Step 3: Make medicationId nullable in both tables
ALTER TABLE "vetmed_regimens" ALTER COLUMN "medication_id" DROP NOT NULL;
ALTER TABLE "vetmed_inventory_items" ALTER COLUMN "medication_id" DROP NOT NULL;

-- Step 4: Populate medication_name for existing data from medication catalog
UPDATE "vetmed_regimens" 
SET "medication_name" = (
    SELECT COALESCE(m.brand_name, m.generic_name) 
    FROM "vetmed_medication_catalog" m 
    WHERE m.id = "vetmed_regimens"."medication_id"
)
WHERE "medication_id" IS NOT NULL;

UPDATE "vetmed_inventory_items" 
SET "medication_name" = (
    SELECT COALESCE(m.brand_name, m.generic_name) 
    FROM "vetmed_medication_catalog" m 
    WHERE m.id = "vetmed_inventory_items"."medication_id"
)
WHERE "medication_id" IS NOT NULL;

-- Step 5: Add constraint to ensure either medicationId OR medicationName is present
ALTER TABLE "vetmed_regimens" ADD CONSTRAINT "regimen_medication_check" 
CHECK (("medication_id" IS NOT NULL) OR ("medication_name" IS NOT NULL AND "medication_name" != ''));

ALTER TABLE "vetmed_inventory_items" ADD CONSTRAINT "inventory_medication_check" 
CHECK (("medication_id" IS NOT NULL) OR ("medication_name" IS NOT NULL AND "medication_name" != ''));

-- Step 6: Create indexes on new columns for performance
CREATE INDEX "regimen_medication_name_idx" ON "vetmed_regimens" USING btree ("medication_name" NULLS LAST);
CREATE INDEX "regimen_is_custom_idx" ON "vetmed_regimens" USING btree ("is_custom_medication");
CREATE INDEX "inventory_medication_name_idx" ON "vetmed_inventory_items" USING btree ("medication_name" NULLS LAST);
CREATE INDEX "inventory_is_custom_idx" ON "vetmed_inventory_items" USING btree ("is_custom_medication");