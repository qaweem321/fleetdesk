# Design decisions

Why Fleetdesk is built the way it is, and what each choice costs. Each section answers a question an
interviewer or contributor is likely to ask.

## 1. How are double bookings prevented?

By the database, not by a check in the code. A "is this car free?" query followed by an insert has a
gap: two customers can both see the last car as free and both book it. So `bookings` has an exclusion
constraint (`drizzle/0004_no_double_bookings.sql`):

```sql
EXCLUDE USING gist (vehicle_id WITH =, tstzrange(pickup_at, ready_at, '[)') WITH &&)
WHERE (status IN ('pending_payment', 'confirmed', 'active'))
```

Two bookings that hold a car can't overlap in time on the same vehicle; Postgres rejects the second
insert. `ready_at` is the return time plus the cleaning time from Settings, so a car isn't handed out
again the minute it comes back.

`createBooking` asks for up to five free vehicles of the model (lowest mileage first, to spread wear)
and tries them in order. When the constraint fires, it moves on to the next car; only when all are taken
does the customer see "this car was just booked". Swapping a car at pickup goes through the same
constraint.

**Trade-off:** Drizzle can't describe exclusion constraints, so this one lives in a hand-written
migration and needs the `btree_gist` extension.

## 2. Why is the price one pure function?

`calculateQuote` in `src/lib/pricing/quote.ts` does no I/O. The search results, the booking form, the
booking itself and the admin price calculator all call it, so a customer always pays what they were
shown. It handles every started 24 hours as a day (with a grace period for late returns), the weekly
rate from 7 days, seasons per local date, extras, the one-way fee, coupons and tax.

Days with the same season adjustment are counted first and rounded once per group, so 7 days at the
weekly price add up to exactly the weekly price, not 7 rounded sevenths.

The result is copied onto the booking (`rental_price`, `tax`, `total`, and each extra with its price).
Changing a price later never changes an existing booking.

## 3. How is money stored?

As whole numbers in the currency's smallest unit (cents for USD, yen for JPY, fils for KWD), so adding
prices never produces `0.1 + 0.2` errors. `currencyDecimals` asks `Intl` how many decimals a currency
has, so formatting and parsing work for any ISO currency without a table.

Because amounts carry no currency of their own, switching currency would silently turn $49.99 into
¥4,999. `currencyInUse()` checks (in one query) whether any car model, booking, extra or coupon exists,
and Settings locks the currency once one does.

## 4. What happens to a booking that is waiting for an online payment?

It is saved as `pending_payment` with `hold_expires_at`, so it holds the car (it counts for the
exclusion constraint) while the customer is on Stripe's page. The Checkout page closes before the hold
ends, so a payment can never arrive for a car that was already let go.

Abandoned bookings are released in two ways: Stripe's `checkout.session.expired` webhook cancels the
booking, and `releaseExpiredHolds()` cancels expired ones right before every new booking is saved.
Searching doesn't need to write first: the availability query simply ignores holds that have expired.

Cancelling and giving coupon uses back happen in one SQL statement (a CTE that updates both), so a
limited coupon isn't used up by bookings nobody paid for.

## 5. What if Stripe reports the same payment twice, or too late?

The webhook and the customer's return to the site can both report the same payment. `completeCheckout`
is safe to run twice:

- The status change is conditional (`WHERE status = 'pending_payment'`), so only the first call
  confirms the booking and sends the email.
- A partial unique index on `payments (stripe_payment_intent_id) WHERE kind = 'payment'` plus
  `ON CONFLICT DO NOTHING` saves the payment once.
- If the booking was cancelled before the money arrived, or an older payment page was paid as well,
  the payment is refunded automatically, with an idempotency key so a retry doesn't refund twice.

Clicking "Pay now" again opens a new page and closes the old one. Only the booking's current page may
cancel it when it expires, so closing the old page doesn't cancel the booking.

## 6. Why is money a list of records instead of a "paid" column?

Every payment, refund, deposit hold, deposit charge and deposit release is a row in `payments`; rows are
only added, never changed. `summarizePayments` (pure and tested) adds them up into paid, refunded,
deposit held and still due, and every screen, receipt and email uses it, so they always agree.

**Trade-off:** "how much is paid" is computed on each read instead of read from a column. A booking has a
handful of rows, so this costs nothing, and the history is always complete.

## 7. How do deposits work?

The card from online checkout is saved (`setup_future_usage: off_session`). At pickup, staff can hold
the deposit on it: a PaymentIntent with `capture_method: manual`, so no money moves. At the return,
part of it is captured (damage, fuel, late return) and the rest is released automatically. Without a
saved card, staff take the deposit at the counter and record it.

