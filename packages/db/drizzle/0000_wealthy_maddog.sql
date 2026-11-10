CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"subject" text,
	"action" text NOT NULL,
	"text_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"subject" text NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_challenges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"value_hash" text NOT NULL,
	"payload" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"handle" text,
	"display_name" text,
	"bio" text,
	"avatar_key" text,
	"friend_code" text,
	"country" text,
	"status" text DEFAULT 'active' NOT NULL,
	"invited_by" uuid,
	"offers_consent" boolean DEFAULT false NOT NULL,
	"card_spend_consent" boolean DEFAULT false NOT NULL,
	"notify_telegram" boolean DEFAULT false NOT NULL,
	"notify_email" boolean DEFAULT false NOT NULL,
	"show_level" boolean DEFAULT true NOT NULL,
	"show_stamps" boolean DEFAULT true NOT NULL,
	"show_numbers" boolean DEFAULT true NOT NULL,
	"show_bio" boolean DEFAULT true NOT NULL,
	"peak_points" integer DEFAULT 0 NOT NULL,
	"handle_changed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"status" text DEFAULT 'connected' NOT NULL,
	"access_token_enc" text,
	"refresh_token_enc" text,
	"token_expires_at" timestamp with time zone,
	"scopes" text[],
	"last_synced_at" timestamp with time zone,
	"last_synced_week" text,
	"stale_weeks" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metric_extras" (
	"connection_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" jsonb,
	"week" text NOT NULL,
	CONSTRAINT "metric_extras_connection_id_key_week_pk" PRIMARY KEY("connection_id","key","week")
);
--> statement-breakpoint
CREATE TABLE "metric_values" (
	"connection_id" uuid NOT NULL,
	"metric_key" text NOT NULL,
	"value" double precision NOT NULL,
	"week" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "metric_values_connection_id_metric_key_week_pk" PRIMARY KEY("connection_id","metric_key","week")
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"connection_id" uuid NOT NULL,
	"week" text NOT NULL,
	"status" text NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"error_code" text,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"user_a" uuid NOT NULL,
	"user_b" uuid NOT NULL,
	"source" text NOT NULL,
	"rewarded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friendships_user_a_user_b_pk" PRIMARY KEY("user_a","user_b")
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"inviter_id" uuid NOT NULL,
	"invitee_id" uuid,
	"joined_at" timestamp with time zone,
	"first_connect_at" timestamp with time zone,
	"last_reminded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pass_snapshots" (
	"user_id" uuid NOT NULL,
	"week" text NOT NULL,
	"state" text NOT NULL,
	"axes" jsonb NOT NULL,
	"points" integer NOT NULL,
	"level" integer NOT NULL,
	"title" text NOT NULL,
	"top_pct" jsonb,
	"key_numbers" jsonb,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pass_snapshots_user_id_week_state_pk" PRIMARY KEY("user_id","week","state")
);
--> statement-breakpoint
CREATE TABLE "recaps" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"week" text NOT NULL,
	"payload" jsonb NOT NULL,
	"seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stamps" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"stamp_key" text NOT NULL,
	"tier" integer,
	"awarded_week" text,
	"revoked_at" timestamp with time zone,
	"source_connection_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visibility" (
	"user_id" uuid NOT NULL,
	"axis" text NOT NULL,
	"level" text DEFAULT 'everyone' NOT NULL,
	CONSTRAINT "visibility_user_id_axis_pk" PRIMARY KEY("user_id","axis")
);
--> statement-breakpoint
CREATE TABLE "weeks" (
	"week" text PRIMARY KEY NOT NULL,
	"drop_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'preparing' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"site_url" text,
	"source" text DEFAULT 'direct' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_codes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"offer_id" uuid NOT NULL,
	"code_enc" text NOT NULL,
	"assigned_user_id" uuid,
	"assigned_week" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"type" text NOT NULL,
	"axis" text NOT NULL,
	"headline" text NOT NULL,
	"terms" text,
	"rule" jsonb DEFAULT '{"all":[]}'::jsonb NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"countries" text[],
	"starts_week" text,
	"ends_week" text,
	"code_mode" text,
	"shared_code" text,
	"rate" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_offers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"offer_id" uuid NOT NULL,
	"week" text NOT NULL,
	"state" text DEFAULT 'available' NOT NULL,
	"reason" jsonb,
	"activated_at" timestamp with time zone,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card_3ds_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"merchant" text,
	"amount" text,
	"currency" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"wirex_operation_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card_accounts" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"provider_customer_id" text,
	"kyc_status" text DEFAULT 'none' NOT NULL,
	"kyc_reason" text,
	"card_status" text DEFAULT 'none' NOT NULL,
	"last4" text,
	"currency" text,
	"country" text,
	"notify_country" text,
	"deposit_address_usdc" text,
	"deposit_address_eurc" text,
	"deposit_address_evm" text,
	"deposit_address_solana" text,
	"deposit_address_tron" text,
	"last_activity_at" timestamp with time zone,
	"count_in_pass" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provider_event_id" text NOT NULL,
	"user_id" uuid,
	"type" text NOT NULL,
	"payload" jsonb,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card_withdrawals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" text NOT NULL,
	"token" text NOT NULL,
	"to_address" text NOT NULL,
	"status" text DEFAULT 'sending' NOT NULL,
	"request_tx_hash" text,
	"final_tx_hash" text,
	"call_data" text,
	"valid_after" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cashback_ledger" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"user_offer_id" uuid,
	"amount" text NOT NULL,
	"currency" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"event_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor" text,
	"action" text NOT NULL,
	"subject" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_exports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"file_key" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"channel" text NOT NULL,
	"payload" jsonb,
	"status" text DEFAULT 'queued' NOT NULL,
	"sent_at" timestamp with time zone,
	"dedupe_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "metric_extras" ADD CONSTRAINT "metric_extras_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_values" ADD CONSTRAINT "metric_values_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "identities_kind_subject_idx" ON "identities" USING btree ("kind","subject");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_idx" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "users_handle_lower_idx" ON "users" USING btree (lower("handle"));--> statement-breakpoint
CREATE UNIQUE INDEX "users_friend_code_idx" ON "users" USING btree ("friend_code");--> statement-breakpoint
CREATE UNIQUE INDEX "connections_provider_external_idx" ON "connections" USING btree ("provider","external_id");--> statement-breakpoint
CREATE INDEX "connections_user_idx" ON "connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pass_snapshots_week_state_idx" ON "pass_snapshots" USING btree ("week","state");--> statement-breakpoint
CREATE UNIQUE INDEX "user_offers_user_offer_week_idx" ON "user_offers" USING btree ("user_id","offer_id","week");--> statement-breakpoint
CREATE INDEX "user_offers_user_week_idx" ON "user_offers" USING btree ("user_id","week");--> statement-breakpoint
CREATE UNIQUE INDEX "card_events_provider_event_idx" ON "card_events" USING btree ("provider_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cashback_ledger_event_idx" ON "cashback_ledger" USING btree ("event_key");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_dedupe_idx" ON "notifications" USING btree ("dedupe_key");