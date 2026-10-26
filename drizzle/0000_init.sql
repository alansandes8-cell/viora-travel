CREATE SCHEMA "internal";
--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_id" uuid,
	"actor_kind" text NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal"."ai_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"stage" text NOT NULL,
	"model" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"duration_ms" integer,
	"ok" boolean NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal"."budget_hints" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"amount" numeric(14, 2),
	"currency" text,
	"per" text,
	"includes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"flexibility" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"source" text NOT NULL,
	"text" text NOT NULL,
	"parsed" jsonb,
	"status" text NOT NULL,
	"result_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"content" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text,
	"phone" text,
	"country" text,
	"consent_contact" boolean DEFAULT false NOT NULL,
	"consent_at" timestamp with time zone,
	"source" text DEFAULT 'web' NOT NULL,
	"anonymized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "destinations" (
	"id" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"source" text DEFAULT 'seed' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intake_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"token_hash" text NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"step" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "intake_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "link_checks" (
	"url" text PRIMARY KEY NOT NULL,
	"ok" boolean NOT NULL,
	"status_code" integer,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"kind" text NOT NULL,
	"url" text NOT NULL,
	"thumb_url" text,
	"width" integer,
	"height" integer,
	"title" text,
	"author" text,
	"author_url" text,
	"source_url" text,
	"license" text,
	"attribution" text,
	"ai_generated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_queries" (
	"query" text NOT NULL,
	"kind" text NOT NULL,
	"provider" text NOT NULL,
	"asset_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_queries_query_kind_provider_pk" PRIMARY KEY("query","kind","provider")
);
--> statement-breakpoint
CREATE TABLE "internal"."notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"author_id" uuid,
	"kind" text DEFAULT 'note' NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"parent_id" uuid,
	"author_kind" text NOT NULL,
	"author_user_id" uuid,
	"reason" text NOT NULL,
	"document" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"change_summary" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal"."price_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"component_id" uuid,
	"kind" text NOT NULL,
	"provider" text,
	"observed_at" timestamp with time zone NOT NULL,
	"travel_from" date,
	"travel_to" date,
	"pax" integer,
	"currency" text,
	"amount" numeric(14, 2),
	"includes" text,
	"excludes" text,
	"baggage" text,
	"cancellation" text,
	"url" text,
	"availability" text,
	"valid_until" timestamp with time zone,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_statuses" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort" integer NOT NULL,
	"is_final" boolean DEFAULT false NOT NULL,
	"color" text DEFAULT 'slate' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal"."quote_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"version_id" uuid,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"date_from" date,
	"date_to" date,
	"pax" integer,
	"specs" text,
	"supplier" text,
	"source_url" text,
	"verification" text DEFAULT 'pending' NOT NULL,
	"plan_ref" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal"."quote_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"component_id" uuid,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"unit_amount" numeric(14, 2) NOT NULL,
	"currency" text NOT NULL,
	"fx_rate" numeric(14, 6),
	"per_person" boolean DEFAULT false NOT NULL,
	"observation_id" uuid,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"client_id" uuid,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"preferred_channel" text DEFAULT 'whatsapp' NOT NULL,
	"message" text,
	"consent" boolean NOT NULL,
	"notification_status" text NOT NULL,
	"notification_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal"."quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"version_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"currency" text NOT NULL,
	"travelers" integer NOT NULL,
	"fx_note" text,
	"fx_date" date,
	"taxes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"margin_percent" numeric(6, 2),
	"management_fee" numeric(14, 2),
	"payment_terms" text,
	"valid_until" date,
	"included" text,
	"excluded" text,
	"conditions" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limits_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_access_at" timestamp with time zone,
	"access_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "share_links_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "staff_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_agent" text,
	CONSTRAINT "staff_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "staff_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'agent' NOT NULL,
	"totp_secret" text,
	"active" boolean DEFAULT true NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"detail" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"due_date" date,
	"assignee_id" uuid,
	"origin" text DEFAULT 'manual' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"client_id" uuid,
	"name" text NOT NULL,
	"status_key" text DEFAULT 'new' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"assigned_user_id" uuid,
	"current_version_id" uuid,
	"published_version_id" uuid,
	"destination_summary" text,
	"tentative_dates" text,
	"travelers" integer,
	"budget_tier" text,
	"next_follow_up" date,
	"next_task" text,
	"archived_at" timestamp with time zone,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_projects_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "internal"."budget_hints" ADD CONSTRAINT "budget_hints_project_id_trip_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."trip_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_project_id_trip_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."trip_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_snapshots" ADD CONSTRAINT "client_snapshots_project_id_trip_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."trip_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_sessions" ADD CONSTRAINT "intake_sessions_project_id_trip_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."trip_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal"."notes" ADD CONSTRAINT "notes_project_id_trip_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."trip_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_versions" ADD CONSTRAINT "plan_versions_project_id_trip_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."trip_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal"."price_observations" ADD CONSTRAINT "price_observations_project_id_trip_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."trip_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal"."quote_components" ADD CONSTRAINT "quote_components_project_id_trip_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."trip_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal"."quote_lines" ADD CONSTRAINT "quote_lines_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "internal"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_project_id_trip_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."trip_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal"."quotes" ADD CONSTRAINT "quotes_project_id_trip_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."trip_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_project_id_trip_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."trip_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_snapshot_id_client_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."client_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_sessions" ADD CONSTRAINT "staff_sessions_user_id_staff_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."staff_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_trip_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."trip_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_projects" ADD CONSTRAINT "trip_projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_projects" ADD CONSTRAINT "trip_projects_assigned_user_id_staff_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."staff_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_project_idx" ON "activity_log" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_provider_external" ON "media_assets" USING btree ("provider","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_versions_project_number" ON "plan_versions" USING btree ("project_id","number");--> statement-breakpoint
CREATE INDEX "trip_projects_status_idx" ON "trip_projects" USING btree ("status_key");--> statement-breakpoint
CREATE INDEX "trip_projects_client_idx" ON "trip_projects" USING btree ("client_id");