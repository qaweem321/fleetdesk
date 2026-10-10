DROP INDEX "payments_stripe_once";--> statement-breakpoint
CREATE UNIQUE INDEX "payments_stripe_once" ON "payments" USING btree ("stripe_payment_intent_id") WHERE "payments"."kind" = 'payment';