CREATE TYPE "public"."charge_kind" AS ENUM('extra_distance', 'fuel', 'late_return', 'damage', 'cleaning', 'other');--> statement-breakpoint
CREATE TYPE "public"."inspection_kind" AS ENUM('pickup', 'return');--> statement-breakpoint
CREATE TABLE "agreements" (
	"booking_id" uuid PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"signer_name" text NOT NULL,
	"signature_file_id" uuid,
	"signed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"signed_from_ip" text,
	"staff_id" text
);
--> statement-breakpoint
CREATE TABLE "booking_charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"kind" charge_kind NOT NULL,
	"description" text NOT NULL,
	"amount" integer NOT NULL,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_photos" (
	"inspection_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "inspection_photos_inspection_id_file_id_pk" PRIMARY KEY("inspection_id","file_id")
);
--> statement-breakpoint
CREATE TABLE "inspections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"kind" "inspection_kind" NOT NULL,
	"mileage" integer NOT NULL,
	"fuel_level" integer NOT NULL,
	"notes" text,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inspections_once" UNIQUE("booking_id","kind")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "picked_up_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "returned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "agreement_terms" text;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "fuel_charge_per_eighth" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_signature_file_id_files_id_fk" FOREIGN KEY ("signature_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_charges" ADD CONSTRAINT "booking_charges_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_charges" ADD CONSTRAINT "booking_charges_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_photos" ADD CONSTRAINT "inspection_photos_inspection_id_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."inspections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_photos" ADD CONSTRAINT "inspection_photos_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_charges_booking_id_idx" ON "booking_charges" USING btree ("booking_id");