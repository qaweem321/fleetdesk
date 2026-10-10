CREATE TYPE "public"."coupon_type" AS ENUM('percent', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."extra_charge" AS ENUM('per_day', 'per_rental');--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"type" "coupon_type" NOT NULL,
	"amount" integer NOT NULL,
	"valid_from" date,
	"valid_until" date,
	"min_days" integer,
	"max_uses" integer,
	"times_used" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"charge" "extra_charge" NOT NULL,
	"max_quantity" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"adjustment_percent" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seasons_ends_after_start" CHECK ("seasons"."ends_on" >= "seasons"."starts_on"),
	CONSTRAINT "seasons_adjustment_range" CHECK ("seasons"."adjustment_percent" between -90 and 500)
);
--> statement-breakpoint
ALTER TABLE "car_models" ADD COLUMN "daily_rate" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "car_models" ADD COLUMN "weekly_rate" integer;--> statement-breakpoint
ALTER TABLE "car_models" ADD COLUMN "deposit_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "car_models" ADD COLUMN "included_distance_per_day" integer;--> statement-breakpoint
ALTER TABLE "car_models" ADD COLUMN "extra_distance_fee" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "drop_off_fee" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "tax_rate" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "tax_name" text DEFAULT 'Tax' NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "grace_minutes" integer DEFAULT 59 NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "min_lead_hours" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "max_rental_days" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "coupons_code_unique" ON "coupons" USING btree ("code");