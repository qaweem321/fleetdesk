CREATE TYPE "public"."car_class" AS ENUM('economy', 'compact', 'midsize', 'fullsize', 'suv', 'van', 'luxury', 'convertible', 'pickup');--> statement-breakpoint
CREATE TYPE "public"."fuel_type" AS ENUM('petrol', 'diesel', 'hybrid', 'electric');--> statement-breakpoint
CREATE TYPE "public"."transmission" AS ENUM('automatic', 'manual');--> statement-breakpoint
CREATE TYPE "public"."vehicle_status" AS ENUM('available', 'maintenance', 'retired');--> statement-breakpoint
CREATE TYPE "public"."distance_unit" AS ENUM('km', 'mi');--> statement-breakpoint
CREATE TABLE "car_model_photos" (
	"car_model_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "car_model_photos_car_model_id_file_id_pk" PRIMARY KEY("car_model_id","file_id")
);
--> statement-breakpoint
CREATE TABLE "car_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"car_class" "car_class" NOT NULL,
	"transmission" "transmission" NOT NULL,
	"fuel_type" "fuel_type" NOT NULL,
	"seats" integer NOT NULL,
	"doors" integer NOT NULL,
	"bags" integer NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason" text NOT NULL,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicle_blocks_ends_after_start" CHECK ("vehicle_blocks"."ends_at" > "vehicle_blocks"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"car_model_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"plate" text NOT NULL,
	"vin" text,
	"year" integer,
	"color" text,
	"mileage" integer DEFAULT 0 NOT NULL,
	"status" "vehicle_status" DEFAULT 'available' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "distance_unit" "distance_unit" DEFAULT 'km' NOT NULL;--> statement-breakpoint
ALTER TABLE "car_model_photos" ADD CONSTRAINT "car_model_photos_car_model_id_car_models_id_fk" FOREIGN KEY ("car_model_id") REFERENCES "public"."car_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_model_photos" ADD CONSTRAINT "car_model_photos_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_blocks" ADD CONSTRAINT "vehicle_blocks_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_blocks" ADD CONSTRAINT "vehicle_blocks_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_car_model_id_car_models_id_fk" FOREIGN KEY ("car_model_id") REFERENCES "public"."car_models"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vehicle_blocks_vehicle_id_idx" ON "vehicle_blocks" USING btree ("vehicle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicles_plate_unique" ON "vehicles" USING btree (regexp_replace("plate", '[\s-]', '', 'g'));--> statement-breakpoint
CREATE INDEX "vehicles_car_model_id_idx" ON "vehicles" USING btree ("car_model_id");--> statement-breakpoint
CREATE INDEX "vehicles_location_id_idx" ON "vehicles" USING btree ("location_id");