Stripe lets go of uncaptured holds after about 7 days, so a card hold is only offered when the car is
due back within 6 days (`CARD_HOLD_MAX_DAYS`). If a hold has expired anyway, the return records it as
let go and the amount owed shows as still to pay.

The hold's idempotency key is numbered by earlier holds (`deposit-<booking>-<n>`): two staff finishing
the same pickup get one hold, but a retry after a failed pickup gets a new one.

## 8. What happens at pickup, and what if it fails halfway?

`completePickup` checks the driver, the car and the signature, holds the card deposit (if chosen), and
then saves the inspection, photos, signed agreement, the booking's new status, the car's mileage and a
counter deposit in one transaction. A unique constraint (`inspections_once`) makes a second pickup of
the same booking fail instead of running twice. If the transaction fails for any other reason, the card
hold is released, so it doesn't sit on the customer's card for days.

The agreement's full text is saved with the signature, the signer's name and IP address. Changing the
terms in Settings later never changes what a customer signed.

**Trade-off:** Stripe calls can't join a database transaction, so the hold happens before it and is
undone by hand on failure.

## 9. Why two database drivers?

On Vercel, Neon's HTTP driver is the fastest option (no connection pool to keep warm). On Docker or any
other Postgres, a normal `postgres.js` connection is the right one. `databaseDriver()` picks one from
`DATABASE_URL` (or `DATABASE_DRIVER`), and both share one query API.

The one difference is transactions: Neon over HTTP can only run a batch of statements prepared up
front. `atomic()` in `src/db/atomic.ts` hides this: it takes a list of statements and runs them as
`db.batch` on Neon or a normal transaction elsewhere.

**Trade-off:** a batch can't decide anything halfway through. For example, when a coupon's last use is
taken at the same moment, the coupon update matches no row and the booking is deleted again right after
the transaction, instead of rolling it back.

## 10. Where do photos go, and who can see them?

Uploads go through one storage interface (`put`, `get`, `remove`) with three drivers: `database` (the
default, works on Vercel with no setup, backed up with the database), `local` (a Docker volume) and `s3`
(any S3-compatible bucket, signed with the small `aws4fetch` instead of the full AWS SDK). Each file row
remembers its driver, so old photos stay readable after a switch. Bytes live in a separate
`file_blobs` table, so listing files never loads their contents.

Every file is served through `/files/[id]`. Public ones (car photos, the logo) get a one-year immutable
cache; private ones (licenses, inspection photos, signatures) reach only staff and the customer they
belong to, and anyone else gets the same 404 as a missing file. The file type is read from the first
bytes, not from the name, and photos are shrunk in the browser to stay under Vercel's 4.5 MB request
limit.

## 11. How does the daily job avoid sending a reminder twice?

Each reminder is claimed before it is sent: one `UPDATE ... SET pickup_reminder_sent_at = now WHERE
pickup_reminder_sent_at IS NULL ... RETURNING id`. Two runs at the same moment can't both claim the same
booking. If sending fails, the claim is undone so the next run tries again. The staff summary is claimed
the same way once per local day (`summary_sent_on`). That is why Docker calls the job every hour and it is
still safe.

## 12. Why one business per install?

Fleetdesk runs one rental business with any number of branches. Settings are a single row, enforced by a
check constraint (`id = 1`), and no query needs a tenant filter. The first person to finish the setup
wizard becomes the owner; the check and the change run in one transaction behind a Postgres advisory
lock, so two people submitting at the same moment can't both become owner.

**Trade-off:** a second business needs a second install (and database). Turning it into a multi-tenant
SaaS would mean a business id on most tables.

## 13. How are time zones handled?

Times are stored in UTC (`timestamptz`). The business has one time zone in Settings, and
`src/lib/time-zone.ts` converts between UTC and the wall-clock time typed into the forms using `Intl`,
which knows every zone's daylight saving rules, so no date library is needed. Seasons, driver ages and
"today" in reports are decided on the business's local date.

## 14. How is it tested?

Business rules live in small pure functions next to their tests: prices and rental days, coupons,
cancellation deadlines and wording, the payment ledger, return charges, the agreement text, driver
checks, maintenance due dates, permissions, time zones, safe redirects and form parsing. They run with
Node's built-in test runner (`tsx --test`), with no database. `npm run check` runs the typecheck, Biome,
the tests and a production build, and CI runs the same.
