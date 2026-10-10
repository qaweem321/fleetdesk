CREATE TYPE "public"."payment_kind" AS ENUM('payment', 'refund', 'deposit_hold', 'deposit_capture', 'deposit_release');--> statement-breakpoint
CREATE TYPE "public"."payment_method_kind" AS ENUM('stripe', 'cash', 'card_terminal', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_options" AS ENUM('pay_at_pickup', 'online', 'both');--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"kind" "payment_kind" NOT NULL,
	"method" "payment_method_kind" NOT NULL,
	"amount" integer NOT NULL,
	"description" text NOT NULL,
	"stripe_payment_intent_id" text,
	"stripe_refund_id" text,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "stripe_checkout_session_id" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "stripe_payment_method_id" text;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "payment_options" "payment_options" DEFAULT 'pay_at_pickup' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_booking_id_idx" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_stripe_once" ON "payments" USING btree ("kind","stripe_payment_intent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_stripe_refund_once" ON "payments" USING btree ("stripe_refund_id");