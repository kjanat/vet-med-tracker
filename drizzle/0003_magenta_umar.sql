CREATE TABLE "vetmed_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"household_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"dismissed" boolean DEFAULT false NOT NULL,
	"action_url" text,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "vetmed_notifications" ADD CONSTRAINT "vetmed_notifications_user_id_vetmed_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."vetmed_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vetmed_notifications" ADD CONSTRAINT "vetmed_notifications_household_id_vetmed_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."vetmed_households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_user_read_idx" ON "vetmed_notifications" USING btree ("user_id" uuid_ops,"read" bool_ops);--> statement-breakpoint
CREATE INDEX "notification_household_idx" ON "vetmed_notifications" USING btree ("household_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "notification_created_at_idx" ON "vetmed_notifications" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "notification_type_idx" ON "vetmed_notifications" USING btree ("type" text_ops);