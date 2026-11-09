CREATE TABLE "internal"."booked_trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"project_id" uuid,
	"title" text DEFAULT 'Plan de viaje' NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"travelers" text DEFAULT '' NOT NULL,
	"cover_place" text DEFAULT '' NOT NULL,
	"europa_go" boolean DEFAULT false NOT NULL,
	"assistance" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"plan" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal"."client_account_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"purpose" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_account_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "internal"."client_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"active" boolean DEFAULT true NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_accounts_client_id_unique" UNIQUE("client_id"),
	CONSTRAINT "client_accounts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "internal"."client_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "internal"."trip_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"item_id" uuid,
	"filename" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal"."trip_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"provider" text DEFAULT '' NOT NULL,
	"start_date" date,
	"start_time" text DEFAULT '' NOT NULL,
	"end_date" date,
	"end_time" text DEFAULT '' NOT NULL,
	"place" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"confirmation" text DEFAULT '' NOT NULL,
	"details" text DEFAULT '' NOT NULL,
	"breakfast" boolean,
	"rating" text DEFAULT '' NOT NULL,
	"price" numeric(12, 2),
	"currency" text DEFAULT 'USD' NOT NULL,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"voucher_url" text DEFAULT '' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "internal"."booked_trips" ADD CONSTRAINT "booked_trips_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal"."booked_trips" ADD CONSTRAINT "booked_trips_project_id_trip_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."trip_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal"."client_account_tokens" ADD CONSTRAINT "client_account_tokens_account_id_client_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "internal"."client_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal"."client_accounts" ADD CONSTRAINT "client_accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal"."client_sessions" ADD CONSTRAINT "client_sessions_account_id_client_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "internal"."client_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal"."trip_files" ADD CONSTRAINT "trip_files_trip_id_booked_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "internal"."booked_trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal"."trip_files" ADD CONSTRAINT "trip_files_item_id_trip_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "internal"."trip_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal"."trip_items" ADD CONSTRAINT "trip_items_trip_id_booked_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "internal"."booked_trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booked_trips_client_idx" ON "internal"."booked_trips" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "trip_files_trip_idx" ON "internal"."trip_files" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "trip_items_trip_idx" ON "internal"."trip_items" USING btree ("trip_id");