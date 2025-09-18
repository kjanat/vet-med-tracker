ALTER TABLE "vetmed_users"
    ADD COLUMN "week_starts_on" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "vetmed_users"
    ADD COLUMN "default_household_id" uuid;--> statement-breakpoint
ALTER TABLE "vetmed_users"
    ADD COLUMN "default_animal_id" uuid;--> statement-breakpoint
ALTER TABLE "vetmed_users"
    ADD COLUMN "theme" text DEFAULT 'system';--> statement-breakpoint
ALTER TABLE "vetmed_users"
    ADD CONSTRAINT "vetmed_users_default_household_id_fk" FOREIGN KEY ("default_household_id") REFERENCES "public"."vetmed_households" ("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_users"
    ADD CONSTRAINT "vetmed_users_default_animal_id_fk" FOREIGN KEY ("default_animal_id") REFERENCES "public"."vetmed_animals" ("id") ON DELETE set null ON UPDATE no action;