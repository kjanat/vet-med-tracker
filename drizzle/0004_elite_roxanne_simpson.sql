CREATE TYPE "public"."vetmed_suggestion_status" AS ENUM('pending', 'applied', 'reverted', 'dismissed');--> statement-breakpoint
CREATE TABLE "vetmed_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"type" text NOT NULL,
	"summary" text NOT NULL,
	"rationale" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"estimated_impact" text,
	"status" "vetmed_suggestion_status" DEFAULT 'pending' NOT NULL,
	"action" jsonb NOT NULL,
	"original_values" jsonb,
	"applied_at" timestamp with time zone,
	"applied_by_user_id" uuid,
	"reverted_at" timestamp with time zone,
	"reverted_by_user_id" uuid,
	"dismissed_at" timestamp with time zone,
	"dismissed_by_user_id" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vetmed_suggestions" ADD CONSTRAINT "vetmed_suggestions_household_id_vetmed_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."vetmed_households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_suggestions" ADD CONSTRAINT "vetmed_suggestions_applied_by_user_id_vetmed_users_id_fk" FOREIGN KEY ("applied_by_user_id") REFERENCES "public"."vetmed_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_suggestions" ADD CONSTRAINT "vetmed_suggestions_reverted_by_user_id_vetmed_users_id_fk" FOREIGN KEY ("reverted_by_user_id") REFERENCES "public"."vetmed_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_suggestions" ADD CONSTRAINT "vetmed_suggestions_dismissed_by_user_id_vetmed_users_id_fk" FOREIGN KEY ("dismissed_by_user_id") REFERENCES "public"."vetmed_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "suggestions_household_id_idx" ON "vetmed_suggestions" USING btree ("household_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "suggestions_status_idx" ON "vetmed_suggestions" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "suggestions_type_idx" ON "vetmed_suggestions" USING btree ("type" text_ops);--> statement-breakpoint
CREATE INDEX "suggestions_created_at_idx" ON "vetmed_suggestions" USING btree ("created_at" timestamptz_ops);