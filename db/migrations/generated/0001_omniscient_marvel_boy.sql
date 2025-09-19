ALTER TABLE "vetmed_users" ADD COLUMN "preferences" jsonb DEFAULT '{"defaultTimezone":"America/New_York","preferredPhoneNumber":null,"emergencyContactName":null,"emergencyContactPhone":null,"notificationPreferences":{"emailReminders":true,"smsReminders":false,"pushNotifications":true,"reminderLeadTime":15},"displayPreferences":{"temperatureUnit":"fahrenheit","weightUnit":"lbs","use24HourTime":false,"weekStartsOn":0,"theme":"system"},"defaultHouseholdId":null,"defaultAnimalId":null}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "vetmed_users" ADD COLUMN "profile" jsonb DEFAULT '{"firstName":null,"lastName":null,"bio":null,"pronouns":null,"location":null,"website":null,"socialLinks":{},"profileVisibility":{"name":true,"email":false,"bio":true,"location":true},"profileCompletedAt":null}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "vetmed_users" DROP COLUMN "bio";--> statement-breakpoint
ALTER TABLE "vetmed_users" DROP COLUMN "email_reminders";--> statement-breakpoint
ALTER TABLE "vetmed_users" DROP COLUMN "emergency_contact_name";--> statement-breakpoint
ALTER TABLE "vetmed_users" DROP COLUMN "emergency_contact_phone";--> statement-breakpoint
ALTER TABLE "vetmed_users" DROP COLUMN "first_name";--> statement-breakpoint
ALTER TABLE "vetmed_users" DROP COLUMN "last_name";--> statement-breakpoint
ALTER TABLE "vetmed_users" DROP COLUMN "location";--> statement-breakpoint
ALTER TABLE "vetmed_users" DROP COLUMN "preferences_backup";--> statement-breakpoint
ALTER TABLE "vetmed_users" DROP COLUMN "preferred_phone_number";--> statement-breakpoint
ALTER TABLE "vetmed_users" DROP COLUMN "preferred_timezone";--> statement-breakpoint
ALTER TABLE "vetmed_users" DROP COLUMN "profile_completed_at";--> statement-breakpoint
ALTER TABLE "vetmed_users" DROP COLUMN "profile_data";--> statement-breakpoint
ALTER TABLE "vetmed_users" DROP COLUMN "profile_visibility";--> statement-breakpoint
ALTER TABLE "vetmed_users" DROP COLUMN "pronouns";--> statement-breakpoint
ALTER TABLE "vetmed_users" DROP COLUMN "push_notifications";--> statement-breakpoint
ALTER TABLE "vetmed_users" DROP COLUMN "reminder_lead_time_minutes";--> statement-breakpoint
ALTER TABLE "vetmed_users" DROP COLUMN "sms_reminders";--> statement-breakpoint
ALTER TABLE "vetmed_users" DROP COLUMN "social_links";--> statement-breakpoint
ALTER TABLE "vetmed_users" DROP COLUMN "temperature_unit";--> statement-breakpoint
ALTER TABLE "vetmed_users" DROP COLUMN "theme";--> statement-breakpoint
ALTER TABLE "vetmed_users" DROP COLUMN "use_24_hour_time";--> statement-breakpoint
ALTER TABLE "vetmed_users" DROP COLUMN "website";--> statement-breakpoint
ALTER TABLE "vetmed_users" DROP COLUMN "week_starts_on";--> statement-breakpoint
ALTER TABLE "vetmed_users" DROP COLUMN "weight_unit";