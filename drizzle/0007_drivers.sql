CREATE TYPE "public"."verification_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "driver_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"date_of_birth" date,
	"license_number" text,
	"license_country" text,
	"license_expires_on" date,
	"license_front_file_id" uuid,
	"license_back_file_id" uuid,
	"id_document_file_id" uuid,
	"status" "verification_status",
	"review_note" text,
	"verified_by" text,
	"reviewed_by_id" text,
	"reviewed_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"stripe_verification_session_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "min_driver_age" integer DEFAULT 21 NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "stripe_identity_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_license_front_file_id_files_id_fk" FOREIGN KEY ("license_front_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_license_back_file_id_files_id_fk" FOREIGN KEY ("license_back_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_id_document_file_id_files_id_fk" FOREIGN KEY ("id_document_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;