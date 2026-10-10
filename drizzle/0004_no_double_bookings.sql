-- No double bookings, guaranteed by the database: two bookings that hold a car (waiting for
-- payment, confirmed or picked up) can't overlap in time for the same vehicle. Even if two
-- customers book the last car in the same second, one of them gets an error instead of a
-- double booking. Each booking holds the car from pickup until it's ready again (ready_at:
-- the return time plus cleaning time).
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist ("vehicle_id" WITH =, tstzrange("pickup_at", "ready_at", '[)') WITH &&)
  WHERE ("status" IN ('pending_payment', 'confirmed', 'active'));
