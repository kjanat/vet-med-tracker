CREATE TYPE "public"."action_type" AS ENUM('CREATE', 'READ', 'UPDATE', 'DELETE', 'BULK_CREATE', 'BULK_UPDATE', 'BULK_DELETE', 'AUTHENTICATE', 'AUTHORIZE', 'IMPORT', 'EXPORT');--> statement-breakpoint
CREATE TYPE "public"."resource_type" AS ENUM('USER', 'HOUSEHOLD', 'ANIMAL', 'MEDICATION', 'REGIMEN', 'ADMINISTRATION', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."severity_level" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
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
ALTER TABLE "vetmed_inventory_items" ALTER COLUMN "expires_on" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "vetmed_inventory_items" ALTER COLUMN "opened_on" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "vetmed_inventory_items" ALTER COLUMN "purchase_date" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "vetmed_regimens" ALTER COLUMN "end_date" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "vetmed_regimens" ALTER COLUMN "start_date" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
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
CREATE INDEX "security_events_severity_idx" ON "security_events" USING btree ("severity");