CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "airport_delays" (
	"id" serial PRIMARY KEY NOT NULL,
	"airport_iata" text NOT NULL,
	"delay_type" text NOT NULL,
	"reason" text,
	"avg_delay_minutes" integer DEFAULT 0,
	"expires_at" timestamp with time zone,
	"fetched_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "flight_legs" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_id" integer NOT NULL,
	"sequence_number" integer DEFAULT 0 NOT NULL,
	"flight_number" text NOT NULL,
	"airline_iata" text NOT NULL,
	"origin_iata" text NOT NULL,
	"destination_iata" text NOT NULL,
	"scheduled_departure" timestamp with time zone NOT NULL,
	"scheduled_arrival" timestamp with time zone NOT NULL,
	"actual_departure" timestamp with time zone,
	"actual_arrival" timestamp with time zone,
	"estimated_departure" timestamp with time zone,
	"estimated_arrival" timestamp with time zone,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"delay_minutes" integer DEFAULT 0,
	"aircraft_registration" text,
	"aircraft_type" text,
	"gate_departure" text,
	"gate_arrival" text,
	"terminal_departure" text,
	"terminal_arrival" text,
	"next_check_at" timestamp with time zone,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "flight_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"flight_leg_id" integer NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now(),
	"status" text NOT NULL,
	"delay_minutes" integer DEFAULT 0,
	"gate" text,
	"terminal" text,
	"estimated_departure" timestamp with time zone,
	"estimated_arrival" timestamp with time zone,
	"source" text DEFAULT 'flightaware' NOT NULL,
	"raw_data" jsonb
);
--> statement-breakpoint
CREATE TABLE "inbound_legs" (
	"id" serial PRIMARY KEY NOT NULL,
	"flight_leg_id" integer NOT NULL,
	"inbound_flight_number" text NOT NULL,
	"inbound_airline" text,
	"inbound_date" text NOT NULL,
	"inbound_origin_iata" text,
	"inbound_status" text DEFAULT 'unknown',
	"inbound_delay_minutes" integer DEFAULT 0,
	"inbound_scheduled_arrival" timestamp with time zone,
	"inbound_actual_arrival" timestamp with time zone,
	"inbound_estimated_arrival" timestamp with time zone,
	"last_updated" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"flight_leg_id" integer,
	"type" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now(),
	"channel" text DEFAULT 'push' NOT NULL,
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"image" text,
	"notify_delays" boolean DEFAULT true,
	"notify_gate_changes" boolean DEFAULT true,
	"notify_boarding" boolean DEFAULT true,
	"notify_cancellations" boolean DEFAULT true,
	"notify_inbound_delays" boolean DEFAULT true,
	"notify_connection_risk" boolean DEFAULT true,
	"min_delay_minutes" integer DEFAULT 15,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flight_legs" ADD CONSTRAINT "flight_legs_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flight_status_history" ADD CONSTRAINT "flight_status_history_flight_leg_id_flight_legs_id_fk" FOREIGN KEY ("flight_leg_id") REFERENCES "public"."flight_legs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_legs" ADD CONSTRAINT "inbound_legs_flight_leg_id_flight_legs_id_fk" FOREIGN KEY ("flight_leg_id") REFERENCES "public"."flight_legs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_flight_leg_id_flight_legs_id_fk" FOREIGN KEY ("flight_leg_id") REFERENCES "public"."flight_legs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "airport_delays_iata_idx" ON "airport_delays" USING btree ("airport_iata");--> statement-breakpoint
CREATE INDEX "flight_legs_trip_id_idx" ON "flight_legs" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "flight_legs_next_check_idx" ON "flight_legs" USING btree ("next_check_at");--> statement-breakpoint
CREATE INDEX "fsh_flight_leg_id_idx" ON "flight_status_history" USING btree ("flight_leg_id");--> statement-breakpoint
CREATE INDEX "inbound_legs_flight_leg_id_idx" ON "inbound_legs" USING btree ("flight_leg_id");--> statement-breakpoint
CREATE INDEX "notif_log_user_id_idx" ON "notification_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "push_subs_user_id_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trips_user_id_idx" ON "trips" USING btree ("user_id");